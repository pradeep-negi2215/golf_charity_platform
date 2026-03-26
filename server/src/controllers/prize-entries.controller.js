const PrizeEntry = require("../models/prize-entry.model");
const { getMySQLPool } = require("../config/mysql");
const { toMonthKey } = require("../utils/month-key");

const listPrizeEntries = async (req, res) => {
  try {
    const query = {};
    const isAdmin = req.user?.role === "admin";

    if (!isAdmin) {
      query.userId = req.user._id;
    } else if (req.query.userId) {
      query.userId = req.query.userId;
    }

    if (req.query.monthKey) {
      query.monthKey = req.query.monthKey;
    }

    const entries = await PrizeEntry.find(query)
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPrizeEntry = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";

    const payload = {
      ...req.body,
      userId: isAdmin ? req.body.userId || req.user._id : req.user._id,
      monthKey: req.body.monthKey || toMonthKey(new Date())
    };

    const entry = await PrizeEntry.create(payload);

    const mysqlPool = getMySQLPool();
    await mysqlPool.execute(
      `
      INSERT INTO prize_entries_audit
      (mongo_entry_id, mongo_user_id, month_key, entry_count, source)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        entry._id.toString(),
        entry.userId.toString(),
        entry.monthKey,
        entry.entryCount,
        entry.source
      ]
    );

    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  listPrizeEntries,
  createPrizeEntry
};
