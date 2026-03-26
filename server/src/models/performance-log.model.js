const mongoose = require("mongoose");

const performanceLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    playedAt: {
      type: Date,
      required: true
    },
    courseName: {
      type: String,
      required: true,
      trim: true
    },
    holesPlayed: {
      type: Number,
      enum: [9, 18],
      default: 18
    },
    grossScore: {
      type: Number,
      required: true,
      min: 40
    },
    fairwaysHit: {
      type: Number,
      min: 0,
      default: 0
    },
    greensInRegulation: {
      type: Number,
      min: 0,
      default: 0
    },
    putts: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("PerformanceLog", performanceLogSchema);
