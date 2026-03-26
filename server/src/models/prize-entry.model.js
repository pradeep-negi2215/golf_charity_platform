const mongoose = require("mongoose");

const prizeEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    monthKey: {
      type: String,
      required: true,
      trim: true
    },
    entryCount: {
      type: Number,
      min: 1,
      default: 1
    },
    source: {
      type: String,
      enum: ["subscription", "bonus", "manual"],
      default: "subscription"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("PrizeEntry", prizeEntrySchema);
