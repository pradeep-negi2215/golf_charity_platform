const mongoose = require("mongoose");

const badRequest = (res, message, details = []) => {
  return res.status(400).json({ message, details });
};

const validateObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const validateRegisterPayload = (req, res, next) => {
  const { firstName, lastName, email, password, charityId } = req.body;
  const details = [];

  if (!firstName) details.push("firstName is required");
  if (!lastName) details.push("lastName is required");
  if (!email) details.push("email is required");
  if (!password) details.push("password is required");
  if (!charityId) details.push("charityId is required");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) details.push("email is invalid");
  if (password && `${password}`.length < 8) details.push("password must be at least 8 characters");
  if (charityId && !validateObjectId(charityId)) details.push("charityId must be a valid ObjectId");

  if (details.length) {
    return badRequest(res, "Invalid register payload", details);
  }

  return next();
};

const validateLoginPayload = (req, res, next) => {
  const { email, password } = req.body;
  const details = [];

  if (!email) details.push("email is required");
  if (!password) details.push("password is required");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) details.push("email is invalid");

  if (details.length) {
    return badRequest(res, "Invalid login payload", details);
  }

  return next();
};

const validateForgotPasswordPayload = (req, res, next) => {
  const { email } = req.body;
  const details = [];

  if (!email) details.push("email is required");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) details.push("email is invalid");

  if (details.length) {
    return badRequest(res, "Invalid forgot-password payload", details);
  }

  return next();
};

const validateResetPasswordPayload = (req, res, next) => {
  const { token, newPassword } = req.body;
  const details = [];

  if (!token) details.push("token is required");
  if (!newPassword) details.push("newPassword is required");
  if (newPassword && `${newPassword}`.length < 8) details.push("newPassword must be at least 8 characters");

  if (details.length) {
    return badRequest(res, "Invalid reset-password payload", details);
  }

  return next();
};

const validateChangePasswordPayload = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const details = [];

  if (!currentPassword) details.push("currentPassword is required");
  if (!newPassword) details.push("newPassword is required");
  if (newPassword && `${newPassword}`.length < 8) details.push("newPassword must be at least 8 characters");
  if (currentPassword && newPassword && currentPassword === newPassword) {
    details.push("newPassword must be different from currentPassword");
  }

  if (details.length) {
    return badRequest(res, "Invalid change-password payload", details);
  }

  return next();
};

const validateBootstrapAdminPayload = (req, res, next) => {
  const { firstName, lastName, email, password, charityId } = req.body;
  const details = [];

  if (!firstName) details.push("firstName is required");
  if (!lastName) details.push("lastName is required");
  if (!email) details.push("email is required");
  if (!password) details.push("password is required");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) details.push("email is invalid");
  if (password && `${password}`.length < 8) details.push("password must be at least 8 characters");
  if (charityId && !validateObjectId(charityId)) details.push("charityId must be a valid ObjectId");

  if (details.length) {
    return badRequest(res, "Invalid bootstrap-admin payload", details);
  }

  return next();
};

const validateScoreCreatePayload = (req, res, next) => {
  const value = Number(req.body.value);
  const details = [];

  if (!Number.isFinite(value)) details.push("value must be a number");
  if (Number.isFinite(value) && (value < 1 || value > 45)) details.push("value must be between 1 and 45");
  if (req.body.date) {
    const date = new Date(req.body.date);
    if (Number.isNaN(date.getTime())) details.push("date must be a valid date");
  }

  if (details.length) {
    return badRequest(res, "Invalid score payload", details);
  }

  return next();
};

const validateSubscriptionCreatePayload = (req, res, next) => {
  const { planType, billingCycle, amount, userId } = req.body;
  const cycle = planType || billingCycle || "monthly";
  const details = [];

  if (!["monthly", "yearly"].includes(cycle)) {
    details.push("planType/billingCycle must be monthly or yearly");
  }

  if (amount !== undefined) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      details.push("amount must be a non-negative number");
    }
  }

  if (userId && !validateObjectId(userId)) {
    details.push("userId must be a valid ObjectId");
  }

  if (details.length) {
    return badRequest(res, "Invalid subscription payload", details);
  }

  return next();
};

const validateSubscriptionStatusPayload = (req, res, next) => {
  const { status, planType, userId } = req.body;
  const details = [];

  if (!status) details.push("status is required");
  if (status && !["active", "inactive", "cancelled"].includes(status)) {
    details.push("status must be active, inactive, or cancelled");
  }
  if (planType && !["monthly", "yearly"].includes(planType)) {
    details.push("planType must be monthly or yearly");
  }
  if (userId && !validateObjectId(userId)) {
    details.push("userId must be a valid ObjectId");
  }

  if (details.length) {
    return badRequest(res, "Invalid subscription status payload", details);
  }

  return next();
};

const validateCharityPayload = (req, res, next) => {
  const { name, status } = req.body;
  const details = [];

  if (req.method === "POST" && !name) {
    details.push("name is required");
  }

  if (status && !["active", "inactive"].includes(status)) {
    details.push("status must be active or inactive");
  }

  if (details.length) {
    return badRequest(res, "Invalid charity payload", details);
  }

  return next();
};

const validateAdminScoreUpdatePayload = (req, res, next) => {
  const { value, date } = req.body;
  const details = [];

  if (value === undefined && date === undefined) {
    details.push("at least one of value or date must be provided");
  }

  if (value !== undefined) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 45) {
      details.push("value must be between 1 and 45");
    }
  }

  if (date !== undefined) {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      details.push("date must be a valid date");
    }
  }

  if (details.length) {
    return badRequest(res, "Invalid admin score update payload", details);
  }

  return next();
};

const validateAdminSubscriptionUpdatePayload = (req, res, next) => {
  const { billingCycle, status, amount } = req.body;
  const details = [];

  if (billingCycle === undefined && status === undefined && amount === undefined) {
    details.push("at least one of billingCycle, status, or amount must be provided");
  }

  if (billingCycle && !["monthly", "yearly"].includes(billingCycle)) {
    details.push("billingCycle must be monthly or yearly");
  }

  if (status && !["active", "inactive", "cancelled"].includes(status)) {
    details.push("status must be active, inactive, or cancelled");
  }

  if (amount !== undefined) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      details.push("amount must be a non-negative number");
    }
  }

  if (details.length) {
    return badRequest(res, "Invalid admin subscription update payload", details);
  }

  return next();
};

const validateAdminUserUpdatePayload = (req, res, next) => {
  const { role, email, donationPercentage, selectedCharity } = req.body;
  const details = [];

  if (role && !["member", "admin"].includes(role)) {
    details.push("role must be member or admin");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    details.push("email is invalid");
  }

  if (donationPercentage !== undefined && Number(donationPercentage) < 10) {
    details.push("donationPercentage must be at least 10");
  }

  if (selectedCharity && !validateObjectId(selectedCharity)) {
    details.push("selectedCharity must be a valid ObjectId");
  }

  if (details.length) {
    return badRequest(res, "Invalid admin user update payload", details);
  }

  return next();
};

const validateAdminPayoutPayload = (req, res, next) => {
  const { tier, drawId, userId } = req.params;
  const { paidOut } = req.body;
  const details = [];

  if (!["match3", "match4", "match5"].includes(tier)) {
    details.push("tier must be one of match3, match4, match5");
  }

  if (!validateObjectId(drawId)) {
    details.push("drawId must be a valid ObjectId");
  }

  if (!validateObjectId(userId)) {
    details.push("userId must be a valid ObjectId");
  }

  if (typeof paidOut !== "boolean") {
    details.push("paidOut must be a boolean");
  }

  if (details.length) {
    return badRequest(res, "Invalid admin payout payload", details);
  }

  return next();
};

module.exports = {
  validateRegisterPayload,
  validateLoginPayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload,
  validateChangePasswordPayload,
  validateBootstrapAdminPayload,
  validateScoreCreatePayload,
  validateSubscriptionCreatePayload,
  validateSubscriptionStatusPayload,
  validateCharityPayload,
  validateAdminScoreUpdatePayload,
  validateAdminSubscriptionUpdatePayload,
  validateAdminUserUpdatePayload,
  validateAdminPayoutPayload
};
