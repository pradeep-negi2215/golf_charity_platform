const User = require("../models/user.model");
const Score = require("../models/score.model");
const Subscription = require("../models/subscription.model");
const MonthlyDraw = require("../models/monthly-draw.model");
const Charity = require("../models/charity.model");
const { getMySQLPool } = require("../config/mysql");

const VALID_BILLING = ["monthly", "yearly"];
const VALID_SUBSCRIPTION_STATUS = ["active", "inactive", "cancelled"];
const VALID_TIERS = ["match3", "match4", "match5"];

const listAdminUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("selectedCharity", "name category country status")
      .sort({ createdAt: -1 });

    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateAdminUser = async (req, res) => {
  try {
    const allowed = [
      "firstName",
      "lastName",
      "email",
      "role",
      "handicap",
      "homeClub",
      "selectedCharity",
      "donationPercentage"
    ];

    const payload = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        payload[key] = req.body[key];
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "donationPercentage") &&
      Number(payload.donationPercentage) < 10
    ) {
      return res.status(400).json({ message: "Donation percentage must be at least 10" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    })
      .select("-password")
      .populate("selectedCharity", "name category country status");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const deleteAdminUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Admin cannot delete own account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User deleted" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const listAdminScores = async (req, res) => {
  try {
    const query = {};
    if (req.query.userId) {
      query.userId = req.query.userId;
    }

    const scores = await Score.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ date: -1, createdAt: -1 })
      .limit(500);

    return res.status(200).json({ scores });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateAdminScore = async (req, res) => {
  try {
    const update = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "value")) {
      const value = Number(req.body.value);
      if (!Number.isFinite(value) || value < 1 || value > 45) {
        return res.status(400).json({ message: "Score value must be between 1 and 45" });
      }
      update.value = value;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "date")) {
      const date = new Date(req.body.date);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ message: "Score date must be a valid date" });
      }
      update.date = date;
    }

    const score = await Score.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    }).populate("userId", "firstName lastName email");

    if (!score) {
      return res.status(404).json({ message: "Score not found" });
    }

    return res.status(200).json({ score });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const listAdminSubscriptions = async (req, res) => {
  try {
    const query = {};
    if (req.query.userId) {
      query.userId = req.query.userId;
    }

    const subscriptions = await Subscription.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(300);

    return res.status(200).json({ subscriptions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateAdminSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "billingCycle")) {
      if (!VALID_BILLING.includes(req.body.billingCycle)) {
        return res.status(400).json({ message: "billingCycle must be monthly or yearly" });
      }
      subscription.billingCycle = req.body.billingCycle;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
      if (!VALID_SUBSCRIPTION_STATUS.includes(req.body.status)) {
        return res.status(400).json({ message: "status must be active, inactive, or cancelled" });
      }
      subscription.status = req.body.status;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "amount")) {
      const amount = Number(req.body.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ message: "amount must be a non-negative number" });
      }
      subscription.amount = amount;
    }

    await subscription.save();

    try {
      const mysqlPool = getMySQLPool();
      const startedAt = subscription.startedAt || new Date();
      const endAt = subscription.renewalDate || new Date();

      await mysqlPool.execute(
        `
        UPDATE subscriptions
        SET plan_type = ?, amount = ?, status = ?, started_at = ?, end_at = ?
        WHERE user_id = ?
        `,
        [
          subscription.billingCycle,
          subscription.amount,
          subscription.status,
          startedAt,
          endAt,
          subscription.userId.toString()
        ]
      );
    } catch (mysqlError) {
      // Keep MongoDB update successful in environments without MySQL.
    }

    const hydrated = await Subscription.findById(subscription._id).populate(
      "userId",
      "firstName lastName email"
    );

    return res.status(200).json({ subscription: hydrated });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const listAdminDraws = async (req, res) => {
  try {
    const draws = await MonthlyDraw.find()
      .sort({ ranAt: -1 })
      .limit(120)
      .select("monthKey ranAt drawNumbers participantCount winners prizePool");

    return res.status(200).json({ draws });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAdminDrawWinners = async (req, res) => {
  try {
    const draw = await MonthlyDraw.findById(req.params.drawId)
      .populate("winners.match3.userId", "firstName lastName email")
      .populate("winners.match4.userId", "firstName lastName email")
      .populate("winners.match5.userId", "firstName lastName email")
      .populate("winners.match3.paidOutBy", "firstName lastName email")
      .populate("winners.match4.paidOutBy", "firstName lastName email")
      .populate("winners.match5.paidOutBy", "firstName lastName email");

    if (!draw) {
      return res.status(404).json({ message: "Draw not found" });
    }

    return res.status(200).json({
      drawId: draw._id,
      monthKey: draw.monthKey,
      winners: draw.winners
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const markWinnerPayout = async (req, res) => {
  try {
    const { tier, userId } = req.params;
    const { paidOut, payoutReference } = req.body;

    if (!VALID_TIERS.includes(tier)) {
      return res.status(400).json({ message: "tier must be one of match3, match4, match5" });
    }

    const draw = await MonthlyDraw.findById(req.params.drawId);
    if (!draw) {
      return res.status(404).json({ message: "Draw not found" });
    }

    const winners = draw.winners?.[tier] || [];
    const winner = winners.find((item) => item.userId.toString() === userId);

    if (!winner) {
      return res.status(404).json({ message: "Winner not found in selected tier" });
    }

    const nextPaidOut = Boolean(paidOut);
    winner.paidOut = nextPaidOut;
    winner.paidOutAt = nextPaidOut ? new Date() : null;
    winner.paidOutBy = nextPaidOut ? req.user._id : null;
    winner.payoutReference = nextPaidOut ? String(payoutReference || "").trim() : "";

    await draw.save();

    return res.status(200).json({
      message: nextPaidOut ? "Winner marked as paid" : "Winner payout reset",
      winner
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const listAdminCharities = async (req, res) => {
  try {
    const charities = await Charity.find().sort({ name: 1 });
    return res.status(200).json({ charities });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  listAdminScores,
  updateAdminScore,
  listAdminSubscriptions,
  updateAdminSubscription,
  listAdminDraws,
  getAdminDrawWinners,
  markWinnerPayout,
  listAdminCharities
};
