const express = require("express");

const {
  listPerformanceLogs,
  createPerformanceLog
} = require("../controllers/performance.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireActiveSubscription } = require("../middleware/subscription.middleware");

const router = express.Router();

router.get("/", protect, requireActiveSubscription, listPerformanceLogs);
router.post("/", protect, requireActiveSubscription, createPerformanceLog);

module.exports = router;
