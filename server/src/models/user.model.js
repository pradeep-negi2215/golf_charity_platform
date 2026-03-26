const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8
    },
    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member"
    },
    handicap: {
      type: Number,
      min: 0,
      max: 54,
      default: 28
    },
    homeClub: {
      type: String,
      trim: true
    },
    selectedCharity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Charity"
    },
    donationPercentage: {
      type: Number,
      min: 10,
      max: 100,
      default: 10
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model("User", userSchema);
