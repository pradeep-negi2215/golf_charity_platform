const PerformanceLog = require("../models/performance-log.model");

const listPerformanceLogs = async (req, res) => {
  try {
    const query = {};
    const isAdmin = req.user?.role === "admin";

    if (!isAdmin) {
      query.userId = req.user._id;
    } else if (req.query.userId) {
      query.userId = req.query.userId;
    }

    const logs = await PerformanceLog.find(query)
      .sort({ playedAt: -1 })
      .limit(200);

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPerformanceLog = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const userId = isAdmin ? req.body.userId || req.user._id : req.user._id;

    const log = await PerformanceLog.create({
      ...req.body,
      userId
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  listPerformanceLogs,
  createPerformanceLog
};
