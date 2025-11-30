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
