const express = require("express");

const {
  listCharityContributions,
  createCharityContribution
} = require("../controllers/charity.controller");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, authorizeRoles("admin"), listCharityContributions);
router.post("/", protect, authorizeRoles("admin"), createCharityContribution);

module.exports = router;
