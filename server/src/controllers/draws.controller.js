const MonthlyDraw = require("../models/monthly-draw.model");
const Score = require("../models/score.model");
const { getMySQLPool } = require("../config/mysql");
const { sendDrawResultEmail, sendWinnerEmail } = require("../services/email.service");

const roundMoney = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMonthKey = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

const generateDrawNumbers = () => {
  const picked = new Set();

  while (picked.size < 5) {
    picked.add(Math.floor(Math.random() * 45) + 1);
  }

  return Array.from(picked).sort((a, b) => a - b);
};

const getUserScoreMap = async () => {
  const grouped = await Score.aggregate([
    {
      $sort: {
        userId: 1,
        date: -1,
        createdAt: -1
      }
    },
    {
      $group: {
        _id: "$userId",
        scores: { $push: "$value" }
      }
    },
    {
      $project: {
        scores: { $slice: ["$scores", 5] }
      }
    }
  ]);

  return grouped.map((entry) => ({
    userId: entry._id,
    scoreNumbers: entry.scores
  }));
};

const getTotalSubscriptionAmount = async () => {
  try {
    const mysqlPool = getMySQLPool();
    const [rows] = await mysqlPool.execute(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM subscriptions WHERE status = 'active'"
    );

    return roundMoney(toNumber(rows?.[0]?.total));
  } catch (error) {
    // Keep draw runnable in environments without MySQL (local tests/dev).
    return 0;
  }
};

const getRolloverIn = async () => {
  const previousDraw = await MonthlyDraw.findOne().sort({ ranAt: -1 }).select("prizePool.rolloverOut");
  return roundMoney(toNumber(previousDraw?.prizePool?.rolloverOut));
};

const createPrizePool = (totalSubscriptions, rolloverIn) => {
  const match3 = roundMoney(totalSubscriptions * 0.25);
  const match4 = roundMoney(totalSubscriptions * 0.35);
  const match5 = roundMoney(totalSubscriptions * 0.4 + rolloverIn);

  return {
    totalSubscriptions: roundMoney(totalSubscriptions),
    rolloverIn: roundMoney(rolloverIn),
    rolloverOut: 0,
    pools: {
      match3,
      match4,
      match5
    },
    perWinner: {
      match3: 0,
      match4: 0,
      match5: 0
    }
  };
};

const buildDrawPayload = (monthKey, drawNumbers, scoreMap, prizePool) => {
  const drawSet = new Set(drawNumbers);

  const winners = {
    match3: [],
    match4: [],
    match5: []
  };

  const results = [];

  for (const entry of scoreMap) {
    const dedupedScores = Array.from(new Set(entry.scoreNumbers));
    const matchedNumbers = dedupedScores.filter((value) => drawSet.has(value));
    const matchCount = matchedNumbers.length;
    const winnings = 0;

    const result = {
      userId: entry.userId,
      scoreNumbers: dedupedScores,
      matchedNumbers,
      matchCount,
      winnings
    };

    results.push(result);

    if (matchCount >= 3 && matchCount <= 5) {
      winners[`match${matchCount}`].push({
        userId: entry.userId,
        matchedNumbers,
        winnings,
        paidOut: false,
        paidOutAt: null,
        paidOutBy: null,
        payoutReference: ""
      });
    }
  }

  const winnerCounts = {
    match3: winners.match3.length,
    match4: winners.match4.length,
    match5: winners.match5.length
  };

  prizePool.perWinner.match3 = winnerCounts.match3
    ? roundMoney(prizePool.pools.match3 / winnerCounts.match3)
    : 0;
  prizePool.perWinner.match4 = winnerCounts.match4
    ? roundMoney(prizePool.pools.match4 / winnerCounts.match4)
    : 0;
  prizePool.perWinner.match5 = winnerCounts.match5
    ? roundMoney(prizePool.pools.match5 / winnerCounts.match5)
    : 0;

  prizePool.rolloverOut = winnerCounts.match5 ? 0 : roundMoney(prizePool.pools.match5);

  for (const winner of winners.match3) {
    winner.winnings = prizePool.perWinner.match3;
  }

  for (const winner of winners.match4) {
    winner.winnings = prizePool.perWinner.match4;
  }

  for (const winner of winners.match5) {
    winner.winnings = prizePool.perWinner.match5;
  }

  const winningsByUserId = new Map();
  for (const bucket of ["match3", "match4", "match5"]) {
    for (const winner of winners[bucket]) {
      winningsByUserId.set(winner.userId.toString(), winner.winnings);
    }
  }

  for (const result of results) {
    if (result.matchCount >= 3 && result.matchCount <= 5) {
      result.winnings = winningsByUserId.get(result.userId.toString()) || 0;
    }
  }

  return {
    monthKey,
    drawNumbers,
    participantCount: scoreMap.length,
    prizePool,
    winners,
    results,
    ranAt: new Date()
  };
};

const serializeDraw = (drawDoc, currentUserId) => {
  const draw = drawDoc.toObject ? drawDoc.toObject() : drawDoc;

  const byName = (winner) => {
    const user = winner.userId || {};
    return {
      userId: user._id || winner.userId,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown",
      email: user.email || "",
      matchedNumbers: winner.matchedNumbers,
      winnings: winner.winnings,
      paidOut: Boolean(winner.paidOut),
      paidOutAt: winner.paidOutAt || null,
      payoutReference: winner.payoutReference || ""
    };
  };

  const currentResult = draw.results.find((entry) => {
    const id = entry.userId && entry.userId._id ? entry.userId._id.toString() : entry.userId.toString();
    return id === currentUserId;
  });

  const currentUser = currentResult
    ? {
        participated: true,
        scoreNumbers: currentResult.scoreNumbers,
        matchedNumbers: currentResult.matchedNumbers,
        matchCount: currentResult.matchCount,
        winnings: currentResult.winnings
      }
    : {
        participated: false,
        scoreNumbers: [],
        matchedNumbers: [],
        matchCount: 0,
        winnings: 0
      };

  return {
    monthKey: draw.monthKey,
    ranAt: draw.ranAt,
    drawNumbers: draw.drawNumbers,
    participantCount: draw.participantCount,
    prizePool: draw.prizePool,
    winners: {
      match3: draw.winners.match3.map(byName),
      match4: draw.winners.match4.map(byName),
      match5: draw.winners.match5.map(byName)
    },
    currentUser
  };
};

const runMonthlyDraw = async (req, res) => {
  try {
    const monthKey = req.body.monthKey || toMonthKey(new Date());
    const existing = await MonthlyDraw.findOne({ monthKey });

    if (existing) {
      return res.status(409).json({ message: "Draw already exists for this month" });
    }

    const drawNumbers = generateDrawNumbers();
    const scoreMap = await getUserScoreMap();
    const totalSubscriptions = await getTotalSubscriptionAmount();
    const rolloverIn = await getRolloverIn();
    const prizePool = createPrizePool(totalSubscriptions, rolloverIn);

    const payload = buildDrawPayload(monthKey, drawNumbers, scoreMap, prizePool);

    const created = await MonthlyDraw.create(payload);

    const populated = await MonthlyDraw.findById(created._id)
      .populate("winners.match3.userId", "firstName lastName email")
      .populate("winners.match4.userId", "firstName lastName email")
      .populate("winners.match5.userId", "firstName lastName email")
      .populate("results.userId", "firstName lastName email");

    const resultEmailJobs = (populated.results || []).map((result) => {
      const user = result.userId;
      if (!user?.email) {
        return Promise.resolve();
      }

      return sendDrawResultEmail({
        email: user.email,
        firstName: user.firstName,
        monthKey: populated.monthKey,
        matchedNumbers: result.matchedNumbers,
        winnings: result.winnings
      });
    });

    const winnerEmailJobs = ["match3", "match4", "match5"].flatMap((tier) => {
      return (populated.winners?.[tier] || []).map((winner) => {
        const user = winner.userId;
        if (!user?.email) {
          return Promise.resolve();
        }

        return sendWinnerEmail({
          email: user.email,
          firstName: user.firstName,
          monthKey: populated.monthKey,
          tier,
          winnings: winner.winnings
        });
      });
    });

    Promise.allSettled([...resultEmailJobs, ...winnerEmailJobs]).catch(() => null);

    return res.status(201).json({
      draw: serializeDraw(populated, req.user._id.toString())
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getLatestMonthlyDraw = async (req, res) => {
  try {
    const draw = await MonthlyDraw.findOne()
      .sort({ ranAt: -1 })
      .populate("winners.match3.userId", "firstName lastName email")
      .populate("winners.match4.userId", "firstName lastName email")
      .populate("winners.match5.userId", "firstName lastName email")
      .populate("results.userId", "firstName lastName email");

    if (!draw) {
      return res.status(200).json({ draw: null });
    }

    return res.status(200).json({
      draw: serializeDraw(draw, req.user._id.toString())
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMonthlyDrawHistory = async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit || 12);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(36, Math.floor(requestedLimit)))
      : 12;
    const currentUserId = req.user._id.toString();

    const draws = await MonthlyDraw.find()
      .sort({ ranAt: -1 })
      .limit(limit)
      .select("monthKey ranAt drawNumbers participantCount results");

    const history = draws.map((drawDoc) => {
      const draw = drawDoc.toObject ? drawDoc.toObject() : drawDoc;

      const currentResult = draw.results.find((entry) => {
        const resultUserId = entry.userId && entry.userId._id
          ? entry.userId._id.toString()
          : entry.userId.toString();
        return resultUserId === currentUserId;
      });

      return {
        monthKey: draw.monthKey,
        ranAt: draw.ranAt,
        drawNumbers: draw.drawNumbers,
        participantCount: draw.participantCount,
        participated: Boolean(currentResult),
        matchCount: currentResult ? currentResult.matchCount : 0,
        winnings: currentResult ? currentResult.winnings : 0,
        matchedNumbers: currentResult ? currentResult.matchedNumbers : []
      };
    });

    return res.status(200).json({ history });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  runMonthlyDraw,
  getLatestMonthlyDraw,
  getMonthlyDrawHistory
};
