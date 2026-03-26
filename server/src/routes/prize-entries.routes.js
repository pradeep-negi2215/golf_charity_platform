const express = require("express");

const {
  listPrizeEntries,
  createPrizeEntry
} = require("../controllers/prize-entries.controller");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");
const { requireActiveSubscription } = require("../middleware/subscription.middleware");

const router = express.Router();

router.get("/", protect, authorizeRoles("member", "admin"), requireActiveSubscription, listPrizeEntries);
router.post("/", protect, authorizeRoles("member", "admin"), requireActiveSubscription, createPrizeEntry);

module.exports = router;
