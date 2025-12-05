const moment = require("moment-timezone");
const Chart = require("../models/Chart");
const Game = require("../models/Game");

// POST a result (store number for given date in chart)
exports.postResult = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { date, number } = req.body;

    if (!gameId || !date || number === undefined || number === null) {
      return res.status(400).json({ message: "Missing gameId, date or number" });
    }

    const resultDate = new Date(date);
    if (isNaN(resultDate.getTime())) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const year = resultDate.getFullYear();
    const month = resultDate.getMonth() + 1; // 1-12
    const dayIndex = resultDate.getDate() - 1; // 0-based index

    // Find or create chart for that game/month/year
    let chart = await Chart.findOne({ game: gameId, year, month });
    if (!chart) {
      chart = new Chart({
        game: gameId,
        year,
        month,
        // Chart schema has default for numbers; explicit ok:
        numbers: Array.from({ length: 31 }, () => ({ value: "", declaredAt: null })),
      });
    }

    // Save declaredAt as current time (UTC). DB stores Date; formatting is for responses.
    const declaredAt = new Date();

    // Ensure numbers[] has length 31
    while (chart.numbers.length < 31) {
      chart.numbers.push({ value: "", declaredAt: null });
    }

    // Store the result on the selected day
    chart.numbers[dayIndex] = {
      value: String(number),
      declaredAt,
    };

    await chart.save();

    // Attach game info (for client convenience)
    const game = await Game.findById(gameId).lean();

    const response = {
      _id: `${chart._id}-${dayIndex}`,
      chartId: chart._id,
      gameId,
      gameName: game ? game.name : "Unknown",
      number: { value: String(number), declaredAt: declaredAt.toISOString() },
      resultDate: resultDate.toISOString(),
      resultTime: game ? game.resultTime : null,
      declaredTimeFormatted: moment(declaredAt).tz("Asia/Kolkata").format("DD/MM/YYYY, HH:mm"),
    };

    return res.json({ message: "Result posted and chart updated", result: response });
  } catch (err) {
    console.error("postResult error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE a result (clear a day's value)
exports.deleteResult = async (req, res) => {
  try {
    const { gameId, resultId } = req.params;
    if (!resultId) return res.status(400).json({ message: "Missing resultId" });

    const [chartId, dayIndexRaw] = resultId.split("-");
    const dayIndex = parseInt(dayIndexRaw, 10);

    if (!chartId || isNaN(dayIndex)) return res.status(400).json({ message: "Invalid resultId" });

    const chart = await Chart.findById(chartId);
    if (!chart) return res.status(404).json({ message: "Chart not found" });

    // safety: ensure the chart belongs to provided gameId (optional but good)
    if (String(chart.game) !== String(gameId)) {
      return res.status(400).json({ message: "Chart does not belong to the provided gameId" });
    }

    // Make sure numbers array long enough
    while (chart.numbers.length < 31) {
      chart.numbers.push({ value: "", declaredAt: null });
    }

    chart.numbers[dayIndex] = { value: "", declaredAt: null };
    await chart.save();

    return res.json({ message: "Result deleted" });
  } catch (err) {
    console.error("deleteResult error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET all results for a specific game (flatten chart -> results)
exports.getResults = async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!gameId) return res.status(400).json({ message: "Missing gameId" });

    const charts = await Chart.find({ game: gameId }).sort({ year: 1, month: 1 }).populate("game").lean();

    const results = [];

    charts.forEach((chart) => {
      chart.numbers.forEach((numObj, idx) => {
        if (!numObj || !numObj.value) return;

        const resultDate = new Date(chart.year, chart.month - 1, idx + 1);

        const declaredAt = numObj.declaredAt ? new Date(numObj.declaredAt) : new Date(chart.updatedAt);

        results.push({
          _id: `${chart._id}-${idx}`,
          chartId: chart._id,
          gameId: chart.game ? chart.game._id : null,
          gameName: chart.game ? chart.game.name : "Unknown",
          number: { value: String(numObj.value), declaredAt: declaredAt.toISOString() },
          resultDate: resultDate.toISOString(),
          resultTime: chart.game ? chart.game.resultTime : null,
          declaredTimeFormatted: moment(declaredAt).tz("Asia/Kolkata").format("DD/MM/YYYY, HH:mm"),
          declaredTimeRaw: declaredAt,
        });
      });
    });

    // sort by declaredTime descending
    results.sort((a, b) => new Date(b.declaredTimeRaw) - new Date(a.declaredTimeRaw));

    res.json(results);
  } catch (err) {
    console.error("getResults error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET recent results for all games (latest 20)
exports.getRecentResults = async (req, res) => {
  try {
    const charts = await Chart.find().sort({ updatedAt: -1 }).populate("game").lean();
    const results = [];
    const today = moment().tz("Asia/Kolkata").endOf("day");

    charts.forEach((chart) => {
      if (!chart.game) return;

      chart.numbers.forEach((numObj, idx) => {
        if (!numObj || !numObj.value) return;

        // result date (day for which the number was posted) in IST
        const resultMoment = moment.tz(
          `${chart.year}-${chart.month}-${idx + 1}`,
          "YYYY-M-D",
          "Asia/Kolkata"
        ).startOf("day");

        if (resultMoment.isAfter(today)) return; // ignore future-dated slots

        const declaredAt = numObj.declaredAt ? new Date(numObj.declaredAt) : new Date(chart.updatedAt);

        // Build the scheduled game datetime anchored to the result date (if resultTime exists)
        let resultDateTimeFormatted = null;
        if (chart.game && chart.game.resultTime) {
          // parse "HH:mm" (robust to "H:mm" too)
          const [hh = "00", mm = "00"] = String(chart.game.resultTime).split(":");
          const scheduled = resultMoment.clone().hour(parseInt(hh, 10)).minute(parseInt(mm, 10));
          resultDateTimeFormatted = scheduled.format("DD/MM/YYYY, HH:mm");
        }

        results.push({
          _id: `${chart._id}-${idx}`,
          chartId: chart._id,
          gameId: chart.game._id,
          gameName: chart.game.name,
          number: { value: String(numObj.value), declaredAt: declaredAt.toISOString() },
          // raw ISO date for programmatic use
          resultDate: resultMoment.toDate().toISOString(),
          // helpful display fields to avoid ambiguity
          resultDateFormatted: resultMoment.format("DD/MM/YYYY"),
          // scheduled time anchored to the date, e.g. "30/11/2025, 18:30"
          resultDateTimeFormatted, // null if game.resultTime missing
          resultTime: chart.game.resultTime, // old field (HH:mm) kept for backward compat
          declaredTimeFormatted: moment(declaredAt).tz("Asia/Kolkata").format("DD/MM/YYYY, HH:mm"),
          declaredTimeRaw: declaredAt,
        });
      });
    });

    // latest declared first
    results.sort((a, b) => new Date(b.declaredTimeRaw) - new Date(a.declaredTimeRaw));

    res.json(results.slice(0, 20));
  } catch (err) {
    console.error("getRecentResults error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
