const Score = require("../models/score.model");

const MAX_SCORES_PER_USER = 5;

const isTransactionUnsupportedError = (error) => {
  const message = `${error?.message || ""}`.toLowerCase();
  return (
    message.includes("transaction numbers are only allowed on a replica set") ||
    message.includes("replica set")
  );
};

const trimOverflowScores = async (userId, session) => {
  const query = Score.find({ userId })
    .sort({ date: -1, createdAt: -1 })
    .skip(MAX_SCORES_PER_USER)
    .select("_id");

  if (session) {
    query.session(session);
  }

  const overflowScores = await query;

  if (!overflowScores.length) {
    return;
  }

  await Score.deleteMany(
    {
      _id: { $in: overflowScores.map((score) => score._id) }
    },
    session ? { session } : undefined
  );
};

const createAndTrimScores = async (userId, value, scoreDate, session) => {
  await Score.create(
    [
      {
        userId,
        value,
        date: scoreDate
      }
    ],
    session ? { session } : undefined
  );

  await trimOverflowScores(userId, session);
};

const getRecentScores = async (userId) => {
  return Score.find({ userId })
    .sort({ date: -1, createdAt: -1 })
    .limit(MAX_SCORES_PER_USER);
};

const addScore = async (req, res) => {
  try {
    const userId = req.user._id;
    const value = Number(req.body.value);
    const scoreDate = req.body.date ? new Date(req.body.date) : new Date();

    if (!Number.isFinite(value) || value < 1 || value > 45) {
      return res.status(400).json({ message: "Score value must be between 1 and 45" });
    }

    if (Number.isNaN(scoreDate.getTime())) {
      return res.status(400).json({ message: "Score date must be a valid date" });
    }

    const session = await Score.startSession();

    try {
      await session.withTransaction(async () => {
        await createAndTrimScores(userId, value, scoreDate, session);
      });
    } catch (transactionError) {
      if (!isTransactionUnsupportedError(transactionError)) {
        throw transactionError;
      }

      // Fallback for local standalone MongoDB setups where transactions are unavailable.
      await createAndTrimScores(userId, value, scoreDate);
    } finally {
      await session.endSession();
    }

    const scores = await getRecentScores(userId);
    return res.status(201).json({ scores });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listScores = async (req, res) => {
  try {
    const scores = await getRecentScores(req.user._id);
    return res.status(200).json({ scores });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addScore,
  listScores
};
