const Subscription = require("../models/subscription.model");
const CharityContribution = require("../models/charity-contribution.model");
const User = require("../models/user.model");
const { getMySQLPool } = require("../config/mysql");

const VALID_PLAN_TYPES = ["monthly", "yearly"];
const VALID_STATUS_TYPES = ["active", "inactive", "cancelled"];

const buildPeriodEnd = (planType, fromDate = new Date()) => {
  const endDate = new Date(fromDate);

  if (planType === "yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return endDate;
};

const resolveTargetUserId = (req) => {
  const isAdmin = req.user?.role === "admin";
  if (isAdmin) {
    return (req.body.userId || req.query.userId || req.user._id).toString();
  }

  return req.user._id.toString();
};

const recordSubscriptionContribution = async (userId, amount, currency = "GBP", sourceDate = new Date()) => {
  const user = await User.findById(userId).populate("selectedCharity", "name status");

  if (!user || !user.selectedCharity || user.selectedCharity.status !== "active") {
    throw new Error("User must have an active selected charity before subscribing");
  }

  const donationPercentage = Number(user.donationPercentage ?? 10);
  if (Number.isNaN(donationPercentage) || donationPercentage < 10) {
    throw new Error("User donation percentage must be at least 10");
  }

  const contributionAmount = Number(((Number(amount) * donationPercentage) / 100).toFixed(2));

  await CharityContribution.create({
    userId: user._id,
    charityId: user.selectedCharity._id,
    amount: contributionAmount,
    currency,
    cause: user.selectedCharity.name,
    source: "subscription",
    percentage: donationPercentage,
    contributedAt: sourceDate
  });
};

const listSubscriptions = async (req, res) => {
  try {
    const query = {};
    const isAdmin = req.user?.role === "admin";

    if (!isAdmin) {
      query.userId = req.user._id;
    } else if (req.query.userId) {
      query.userId = req.query.userId;
    }

    const subscriptions = await Subscription.find(query)
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSubscription = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const userId = isAdmin ? req.body.userId || req.user._id : req.user._id;
    const planType = req.body.planType || req.body.billingCycle || "monthly";

    if (!VALID_PLAN_TYPES.includes(planType)) {
      return res.status(400).json({ message: "Plan must be monthly or yearly" });
    }

    const amount = Number(
      req.body.amount ?? (planType === "yearly" ? 199.99 : 19.99)
    );
    const now = new Date();
    const endAt = buildPeriodEnd(planType, now);

    const subscription = await Subscription.create({
      ...req.body,
      userId,
      billingCycle: planType,
      amount,
      status: "active",
      startedAt: now,
      renewalDate: endAt
    });

    const mysqlPool = getMySQLPool();
    await mysqlPool.execute(
      `
      INSERT INTO subscriptions (user_id, plan_type, amount, currency, status, started_at, end_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
      ON DUPLICATE KEY UPDATE
        plan_type = VALUES(plan_type),
        amount = VALUES(amount),
        currency = VALUES(currency),
        status = VALUES(status),
        started_at = VALUES(started_at),
        end_at = VALUES(end_at)
      `,
      [
        subscription.userId.toString(),
        planType,
        amount,
        subscription.currency,
        now,
        endAt
      ]
    );

    await mysqlPool.execute(
      `
      INSERT INTO subscriptions_ledger
      (mongo_subscription_id, mongo_user_id, plan, amount, currency, billing_cycle, status, started_at, renewal_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        subscription._id.toString(),
        subscription.userId.toString(),
        subscription.plan,
        subscription.amount,
        subscription.currency,
        subscription.billingCycle,
        subscription.status,
        subscription.startedAt,
        subscription.renewalDate
      ]
    );

    await recordSubscriptionContribution(subscription.userId, subscription.amount, subscription.currency, now);

    res.status(201).json(subscription);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateSubscriptionStatus = async (req, res) => {
  try {
    const mysqlPool = getMySQLPool();
    const userId = resolveTargetUserId(req);
    const status = req.body.status;

    if (!VALID_STATUS_TYPES.includes(status)) {
      return res.status(400).json({ message: "Status must be active, inactive, or cancelled" });
    }

    const [currentRows] = await mysqlPool.execute(
      "SELECT user_id, plan_type, amount, currency, status FROM subscriptions WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!currentRows.length) {
      return res.status(404).json({ message: "Subscription not found for user" });
    }

    const currentSubscription = currentRows[0];
    const planType = req.body.planType || currentSubscription.plan_type;

    if (!VALID_PLAN_TYPES.includes(planType)) {
      return res.status(400).json({ message: "Plan must be monthly or yearly" });
    }

    const now = new Date();
    const endAt = status === "active" ? buildPeriodEnd(planType, now) : now;

    await mysqlPool.execute(
      `
      UPDATE subscriptions
      SET plan_type = ?, status = ?, started_at = ?, end_at = ?
      WHERE user_id = ?
      `,
      [planType, status, now, endAt, userId]
    );

    await Subscription.findOneAndUpdate(
      { userId },
      {
        status,
        billingCycle: planType,
        startedAt: now,
        renewalDate: endAt
      },
      { sort: { createdAt: -1 } }
    );

    if (status === "active") {
      await recordSubscriptionContribution(userId, currentSubscription.amount, currentSubscription.currency, now);
    }

    const [rows] = await mysqlPool.execute(
      "SELECT user_id, plan_type, amount, currency, status, started_at, end_at FROM subscriptions WHERE user_id = ? LIMIT 1",
      [userId]
    );

    return res.status(200).json({ subscription: rows[0] });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const mysqlPool = getMySQLPool();
    const userId = resolveTargetUserId(req);

    const [rows] = await mysqlPool.execute(
      "SELECT user_id, plan_type, amount, currency, status, started_at, end_at FROM subscriptions WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(200).json({
        userId,
        status: "inactive",
        isActive: false,
        planType: null
      });
    }

    const subscription = rows[0];
    const isActive = subscription.status === "active" && new Date(subscription.end_at) > new Date();

    return res.status(200).json({
      userId,
      status: isActive ? "active" : "inactive",
      isActive,
      planType: subscription.plan_type,
      amount: Number(subscription.amount),
      currency: subscription.currency,
      startedAt: subscription.started_at,
      endAt: subscription.end_at
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listSubscriptions,
  createSubscription,
  updateSubscriptionStatus,
  getSubscriptionStatus
};
