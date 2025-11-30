const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: String, enum: ["admin", "user"], required: true },
  createdAt: { type: Date, default: Date.now },
});

const contactSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  message: { type: String },
  createdAt: { type: Date, default: Date.now },
  replies: [replySchema], // <-- add replies here
});

module.exports = mongoose.model("Contact", contactSchema);
