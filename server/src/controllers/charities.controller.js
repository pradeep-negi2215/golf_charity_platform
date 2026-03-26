const Charity = require("../models/charity.model");

const listCharities = async (req, res) => {
  try {
    const query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.country) {
      query.country = req.query.country;
    }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } }
      ];
    }

    const charities = await Charity.find(query).sort({ name: 1, createdAt: -1 });
    return res.status(200).json(charities);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCharityById = async (req, res) => {
  try {
    const charity = await Charity.findById(req.params.id);

    if (!charity) {
      return res.status(404).json({ message: "Charity not found" });
    }

    return res.status(200).json(charity);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const createCharity = async (req, res) => {
  try {
    const { name, description, category, country, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Charity name is required" });
    }

    const charity = await Charity.create({
      name: name.trim(),
      description,
      category,
      country,
      status
    });

    return res.status(201).json(charity);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const updateCharity = async (req, res) => {
  try {
    const charity = await Charity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!charity) {
      return res.status(404).json({ message: "Charity not found" });
    }

    return res.status(200).json(charity);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const deleteCharity = async (req, res) => {
  try {
    const charity = await Charity.findByIdAndDelete(req.params.id);

    if (!charity) {
      return res.status(404).json({ message: "Charity not found" });
    }

    return res.status(200).json({ message: "Charity deleted" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  listCharities,
  getCharityById,
  createCharity,
  updateCharity,
  deleteCharity
};
