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



// exports.getUpcoming = async (req, res, next) => {
//   try {
//     const nowIST = moment().tz("Asia/Kolkata");
//     const todayDate = nowIST.clone().startOf("day");
//     const yesterdayDate = todayDate.clone().subtract(1, "day");

//     const todayDayIndex = nowIST.date() - 1;
//     const yesterdayDayIndex = yesterdayDate.date() - 1;

//     // Fetch all games (name + resultTime)
//     const games = await Game.find().lean();

//     // Fetch today's charts
//     const todayCharts = await Chart.find({
//       year: nowIST.year(),
//       month: nowIST.month() + 1
//     }).lean();

//     // Fetch yesterday charts
//     const yCharts = await Chart.find({
//       year: yesterdayDate.year(),
//       month: yesterdayDate.month() + 1
//     }).lean();

//     // Prepare combined list for today
//     const todayData = games.map(game => {
//       const chart = todayCharts.find(c => String(c.game) === String(game._id));
//       const resultValue =
//         chart?.numbers?.[todayDayIndex]?.value || null;

//       return {
//         ...game,
//         latestResult: resultValue,
//         resultTime: game.resultTime
//       };
//     });

//     // Prepare yesterday data (for midnight fallback)
//     const yesterdayData = games.map(game => {
//       const chart = yCharts.find(c => String(c.game) === String(game._id));
//       const resultValue =
//         chart?.numbers?.[yesterdayDayIndex]?.value || null;

//       return {
//         ...game,
//         latestResult: resultValue,
//         resultTime: game.resultTime
//       };
//     });

//     // ---- Logic Functions ----
//     const getDiff = (g) => {
//       const t = moment(g.resultTime, "HH:mm");
//       return t.diff(nowIST, "minutes");
//     };

//     // Build Recent Games
//     let recentGames = todayData.filter(g => {
//       const diff = getDiff(g);

//       if (diff <= 0 && Math.abs(diff) <= 90) return true; // passed within 90
//       if (diff > 20 && diff <= 30) return true;           // 20–30 mins ahead
//       if (diff < 0 && Math.abs(diff) <= 20) return true;  // passed <20 mins

//       return false;
//     });

//     // After Midnight (12–9 AM) rule
//     const isAfterMidnight = nowIST.hour() < 9;

//     if (isAfterMidnight && recentGames.length < 2) {
//       recentGames = yesterdayData.slice(-2); // use last 2 of yesterday
//     }

//     // Max 2 recent
//     recentGames = recentGames.slice(0, 2);

//     // UPCOMING
//     const upcomingGames = todayData.filter(g => getDiff(g) > 0);
//     upcomingGames.forEach(g => g.latestResult = null);

//     // Sort recent by latest time first
//     recentGames.sort((a, b) => {
//       return moment(b.resultTime, "HH:mm") - moment(a.resultTime, "HH:mm");
//     });

//     // Final Cards (always 3)
//     const cards = [];
//     cards.push(...recentGames);

//     for (let g of upcomingGames) {
//       if (cards.length < 3) cards.push(g);
//     }

//     // If still not 3 → use yesterday data
//     if (cards.length < 3) {
//       const backup = yesterdayData.slice(-3);
//       for (let b of backup) {
//         if (cards.length < 3) cards.push(b);
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       cards,
//       recentGames,
//       upcomingGames
//     });

//   } catch (err) {
//     console.log(err);
//     return next(err);
//   }
// };



// requires: moment-timezone, Game, Chart models

exports.getUpcoming = async (req, res, next) => {
  try {
    const TZ = "Asia/Kolkata";
    const now = moment().tz(TZ);
    const todayStart = now.clone().startOf("day");
    const yesterdayStart = todayStart.clone().subtract(1, "day");
    const tomorrowStart = todayStart.clone().add(1, "day");

    // Helper: normalize time strings to HH:mm (convert non-western digits, remove weird chars)
    const normalizeTimeString = (raw) => {
      if (!raw && raw !== "") return "";
      const s = String(raw).trim();

      // Convert eastern digits (Hindi, Bengali, etc.) to western 0-9
      const easternDigitsMap = {
        '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
        '०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9',
        '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'
      };
      let converted = "";
      for (const ch of s) {
        converted += (easternDigitsMap[ch] ?? ch);
      }

      // Replace any non-digit/non-colon with colon (so 22-20 -> 22:20, 22.20 -> 22:20)
      // But remove fullwidth colon variants and normalize many colon-like chars to ':'
      converted = converted.replace(/[\uFF1A\uFF1B\uFF0C\uFF0E\uFF1F]/g, ":");
      // Replace any character that's not digit or colon with colon (but collapse multiple colons later)
      converted = converted.replace(/[^\d:]/g, ":");

      // Collapse multiple colons to single, trim leading/trailing colons
      converted = converted.replace(/:+/g, ":").replace(/^:|:$/g, "");

      // If we have H or HH only (like "9" or "09"), append ":00"
      const parts = converted.split(":").filter(Boolean);
      if (parts.length === 1) {
        converted = `${parts[0].padStart(2,"0")}:00`;
      } else if (parts.length >= 2) {
        const hh = parts[0].padStart(2,"0").slice(-2);
        const mm = parts[1].padStart(2,"0").slice(0,2);
        converted = `${hh}:${mm}`;
      } else {
        converted = "";
      }

      // guard invalid hours/mins -> return empty if invalid
      const [hStr,mStr] = converted.split(":");
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
        return "";
      }
      return `${hStr.padStart(2,"0")}:${mStr.padStart(2,"0")}`;
    };

    // Fetch games
    let games = await Game.find().lean();

    // sanitize resultTime on fetched games
    games = games.map(g => {
      return {
        ...g,
        rawResultTime: g.resultTime, // keep original
        resultTime: normalizeTimeString(g.resultTime || "")
      };
    });

    // Fetch charts for previous/current/next month to handle edge months
    const monthsToQuery = new Set([
      yesterdayStart.month() + 1, // month field in your model appears 1-indexed (you used month+1 previously)
      todayStart.month() + 1,
      tomorrowStart.month() + 1
    ]);
    const yearsToQuery = new Set([
      yesterdayStart.year(),
      todayStart.year(),
      tomorrowStart.year()
    ]);

    const chartQuery = {
      month: { $in: Array.from(monthsToQuery) },
      year: { $in: Array.from(yearsToQuery) }
    };

    const charts = await Chart.find(chartQuery).lean();

    // Helper: find chart for given gameId + year + month
    const findChart = (gameId, y, m) => {
      return charts.find(c => String(c.game) === String(gameId) && c.year === y && c.month === m) || null;
    };

    // Build an items array with calculated resultMoment and value at that day
    const items = games.map(game => {
      const cleanTime = game.resultTime; // already normalized
      // If no valid time, mark invalid and set moment far future so becomes upcoming fallback
      if (!cleanTime) {
        return {
          ...game,
          resultMoment: null,
          resultMomentEpoch: null,
          resultDateObj: null,
          chartYear: null,
          chartMonth: null,
          chartDayIndex: null,
          valueAtDay: null
        };
      }

      // parse base time as today at that HH:mm
      let resultMoment = moment.tz(`${todayStart.format("YYYY-MM-DD")}T${cleanTime}`, TZ);

      // Treat times between 00:00–03:59 as **next day** (they belong to next day's chart)
      const hh = parseInt(cleanTime.split(":")[0], 10);
      if (hh >= 0 && hh <= 3) {
        resultMoment = resultMoment.add(1, "day");
      }

      const resultDate = resultMoment.clone();
      const chartYear = resultDate.year();
      const chartMonth = resultDate.month() + 1; // model stores 1-indexed month
      const chartDayIndex = resultDate.date() - 1; // 0-indexed in numbers[]

      // find chart doc
      const chart = findChart(game._id, chartYear, chartMonth);
      const entry = chart?.numbers?.[chartDayIndex];
      const valueAtDay = entry?.value || null;

      return {
        ...game,
        resultMoment,
        resultMomentEpoch: resultMoment.valueOf(),
        resultDateObj: resultDate.toDate(),
        chartYear,
        chartMonth,
        chartDayIndex,
        valueAtDay
      };
    });

    // Now split to recent/upcoming according to your rule:
    // upcoming if now < resultMoment
    // recent if now >= resultMoment
    // NOTE: items with null resultMoment are treated as upcoming (they won't be recent)
    const nowEpoch = now.valueOf();

    // Build lists
    const passed = items.filter(i => i.resultMoment && nowEpoch >= i.resultMomentEpoch);
    const future = items.filter(i => i.resultMoment && nowEpoch < i.resultMomentEpoch);
    const invalidTime = items.filter(i => !i.resultMoment); // no valid resultTime

    // Sort passed descending (most recent first), future ascending (soonest first)
    passed.sort((a,b) => b.resultMomentEpoch - a.resultMomentEpoch);
    future.sort((a,b) => a.resultMomentEpoch - b.resultMomentEpoch);

    // Midnight fallback (00:00 - 09:00 IST)
    const isAfterMidnight = now.hour() < 9;
    let recentGames = [];
    let upcomingGames = [];

    if (isAfterMidnight) {
      // Prefer 2 recent from yesterday (passed items whose resultMoment falls on yesterday)
      const yesterdayEpochStart = yesterdayStart.valueOf();
      const yesterdayEpochEnd = yesterdayStart.clone().endOf("day").valueOf();

      // pick passed games that have resultMoment in yesterday range, sorted desc
      const yesterdayPassed = passed.filter(p => p.resultMomentEpoch >= yesterdayEpochStart && p.resultMomentEpoch <= yesterdayEpochEnd)
                                   .slice(0,2);

      recentGames = yesterdayPassed.slice(0,2);

      // If not enough, fill with the most recent passed games overall
      if (recentGames.length < 2) {
        const fill = passed.filter(p => !recentGames.some(r => String(r._id) === String(p._id)))
                           .slice(0, 2 - recentGames.length);
        recentGames.push(...fill);
      }

      // For upcoming, pick earliest future games (today morning or later)
      upcomingGames = future.slice(0, 3); // pick up to 3; we'll limit later

    } else {
      // Normal hours: recent = all passed games (we will limit later to 2)
      recentGames = passed.slice(); // sorted desc already
      upcomingGames = future.slice();
    }

    // As per your rule: show latestResult only when now >= resultMoment (i.e. passed).
    // Prepare objects to return to client: keep only necessary fields
    const formatForClient = (item, showValueIfPassed = true) => {
      const isPassed = item.resultMoment && nowEpoch >= item.resultMomentEpoch;
      return {
        _id: item._id,
        name: item.name,
        resultTime: item.resultTime || item.rawResultTime || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        __v: item.__v,
        latestResult: isPassed && item.valueAtDay ? item.valueAtDay : null
      };
    };

    // Limit recent to max 2
    recentGames = recentGames.slice(0, 2);

    // Build cards: recent first (max 2), then upcoming (earliest first) until 3 total
    const cards = [];
    recentGames.forEach(r => cards.push(formatForClient(r)));

    // For upcoming, we must ensure latestResult is null (even if chart has value prefilled)
    // and include earliest upcoming ones
    for (let u of upcomingGames) {
      if (cards.length >= 3) break;
      const obj = formatForClient(u);
      obj.latestResult = null; // enforce hide until resultTime passes
      cards.push(obj);
    }

    // If still < 3, fill with passed items (older) or invalid-time items as backup
    if (cards.length < 3) {
      // Try more past games (excluding those already in cards)
      const usedIds = new Set(cards.map(c => String(c._id)));
      const morePassed = passed.filter(p => !usedIds.has(String(p._id)));
      for (let p of morePassed) {
        if (cards.length >= 3) break;
        cards.push(formatForClient(p));
      }
    }

    if (cards.length < 3) {
      // Fallback to upcoming future ones (if any) but keep latestResult null
      const usedIds = new Set(cards.map(c => String(c._id)));
      for (let u of future) {
        if (cards.length >= 3) break;
        if (usedIds.has(String(u._id))) continue;
        const obj = formatForClient(u);
        obj.latestResult = null;
        cards.push(obj);
      }
    }

    if (cards.length < 3) {
      // Final fallback: include invalid-time games (no valid resultTime)
      for (let inv of invalidTime) {
        if (cards.length >= 3) break;
        cards.push(formatForClient(inv));
      }
    }

    // Prepare recentGames and upcomingGames response arrays (client-friendly)
    const recentResp = recentGames.map(r => formatForClient(r));
    const upcomingResp = future.map(u => {
      const o = formatForClient(u);
      o.latestResult = null;
      return o;
    });

    return res.status(200).json({
      success: true,
      cards,
      recentGames: recentResp,
      upcomingGames: upcomingResp
    });

  } catch (err) {
    console.error("getUpcoming error:", err);
    return next(err);
  }
};

