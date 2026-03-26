const mongoose = require("mongoose");

const charitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    category: {
      type: String,
      trim: true,
      default: "general"
    },
    country: {
      type: String,
      trim: true,
      default: "UK"
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Charity", charitySchema);
