const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/user.model");
const RefreshToken = require("../models/refresh-token.model");
const Charity = require("../models/charity.model");
const { sendSignupEmail, sendPasswordResetEmail } = require("../services/email.service");

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
};

const getRefreshSecret = () => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  return process.env.JWT_REFRESH_SECRET;
};

const tokenHash = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const issueAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      type: "access"
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
};

const issueRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      type: "refresh"
    },
    getRefreshSecret(),
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "14d"
    }
  );
};

const refreshCookieOptions = () => {
  const sameSite = process.env.COOKIE_SAME_SITE || "lax";
  const secure = `${process.env.COOKIE_SECURE || "false"}`.toLowerCase() === "true";
  const maxAge = Number(process.env.JWT_REFRESH_COOKIE_MAX_AGE_MS || 1209600000);

  return {
    httpOnly: true,
    sameSite,
    secure,
    maxAge,
    path: "/api/auth"
  };
};

const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, refreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  const options = refreshCookieOptions();
  res.clearCookie("refreshToken", {
    httpOnly: options.httpOnly,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path
  });
};

const persistRefreshToken = async (user, refreshToken, req) => {
  const decoded = jwt.verify(refreshToken, getRefreshSecret());
  const expiresAt = new Date(decoded.exp * 1000);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: tokenHash(refreshToken),
    expiresAt,
    createdByIp: req.ip || "",
    userAgent: req.get("user-agent") || ""
  });
};

const buildAuthResponse = (user) => {
  const token = issueAccessToken(user);

  return {
    token,
    accessToken: token,
    user
  };
};

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const getClientBaseUrl = () => {
  return process.env.CLIENT_APP_URL || process.env.FRONTEND_URL || "http://localhost:5173";
};

const ensureMongoReady = (res) => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  return res.status(503).json({
    message: "Database is temporarily unavailable. Please try again shortly."
  });
};

const register = async (req, res) => {
  try {
    if (!ensureMongoReady(res)) {
      return undefined;
    }

    const { firstName, lastName, email, password, handicap, homeClub, charityId } = req.body;
    const donationPercentage = Number(req.body.donationPercentage ?? 10);

    if (!firstName || !lastName || !email || !password || !charityId) {
      return res.status(400).json({ message: "firstName, lastName, email, password, and charityId are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    if (Number.isNaN(donationPercentage) || donationPercentage < 10) {
      return res.status(400).json({ message: "Donation percentage must be at least 10" });
    }

    const selectedCharity = await Charity.findOne({ _id: charityId, status: "active" });
    if (!selectedCharity) {
      return res.status(400).json({ message: "Selected charity is invalid or inactive" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "member",
      handicap,
      homeClub,
      selectedCharity: selectedCharity._id,
      donationPercentage
    });

    const refreshToken = issueRefreshToken(user);
    await persistRefreshToken(user, refreshToken, req);
    setRefreshCookie(res, refreshToken);

    sendSignupEmail({
      email: user.email,
      firstName: user.firstName
    }).catch(() => null);

    return res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const registerAdmin = async (req, res) => {
  try {
    if (!ensureMongoReady(res)) {
      return undefined;
    }

    const { firstName, lastName, email, password, handicap, homeClub } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "firstName, lastName, email, and password are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "admin",
      handicap: handicap || 28,
      homeClub: homeClub || ""
    });

    const refreshToken = issueRefreshToken(adminUser);
    await persistRefreshToken(adminUser, refreshToken, req);
    setRefreshCookie(res, refreshToken);

    sendSignupEmail({
      email: adminUser.email,
      firstName: adminUser.firstName
    }).catch(() => null);

    return res.status(201).json(buildAuthResponse(adminUser));
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    if (!ensureMongoReady(res)) {
      return undefined;
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const refreshToken = issueRefreshToken(user);
    await persistRefreshToken(user, refreshToken, req);
    setRefreshCookie(res, refreshToken);

    return res.status(200).json(buildAuthResponse(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    if (!ensureMongoReady(res)) {
      return undefined;
    }

    const email = `${req.body.email || ""}`.toLowerCase().trim();

    const genericMessage = "If that account exists, a password reset link has been sent to the email address.";

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = tokenHash(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${getClientBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await sendPasswordResetEmail({
      email: user.email,
      firstName: user.firstName,
      resetUrl
    }).catch(() => null);

    return res.status(200).json({ message: genericMessage });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    if (!ensureMongoReady(res)) {
      return undefined;
    }

    const { token, newPassword } = req.body;

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash(token),
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Reset token is invalid or has expired" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
    clearRefreshCookie(res);

    return res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    if (!ensureMongoReady(res)) {
      return undefined;
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
    clearRefreshCookie(res);

    return res.status(200).json({ message: "Password updated successfully. Please log in again." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const refresh = async (req, res) => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;

    if (!currentRefreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    const payload = jwt.verify(currentRefreshToken, getRefreshSecret());
    if (payload.type !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token type" });
    }

    const record = await RefreshToken.findOne({
      tokenHash: tokenHash(currentRefreshToken),
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(401).json({ message: "Refresh token is invalid or expired" });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    record.revokedAt = new Date();
    await record.save();

    const nextRefreshToken = issueRefreshToken(user);
    await persistRefreshToken(user, nextRefreshToken, req);
    setRefreshCookie(res, nextRefreshToken);

    return res.status(200).json(buildAuthResponse(user));
  } catch (error) {
    return res.status(401).json({ message: "Unable to refresh session" });
  }
};

const logout = async (req, res) => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;

    if (currentRefreshToken) {
      await RefreshToken.findOneAndUpdate(
        { tokenHash: tokenHash(currentRefreshToken), revokedAt: null },
        { revokedAt: new Date() }
      );
    }

    clearRefreshCookie(res);
    return res.status(200).json({ message: "Logged out" });
  } catch (error) {
    clearRefreshCookie(res);
    return res.status(200).json({ message: "Logged out" });
  }
};

const me = async (req, res) => {
  if (global.DEMO_MODE) {
    // In demo mode, return the user from auth (who sent the token)
    const user = {
      _id: req.user?._id || "demo-guest-001",
      firstName: "Guest",
      lastName: "User",
      email: "guest@demo.golf-charity.local",
      role: "member",
      selectedCharity: {
        _id: "demo-charity-001",
        name: "Demo Charity Foundation",
        category: "Health",
        country: "USA",
        status: "active"
      }
    };
    return res.status(200).json({ user });
  }

  if (!ensureMongoReady(res)) {
    return undefined;
  }

  const user = await User.findById(req.user._id)
    .select("-password")
    .populate("selectedCharity", "name category country status");

  return res.status(200).json({ user });
};

const guestLogin = async (req, res) => {
  try {
    // Always work, even in demo mode
    if (global.DEMO_MODE) {
      const demoUser = {
        _id: "demo-guest-" + Date.now(),
        firstName: "Guest",
        lastName: "User",
        email: "guest@demo.golf-charity.local",
        role: "member",
        handicap: 15,
        homeClub: "Demo Club",
        selectedCharity: {
          _id: "demo-charity-001",
          name: "Demo Charity Foundation",
          category: "Health",
          country: "USA",
          status: "active"
        },
        donationPercentage: 10
      };

      const demoRefreshToken = "demo-refresh-token-" + Date.now();
      setRefreshCookie(res, demoRefreshToken);

      return res.status(200).json(buildAuthResponse(demoUser));
    }

    let guestUser = await User.findOne({ email: "guest@demo.golf-charity.local", role: "member" });

    if (!guestUser) {
      const hashedPassword = await bcrypt.hash("Guest@Demo123!", 10);
      const defaultCharity = await Charity.findOne({ status: "active" });

      guestUser = await User.create({
        firstName: "Guest",
        lastName: "User",
        email: "guest@demo.golf-charity.local",
        password: hashedPassword,
        role: "member",
        handicap: 15,
        homeClub: "Demo Club",
        selectedCharity: defaultCharity?._id,
        donationPercentage: 10
      });
    }

    const refreshToken = issueRefreshToken(guestUser);
    await persistRefreshToken(guestUser, refreshToken, req);
    setRefreshCookie(res, refreshToken);

    return res.status(200).json(buildAuthResponse(guestUser));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const bootstrapAdmin = async (req, res) => {
  try {
    if (!ensureMongoReady(res)) {
      return undefined;
    }

    const configuredKey = process.env.ADMIN_BOOTSTRAP_KEY;
    const providedKey = req.headers["x-admin-bootstrap-key"] || req.body.bootstrapKey;

    if (!configuredKey) {
      return res.status(503).json({ message: "ADMIN_BOOTSTRAP_KEY is not configured" });
    }

    if (providedKey !== configuredKey) {
      return res.status(401).json({ message: "Invalid bootstrap key" });
    }

    const hasExistingAdmin = await User.exists({ role: "admin" });
    if (hasExistingAdmin) {
      return res.status(409).json({ message: "Admin account already exists" });
    }

    const { firstName, lastName, email, password, handicap, homeClub, charityId } = req.body;
    const donationPercentage = Number(req.body.donationPercentage ?? 10);

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "firstName, lastName, email, and password are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    if (Number.isNaN(donationPercentage) || donationPercentage < 10) {
      return res.status(400).json({ message: "Donation percentage must be at least 10" });
    }

    let selectedCharityId;
    if (charityId) {
      const selectedCharity = await Charity.findOne({ _id: charityId, status: "active" });
      if (!selectedCharity) {
        return res.status(400).json({ message: "Selected charity is invalid or inactive" });
      }

      selectedCharityId = selectedCharity._id;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "admin",
      handicap,
      homeClub,
      selectedCharity: selectedCharityId,
      donationPercentage
    });

    const refreshToken = issueRefreshToken(adminUser);
    await persistRefreshToken(adminUser, refreshToken, req);
    setRefreshCookie(res, refreshToken);

    return res.status(201).json(buildAuthResponse(adminUser));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  registerAdmin,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  guestLogin,
  refresh,
  logout,
  me,
  bootstrapAdmin
};
