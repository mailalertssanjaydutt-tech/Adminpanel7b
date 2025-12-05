const moment = require("moment-timezone");
const Game = require("../models/Game");
const Chart = require("../models/Chart");

function formatTime12h(time24) {
  return moment(time24, "HH:mm").format("hh:mm A");
}

exports.getLatestResult = async (req, res) => {
  try {
    const { gameName } = req.params;

    // Case-insensitive game lookup
    const game = await Game.findOne({ name: new RegExp(`^${gameName}$`, "i") });
    if (!game)
      return res.status(404).json({ message: "Game not found" });

    const now = moment().tz("Asia/Kolkata");

    const year = now.year();
    const month = now.month() + 1;
    const dayIndex = now.date() - 1;

    const chart = await Chart.findOne({ game: game._id, year, month });

    const formattedResultTime = formatTime12h(game.resultTime);

    const resultTimeToday = moment.tz(
      `${now.format("YYYY-MM-DD")} ${game.resultTime}:00`,
      "YYYY-MM-DD HH:mm:ss",
      "Asia/Kolkata"
    );

    if (!chart) {
      return res.json({
        game: game.name,
        latestResult: null,
        previousResult: null,
        resultTime: formattedResultTime
      });
    }

    let latestResult = null;

    // Only show today's result after resultTime
    if (now.isSameOrAfter(resultTimeToday)) {
      const todayObj = chart.numbers[dayIndex];
      latestResult = todayObj?.value?.trim() || null;
    }

    // Yesterday's result
    let previousResult = null;
    if (dayIndex > 0) {
      const yesterdayObj = chart.numbers[dayIndex - 1];
      previousResult = yesterdayObj?.value?.trim() || null;
    }

    return res.json({
      game: game.name,
      latestResult,
      previousResult,
      resultTime: formattedResultTime
    });

  } catch (err) {
    console.error("Result error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const TZ = "Asia/Kolkata";
const RECENT_MINUTES = 120; 
const HIDE_RECENT_WHEN_NEXT_MINUTES =  30;


exports.getUpcoming = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(10, parseInt(req.query.limit, 10) || 3));
    const now = moment().tz(TZ);
    const today = now.format("YYYY-MM-DD");

    // month/year for Chart lookup
    const year = now.year();
    const month = now.month() + 1;
    const todayIndex = now.date() - 1;

    // 1) fetch all games
    const allGames = await Game.find({}, { _id: 1, name: 1, resultTime: 1 }).lean();
    if (!allGames || allGames.length === 0) {
      return res.json({ cards: [], serverTimeISO: now.toISOString(), cached: false });
    }

    // 2) build mapped games with next occurrence (moment in TZ)
    const mapped = allGames.map((g) => {
      const sched = moment.tz(`${today} ${g.resultTime}`, "YYYY-MM-DD HH:mm", TZ);
      const nextOcc = sched.isBefore(now) ? sched.clone().add(1, "day") : sched.clone();
      return {
        _id: g._id,
        name: g.name,
        resultTime: g.resultTime,
        nextOcc,
        schedForToday: sched // scheduled time referenced to today (helps compute recent expiry)
      };
    }).sort((a, b) => {
      const diff = a.nextOcc.valueOf() - b.nextOcc.valueOf();
      if (diff !== 0) return diff;
      return (a.name || "").localeCompare(b.name || "");
    });

    // 3) Build candidate list for recent scanning: games scheduled within RECENT_MINUTES window (today)
    const windowStart = now.clone().subtract(RECENT_MINUTES, "minutes");
    const candidateIds = [];
    const scheduledMap = new Map(); // idStr -> { sched, name, resultTime }
    for (const m of mapped) {
      const idStr = String(m._id);
      const schedToday = m.schedForToday; // moment (today's schedule)
      scheduledMap.set(idStr, { sched: schedToday, name: m.name, resultTime: m.resultTime });
      if (schedToday.isBetween(windowStart, now, null, "[]")) {
        candidateIds.push(m._id);
      }
    }

    // Ensure we include the first few upcoming for chart lookups
    const upcomingCandidates = mapped.slice(0, Math.max(limit, 6)); // a small buffer
    for (const u of upcomingCandidates) {
      if (!candidateIds.find(id => String(id) === String(u._id))) candidateIds.push(u._id);
    }

    // 4) fetch charts for candidateIds (month/year)
    const charts = candidateIds.length > 0
      ? await Chart.find({ game: { $in: candidateIds }, year, month }, { game: 1, numbers: 1 }).lean()
      : [];
    const chartMap = new Map();
    for (const c of charts) chartMap.set(String(c.game), c);

    const getTodayValueFromChart = (chart) => {
      if (!chart || !Array.isArray(chart.numbers)) return null;
      const entry = chart.numbers[todayIndex];
      if (!entry) return null;
      const v = entry.value?.toString()?.trim();
      return v && v.length > 0 ? v : null;
    };

    // 5) Collect up to 2 pinned recents (most recent scheduled first)
    const pinned = [];
    const candidateIdStrs = candidateIds.map(id => String(id));
    candidateIdStrs.sort((a, b) => {
      const sa = scheduledMap.get(a)?.sched ?? moment(0);
      const sb = scheduledMap.get(b)?.sched ?? moment(0);
      return sb.valueOf() - sa.valueOf();
    });

    for (const idStr of candidateIdStrs) {
      if (pinned.length >= 2) break;
      const schedInfo = scheduledMap.get(idStr);
      if (!schedInfo) continue;
      const chart = chartMap.get(idStr);
      const value = getTodayValueFromChart(chart);
      if (value) {
        // compute expiry: sched + RECENT_MINUTES
        const expireAt = schedInfo.sched.clone().add(RECENT_MINUTES, "minutes");
        // compute minutesUntil next occ: find the mapped item for this id
        const mappedItem = mapped.find(m => String(m._id) === idStr);
        const nextOcc = mappedItem ? mappedItem.nextOcc : schedInfo.sched.clone().add(1, "day");
        const minutesUntilNext = Math.max(0, Math.ceil(nextOcc.diff(now, "minutes", true)));

        pinned.push({
          type: "recent",
          name: schedInfo.name,
          resultTime: schedInfo.resultTime || schedInfo.sched.format("HH:mm"),
          latestResult: value,
          nextOccISO: nextOcc.toISOString(),
          minutesUntil: minutesUntilNext,
          recentExpiresISO: expireAt.toISOString()
        });
      }
    }

    // 6) Compose final cards: pinned first, then upcoming skipping pinned names
    const pinnedNameSet = new Set(pinned.map(p => (p.name || "").toLowerCase()));
    const finalCards = [];

    for (const p of pinned) {
      if (finalCards.length >= limit) break;
      // Decide per-card visibility:
      const nextMinutes = p.minutesUntil;
      const nextIsFar = nextMinutes >= RECENT_MINUTES;
      const recentVisible = !!p.latestResult && (nextMinutes > HIDE_RECENT_WHEN_NEXT_MINUTES || nextIsFar);
      finalCards.push({
        type: p.type,
        name: p.name,
        resultTime: p.resultTime,
        latestResult: p.latestResult,
        nextOccISO: p.nextOccISO,
        minutesUntil: p.minutesUntil,
        recentExpiresISO: p.recentExpiresISO,
        recentVisible
      });
    }

    for (const m of mapped) {
      if (finalCards.length >= limit) break;
      if (pinnedNameSet.has((m.name || "").toLowerCase())) continue;
      const minutesUntil = Math.max(0, Math.ceil(m.nextOcc.diff(now, "minutes", true)));
      finalCards.push({
        type: "upcoming",
        name: m.name,
        resultTime: m.resultTime,
        latestResult: null,
        nextOccISO: m.nextOcc.toISOString(),
        minutesUntil,
        recentExpiresISO: null,
        recentVisible: false
      });
    }

    // pad if needed
    while (finalCards.length < limit) {
      finalCards.push({
        type: "upcoming",
        name: "--",
        resultTime: "--",
        latestResult: null,
        nextOccISO: null,
        minutesUntil: null,
        recentExpiresISO: null,
        recentVisible: false
      });
    }

    return res.json({
      cards: finalCards.slice(0, limit),
      serverTimeISO: now.toISOString(),
      cached: false
    });

  } catch (err) {
    console.error("getUpcoming error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};