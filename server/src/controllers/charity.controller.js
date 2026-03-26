const CharityContribution = require("../models/charity-contribution.model");
const { getMySQLPool } = require("../config/mysql");

const listCharityContributions = async (req, res) => {
  try {
    const query = {};

    if (req.query.userId) {
      query.userId = req.query.userId;
    }

    const contributions = await CharityContribution.find(query)
      .populate("charityId", "name category country status")
      .sort({ contributedAt: -1 })
      .limit(200);

    res.status(200).json(contributions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCharityContribution = async (req, res) => {
  try {
    const contribution = await CharityContribution.create(req.body);

    const mysqlPool = getMySQLPool();
    await mysqlPool.execute(
      `
      INSERT INTO charity_ledger
      (mongo_contribution_id, mongo_user_id, amount, currency, cause, source, contributed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        contribution._id.toString(),
        contribution.userId.toString(),
        contribution.amount,
        contribution.currency,
        contribution.cause,
        contribution.source,
        contribution.contributedAt
      ]
    );

    const hydratedContribution = await CharityContribution.findById(contribution._id).populate(
      "charityId",
      "name category country status"
    );

    res.status(201).json(hydratedContribution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  listCharityContributions,
  createCharityContribution
};
