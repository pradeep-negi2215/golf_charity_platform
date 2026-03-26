const mongoose = require("mongoose");

const winnerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    matchedNumbers: {
      type: [Number],
      required: true,
      default: []
    },
    winnings: {
      type: Number,
      required: true,
      min: 0
    },
    paidOut: {
      type: Boolean,
      default: false
    },
    paidOutAt: {
      type: Date,
      default: null
    },
    paidOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    payoutReference: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const drawResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    scoreNumbers: {
      type: [Number],
      required: true,
      default: []
    },
    matchedNumbers: {
      type: [Number],
      required: true,
      default: []
    },
    matchCount: {
      type: Number,
      required: true,
      min: 0,
      max: 5
    },
    winnings: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  { _id: false }
);

const monthlyDrawSchema = new mongoose.Schema(
  {
    monthKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    drawNumbers: {
      type: [Number],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 5,
        message: "Draw must contain exactly 5 numbers"
      }
    },
    participantCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    prizePool: {
      totalSubscriptions: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      },
      rolloverIn: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      },
      rolloverOut: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      },
      pools: {
        match3: {
          type: Number,
          required: true,
          min: 0,
          default: 0
        },
        match4: {
          type: Number,
          required: true,
          min: 0,
          default: 0
        },
        match5: {
          type: Number,
          required: true,
          min: 0,
          default: 0
        }
      },
      perWinner: {
        match3: {
          type: Number,
          required: true,
          min: 0,
          default: 0
        },
        match4: {
          type: Number,
          required: true,
          min: 0,
          default: 0
        },
        match5: {
          type: Number,
          required: true,
          min: 0,
          default: 0
        }
      }
    },
    winners: {
      match3: {
        type: [winnerSchema],
        default: []
      },
      match4: {
        type: [winnerSchema],
        default: []
      },
      match5: {
        type: [winnerSchema],
        default: []
      }
    },
    results: {
      type: [drawResultSchema],
      default: []
    },
    ranAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("MonthlyDraw", monthlyDrawSchema);
