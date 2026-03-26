const express = require("express");

const {
  listSubscriptions,
  createSubscription,
  updateSubscriptionStatus,
  getSubscriptionStatus
} = require("../controllers/subscriptions.controller");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");
const {
  validateSubscriptionCreatePayload,
  validateSubscriptionStatusPayload
} = require("../middleware/validate.middleware");

const router = express.Router();

router.get("/", protect, authorizeRoles("member", "admin"), listSubscriptions);
router.post("/", protect, authorizeRoles("member", "admin"), validateSubscriptionCreatePayload, createSubscription);
router.get("/status", protect, authorizeRoles("member", "admin"), getSubscriptionStatus);
router.patch("/status", protect, authorizeRoles("member", "admin"), validateSubscriptionStatusPayload, updateSubscriptionStatus);

module.exports = router;
