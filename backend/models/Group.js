const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Group 1"
  games: [{ type: mongoose.Schema.Types.ObjectId, ref: "Game" }]
});

module.exports = mongoose.model("Group", GroupSchema);
