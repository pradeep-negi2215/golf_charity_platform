const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const RefreshToken = require("../models/refresh-token.model");
const Charity = require("../models/charity.model");
const { sendSignupEmail } = require("../services/email.service");

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

const register = async (req, res) => {
  try {
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

const login = async (req, res) => {
  try {
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
  const user = await User.findById(req.user._id)
    .select("-password")
    .populate("selectedCharity", "name category country status");

  return res.status(200).json({ user });
};

const bootstrapAdmin = async (req, res) => {
  try {
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
  login,
  refresh,
  logout,
  me,
  bootstrapAdmin
};
