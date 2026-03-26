const { getMySQLPool } = require("../config/mysql");

const requireActiveSubscription = async (req, res, next) => {
  try {
    if (`${process.env.SUBSCRIPTION_ENFORCEMENT_ENABLED || "true"}`.toLowerCase() === "false") {
      return next();
    }

    if (req.user?.role === "admin") {
      return next();
    }

    const mysqlPool = getMySQLPool();
    const [rows] = await mysqlPool.execute(
      `
      SELECT user_id, plan_type, status, started_at, end_at
      FROM subscriptions
      WHERE user_id = ?
      LIMIT 1
      `,
      [req.user._id.toString()]
    );

    if (!rows.length) {
      return res.status(403).json({ message: "Active subscription is required" });
    }

    const subscription = rows[0];
    const isActive = subscription.status === "active" && new Date(subscription.end_at) > new Date();

    if (!isActive) {
      return res.status(403).json({ message: "Subscription is inactive" });
    }

    req.subscription = subscription;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Unable to validate subscription status" });
  }
};

module.exports = {
  requireActiveSubscription
};
