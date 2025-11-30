const mongoose = require("mongoose");

const ChartSchema = new mongoose.Schema(
  {
    game: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },

    year: { type: Number, required: true },
    month: { type: Number, required: true },

    numbers: {
      type: [
        {
          value: { type: String, default: "" },
          declaredAt: { type: Date, default: null },
        },
      ],
      default: () => Array.from({ length: 31 }, () => ({ value: "", declaredAt: null })),
    },
  },
  { timestamps: true }
);

// Ensure unique chart per game-month-year
ChartSchema.index({ game: 1, year: 1, month: 1 }, { unique: true });

// Auto-extend numbers to length 31
ChartSchema.pre("save", function (next) {
  while (this.numbers.length < 31) {
    this.numbers.push({ value: "", declaredAt: null });
  }
  next();
});

module.exports = mongoose.model("Chart", ChartSchema);
