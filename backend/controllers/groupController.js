const Group = require("../models/Group");

// Get all groups
exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find().populate("games", "name resultTime").sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

// Create a new group
exports.createGroup = async (req, res) => {
  try {
    const { name, games } = req.body;
    if (!name || !games || !games.length) {
      return res.status(400).json({ error: "Name and at least one game are required" });
    }

    const existing = await Group.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: "Group with this name already exists" });
    }

    const group = new Group({ name, games });
    await group.save();

    const populatedGroup = await group.populate("games", "name resultTime");
    res.status(201).json(populatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create group" });
  }
};

// Update a group
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, games } = req.body;

    if (!name || !games || !games.length) {
      return res.status(400).json({ error: "Name and at least one game are required" });
    }

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    group.name = name;
    group.games = games;
    await group.save();

    const populatedGroup = await group.populate("games", "name resultTime");
    res.json(populatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update group" });
  }
};

// Delete a group
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findByIdAndDelete(id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    res.json({ message: "Group deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete group" });
  }
};

const Chart = require("../models/Chart");

exports.getGroupByName = async (req, res) => {
  try {
    const { name } = req.params;
    const group = await Group.findOne({ name })
      .populate("games", "name resultTime")
      .lean();

    if (!group) return res.status(404).json({ error: "Group not found" });

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const gamesWithNumbers = await Promise.all(
      group.games.map(async (game) => {
        const todayChart = await Chart.findOne({
          game: game._id,
          year: today.getFullYear(),
          month: today.getMonth() + 1,
        }).lean();

        const yesterdayChart = await Chart.findOne({
          game: game._id,
          year: yesterday.getFullYear(),
          month: yesterday.getMonth() + 1,
        }).lean();

        // Yesterday number
        const yesterdayNumber =
          yesterdayChart?.numbers?.[yesterday.getDate() - 1] || "--";

        // Today number only if resultTime is passed
        let todayNumber = null;
        if (todayChart?.numbers && game.resultTime) {
          const [hours, minutes] = game.resultTime.split(":").map(Number);

          const resultDateTime = new Date(today);
          resultDateTime.setHours(hours, minutes, 0, 0);

          if (today >= resultDateTime) {
            todayNumber = todayChart.numbers[today.getDate() - 1] || "--";
          }
        }

        // Convert resultTime to 12-hour format
        let resultTime12h = null;
        if (game.resultTime) {
          let [h, m] = game.resultTime.split(":").map(Number);
          const ampm = h >= 12 ? "PM" : "AM";
          h = h % 12 || 12; // Convert 0 to 12 for midnight
          resultTime12h = `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
        }

        return {
          ...game,
          yesterdayNumber,
          todayNumber,
          resultTime12h,
        };
      })
    );

    res.json({ name: group.name, games: gamesWithNumbers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch group" });
  }
};

exports.getMonthlyGroupDataUpToYesterday = async (req, res) => {
  try {
    const { name } = req.params;

    // 1. Get the group and its games
    const group = await Group.findOne({ name })
      .populate("games", "name resultTime")
      .lean();
    if (!group) return res.status(404).json({ error: "Group not found" });

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 1-12

    // 2. Fetch all charts for this month for all games
    const gameIds = group.games.map(g => g._id);
    const charts = await Chart.find({ game: { $in: gameIds }, year, month }).lean();

    // 3. Determine number of days to show (up to yesterday)
    const yesterdayDate = today.getDate() - 1;
    const daysUpToYesterday = Math.max(yesterdayDate, 0); // ensures no negative days

    const tableData = [];

    for (let day = 1; day <= daysUpToYesterday; day++) {
      const row = { date: `${day.toString().padStart(2, "0")}-${month.toString().padStart(2, "0")}` };

      group.games.forEach(game => {
        const chart = charts.find(c => c.game.toString() === game._id.toString());
        // show "-" if data is missing
        row[game.name] = chart?.numbers?.[day - 1] ?? "-";
      });

      tableData.push(row);
    }

    res.json({ groupName: group.name, tableData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch group monthly data up to yesterday" });
  }
};
