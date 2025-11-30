const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  resultTime: { type: String, required: true } // HH:MM format
}, { timestamps: true });

module.exports = mongoose.model('Game', GameSchema);
