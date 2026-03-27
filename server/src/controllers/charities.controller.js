const Charity = require("../models/charity.model");

const DEFAULT_CHARITIES = [
  {
    name: "Strokes for Hope Foundation",
    description: "Funds community stroke recovery and rehabilitation programs.",
    category: "health",
    country: "UK",
    status: "active"
  },
  {
    name: "Fairway Future Education Trust",
    description: "Supports youth education and school equipment grants.",
    category: "education",
    country: "US",
    status: "active"
  },
  {
    name: "Green Course Climate Initiative",
    description: "Builds local climate resilience and tree restoration projects.",
    category: "environment",
    country: "Canada",
    status: "active"
  }
];

const seedDefaultCharitiesIfEmpty = async () => {
  const activeCount = await Charity.countDocuments({ status: "active" });
  if (activeCount > 0) {
    return;
  }

  await Promise.all(
    DEFAULT_CHARITIES.map((charity) =>
      Charity.findOneAndUpdate({ name: charity.name }, { $setOnInsert: charity }, { upsert: true, new: true })
    )
  );
};

const listCharities = async (req, res) => {
  try {
    if (global.DEMO_MODE) {
      return res.status(200).json([
        {
          _id: "demo-charity-001",
          name: "Demo Health Charity",
          description: "A demonstration health charity for testing",
          category: "health",
          country: "UK",
          status: "active",
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: "demo-charity-002",
          name: "Demo Education Charity",
          description: "A demonstration education charity for testing",
          category: "education",
          country: "US",
          status: "active",
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
    }

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

    if (req.query.status === "active") {
      await seedDefaultCharitiesIfEmpty();
    }

    const charities = await Charity.find(query).sort({ name: 1, createdAt: -1 });
    return res.status(200).json(charities);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCharityById = async (req, res) => {
  try {
    if (global.DEMO_MODE) {
      if (req.params.id === "demo-charity-001") {
        return res.status(200).json({
          _id: "demo-charity-001",
          name: "Demo Health Charity",
          description: "A demonstration health charity for testing",
          category: "health",
          country: "UK",
          status: "active"
        });
      }
      return res.status(404).json({ message: "Charity not found in demo mode" });
    }

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
