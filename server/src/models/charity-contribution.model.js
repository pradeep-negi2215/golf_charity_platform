const mongoose = require("mongoose");

const charityContributionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    charityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Charity"
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "GBP",
      uppercase: true,
      trim: true
    },
    cause: {
      type: String,
      required: true,
      trim: true
    },
    source: {
      type: String,
      enum: ["subscription", "top-up", "campaign"],
      default: "subscription"
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 10
    },
    contributedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("CharityContribution", charityContributionSchema);
