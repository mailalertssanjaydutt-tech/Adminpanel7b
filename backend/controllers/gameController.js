const Game = require('../models/Game');
const xlsx = require('xlsx');

// Get all games
exports.getGames = async (req, res) => {
  try {
    const games = await Game.find().sort({ name: 1 });
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add new game
exports.addGame = async (req, res) => {
  try {
    const game = new Game(req.body);
    await game.save();
    res.json(game);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update game
exports.updateGame = async (req, res) => {
  try {
    const game = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(game);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete game
exports.deleteGame = async (req, res) => {
  try {
    await Game.findByIdAndDelete(req.params.id);
    res.json({ message: "Game deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
