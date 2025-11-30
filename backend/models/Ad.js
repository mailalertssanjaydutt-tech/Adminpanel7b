const mongoose = require("mongoose");

const AdSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      default: "",
    },
    position: {
      type: String,
      enum: ["top", "bottom"],
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ad", AdSchema);
