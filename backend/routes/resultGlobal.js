// routes/resultGlobal.js

const moment = require("moment-timezone");
const Game = require("../models/Game");
const Chart = require("../models/Chart");

module.exports = async function resultGlobal(req, res) {
  try {
    const now = moment().tz("Asia/Kolkata");
    const year = now.year();
    const month = now.month() + 1;
    const todayIndex = now.date() - 1;

    // 1️⃣ Fetch all games (one cheap query)
    const games = await Game.find({}, { name: 1, resultTime: 1 }).lean();

    if (!games.length) {
      return res.json({ all: [] });
    }

    // 2️⃣ Fetch ALL charts for this month (one query)
    const charts = await Chart.find(
      { year, month },
      { game: 1, numbers: 1 }
    ).lean();

    // Map charts by gameId for O(1) lookup
    const chartMap = new Map();
    for (const c of charts) {
      chartMap.set(String(c.game), c);
    }

    // Helper for extracting chart values safely
    const getValue = (chart) => {
      if (!chart) return null;
      const v = chart.numbers?.[todayIndex]?.value;
      return v?.trim() || null;
    };

    // 3️⃣ Build "all" array (in-memory, fast)
    const all = games.map((g) => {
      const chart = chartMap.get(String(g._id));
      const latestResult = getValue(chart);

      const todayStr = now.format("YYYY-MM-DD");
      const sched = moment.tz(
        `${todayStr} ${g.resultTime}`,
        "YYYY-MM-DD HH:mm",
        "Asia/Kolkata"
      );

      const next = sched.isBefore(now)
        ? sched.clone().add(1, "day")
        : sched.clone();

      const minutesUntil = Math.ceil(next.diff(now, "minutes", true));

      return {
        name: g.name,
        resultTime: g.resultTime,      // "HH:mm"
        latestResult,
        minutesUntil,
      };
    });

    return res.json({ all });

  } catch (err) {
    console.error("GLOBAL ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
