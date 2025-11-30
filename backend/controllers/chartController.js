// controllers/chartController.js
const mongoose = require("mongoose");
const Chart = require("../models/Chart");
const Game = require("../models/Game");

// helper to create 31 distinct slots
function createEmptyNumbers() {
  return Array.from({ length: 31 }, () => ({ value: "", declaredAt: null }));
}

// helper to map normalized input (maybe array of strings) -> array of subdocs
function normalizeNumbersArray(arr) {
  const normalized = [...arr].slice(0, 31); // cap at 31 if user sends more
  while (normalized.length < 31) normalized.push("");
  return normalized.map((v) => ({ value: v === null || v === undefined ? "" : String(v), declaredAt: null }));
}

function validateAndCastGameId(gameId) {
  if (!gameId) throw new Error("gameId missing");

  // If it's already an ObjectId instance, return as-is
  if (gameId instanceof mongoose.Types.ObjectId) return gameId;

  // If it's a valid hex string, construct a new ObjectId instance using `new`
  if (typeof gameId === "string" && mongoose.Types.ObjectId.isValid(gameId)) {
    return new mongoose.Types.ObjectId(gameId);
  }

  // otherwise error out
  throw new Error("Invalid gameId");
}

// ---------------------------------------
// Get all games
// ---------------------------------------
exports.getGames = async (req, res) => {
  try {
    const games = await Game.find().sort({ name: 1 });
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch games." });
  }
};

// ---------------------------------------
// Get chart for a specific game/month/year
// ---------------------------------------
exports.getChart = async (req, res) => {
  const { gameId } = req.params;
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: "Year and month are required" });
  }

  try {
    const gameObjectId = validateAndCastGameId(gameId);

    let chart = await Chart.findOne({ game: gameObjectId, year: Number(year), month: Number(month) });

    // Auto-create chart if missing
    if (!chart) {
      chart = new Chart({
        game: gameObjectId,
        year: Number(year),
        month: Number(month),
        numbers: createEmptyNumbers(),
      });
      await chart.save();
    }

    res.json(chart);
  } catch (err) {
    console.error("getChart error:", err);
    if (err.errors) console.error("Validation details:", JSON.stringify(err.errors, null, 2));
    res.status(500).json({ error: "Failed to fetch chart", detail: err.message });
  }
};

// ---------------------------------------
// Create or update chart with full array (bulk save)
// ---------------------------------------
exports.saveChart = async (req, res) => {
  const { gameId } = req.params;
  const { year, month, numbers } = req.body;

  if (!year || !month || !numbers) {
    return res.status(400).json({ error: "Year, month, and numbers required" });
  }

  if (!Array.isArray(numbers) || numbers.some((n) => n !== "" && !/^\d{1,2}$/.test(String(n)))) {
    return res.status(400).json({ error: "Numbers must be 1 or 2 digits or empty" });
  }

  try {
    const gameObjectId = validateAndCastGameId(gameId);

    const numbersAsObjects = normalizeNumbersArray(numbers);

    const chart = await Chart.findOneAndUpdate(
      { game: gameObjectId, year: Number(year), month: Number(month) },
      { numbers: numbersAsObjects, updatedAt: new Date() },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        context: "query",
      }
    );

    res.json(chart);
  } catch (err) {
    console.error("saveChart error:", err);
    if (err.errors) console.error("Validation details:", JSON.stringify(err.errors, null, 2));
    res.status(500).json({ error: "Failed to save chart", detail: err.message });
  }
};

// ---------------------------------------
// Update single day
// ---------------------------------------
exports.updateDay = async (req, res) => {
  const { gameId } = req.params;
  const { year, month, day, value } = req.body;

  if (!year || !month || day == null) {
    return res.status(400).json({ error: "Year, month, and day are required" });
  }

  if (value !== "" && !/^\d{1,2}$/.test(String(value))) {
    return res.status(400).json({ error: "Value must be 1 or 2 digits or empty" });
  }

  // day expected as 1..31 from client; convert to 0-based index
  const idx = Number(day) - 1;
  if (isNaN(idx) || idx < 0 || idx > 30) return res.status(400).json({ error: "Day must be between 1 and 31" });

  try {
    const gameObjectId = validateAndCastGameId(gameId);

    let chart = await Chart.findOne({ game: gameObjectId, year: Number(year), month: Number(month) });

    if (!chart) {
      chart = new Chart({
        game: gameObjectId,
        year: Number(year),
        month: Number(month),
        numbers: createEmptyNumbers(),
      });
    }

    // Ensure array is always 31
    while (!Array.isArray(chart.numbers) || chart.numbers.length < 31) {
      chart.numbers = chart.numbers || [];
      chart.numbers.push({ value: "", declaredAt: null });
    }

    // set the value on the subdocument
    chart.numbers[idx].value = value === null || value === undefined ? "" : String(value);
    // set declaredAt when non-empty, clear when empty
    chart.numbers[idx].declaredAt = chart.numbers[idx].value === "" ? null : new Date();

    await chart.save();

    res.json({ success: true, numbers: chart.numbers });
  } catch (err) {
    console.error("updateDay error:", err);
    if (err.errors) console.error("Validation details:", JSON.stringify(err.errors, null, 2));
    res.status(500).json({ error: "Failed to update day", detail: err.message });
  }
};

// ---------------------------------------
// Delete single day
// ---------------------------------------
exports.deleteDay = async (req, res) => {
  const { gameId } = req.params;
  const { year, month, day } = req.body;

  if (!year || !month || day == null) {
    return res.status(400).json({ error: "Year, month, and day are required" });
  }

  const idx = Number(day) - 1;
  if (isNaN(idx) || idx < 0 || idx > 30) return res.status(400).json({ error: "Day must be between 1 and 31" });

  try {
    const gameObjectId = validateAndCastGameId(gameId);

    let chart = await Chart.findOne({ game: gameObjectId, year: Number(year), month: Number(month) });

    if (!chart) {
      return res.status(404).json({ error: "Chart not found" });
    }

    // Ensure 31-length
    while (!Array.isArray(chart.numbers) || chart.numbers.length < 31) {
      chart.numbers = chart.numbers || [];
      chart.numbers.push({ value: "", declaredAt: null });
    }

    chart.numbers[idx].value = "";
    chart.numbers[idx].declaredAt = null;

    await chart.save();

    res.json({ success: true, numbers: chart.numbers });
  } catch (err) {
    console.error("deleteDay error:", err);
    if (err.errors) console.error("Validation details:", JSON.stringify(err.errors, null, 2));
    res.status(500).json({ error: "Failed to delete day", detail: err.message });
  }
};

// ---------------------------------------
// Delete entire chart
// ---------------------------------------
exports.deleteChart = async (req, res) => {
  const { gameId } = req.params;
  const { year, month } = req.query;

  try {
    const gameObjectId = validateAndCastGameId(gameId);
    await Chart.findOneAndDelete({ game: gameObjectId, year: Number(year), month: Number(month) });
    res.json({ message: "Chart deleted successfully" });
  } catch (err) {
    console.error("deleteChart error:", err);
    res.status(500).json({ error: "Failed to delete chart", detail: err.message });
  }
};

// ---------------------------------------
// Yearly chart up to yesterday
// ---------------------------------------
function getMonthName(num) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return months[num - 1];
}

exports.getYearlyChartUpToYesterday = async (req, res) => {
  try {
    const { gameName } = req.params;
    const { year } = req.query;

    const numericYear = parseInt(year);
    if (!year || isNaN(numericYear)) {
      return res.status(400).json({ error: "Valid year is required" });
    }

    // Case-insensitive search
    const game = await Game.findOne({
      name: { $regex: `^${gameName}$`, $options: "i" },
    });
    if (!game) return res.status(404).json({ error: "Game not found" });

    // All charts of that year
    const charts = await Chart.find({ game: game._id, year: numericYear });

    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate();

    const response = {};

    for (let m = 1; m <= 12; m++) {
      const chart = charts.find((c) => c.month === m);
      const daysInMonth = new Date(numericYear, m, 0).getDate();

      // Determine how many days to include
      let daysToInclude = daysInMonth;
      if (m === currentMonth && numericYear === today.getFullYear()) {
        // Show up to yesterday
        daysToInclude = Math.max(currentDay - 1, 0);
      }

      if (chart) {
        // ensure chart.numbers are mapped to plain values for API (value only)
        const monthValues = (chart.numbers || createEmptyNumbers()).slice(0, daysToInclude).map((s) => (s && typeof s.value !== "undefined" ? s.value : ""));
        response[getMonthName(m)] = monthValues.concat(Array(daysInMonth - daysToInclude).fill(""));
      } else {
        response[getMonthName(m)] = Array(daysInMonth).fill("");
      }
    }

    res.json({ gameName: game.name, year: numericYear, data: response });
  } catch (err) {
    console.error("Yearly chart up to yesterday error:", err);
    res.status(500).json({ error: "Failed to fetch yearly chart", detail: err.message });
  }
};
