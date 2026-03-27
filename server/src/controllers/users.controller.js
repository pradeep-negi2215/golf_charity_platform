const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const Charity = require("../models/charity.model");

const listUsers = async (req, res) => {
  try {
    if (global.DEMO_MODE) {
      return res.status(200).json([
        {
          _id: "demo-user-001",
          email: "demo@example.com",
          firstName: "Demo",
          lastName: "User",
          role: "member",
          selectedCharity: {
            _id: "demo-charity-001",
            name: "Demo Charity",
            category: "health",
            country: "UK",
            status: "active"
          },
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
    }

    const users = await User.find()
      .select("-password")
      .populate("selectedCharity", "name category country status")
      .sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    if (global.DEMO_MODE) {
      const { password, role } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const normalizedRole = role || "member";
      if (!["member", "admin"].includes(normalizedRole)) {
        return res.status(400).json({ message: "Role must be either member or admin" });
      }

      return res.status(201).json({
        _id: "demo-user-" + Date.now(),
        email: req.body.email || "demo.user@example.com",
        firstName: req.body.firstName || "Demo",
        lastName: req.body.lastName || "User",
        role: normalizedRole,
        donationPercentage: 10,
        createdAt: new Date().toISOString(),
        message: "Demo mode user created"
      });
    }

    const { password, role } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalizedRole = role || "member";
    if (!["member", "admin"].includes(normalizedRole)) {
      return res.status(400).json({ message: "Role must be either member or admin" });
    }

    const user = await User.create({
      ...req.body,
      role: normalizedRole,
      password: await bcrypt.hash(password, 10)
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateMyCharity = async (req, res) => {
  try {
    const { charityId } = req.body;
    const donationPercentage = Number(req.body.donationPercentage ?? 10);

    if (!charityId) {
      return res.status(400).json({ message: "charityId is required" });
    }

    if (Number.isNaN(donationPercentage) || donationPercentage < 10) {
      return res.status(400).json({ message: "Donation percentage must be at least 10" });
    }

    const charity = await Charity.findOne({ _id: charityId, status: "active" });
    if (!charity) {
      return res.status(400).json({ message: "Selected charity is invalid or inactive" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        selectedCharity: charity._id,
        donationPercentage
      },
      { new: true, runValidators: true }
    ).populate("selectedCharity", "name category country status");

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  listUsers,
  createUser,
  updateMyCharity
};
