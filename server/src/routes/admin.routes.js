const express = require("express");

const {
  listAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  listAdminScores,
  updateAdminScore,
  listAdminSubscriptions,
  updateAdminSubscription,
  listAdminDraws,
  getAdminDrawWinners,
  markWinnerPayout,
  listAdminCharities
} = require("../controllers/admin.controller");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");
const {
  validateAdminScoreUpdatePayload,
  validateAdminSubscriptionUpdatePayload,
  validateAdminUserUpdatePayload,
  validateAdminPayoutPayload
} = require("../middleware/validate.middleware");

const router = express.Router();

router.use(protect, authorizeRoles("admin"));

router.get("/users", listAdminUsers);
router.patch("/users/:id", validateAdminUserUpdatePayload, updateAdminUser);
router.delete("/users/:id", deleteAdminUser);

router.get("/scores", listAdminScores);
router.patch("/scores/:id", validateAdminScoreUpdatePayload, updateAdminScore);

router.get("/subscriptions", listAdminSubscriptions);
router.patch("/subscriptions/:id", validateAdminSubscriptionUpdatePayload, updateAdminSubscription);

router.get("/draws", listAdminDraws);
router.get("/draws/:drawId/winners", getAdminDrawWinners);
router.patch("/draws/:drawId/winners/:tier/:userId/payout", validateAdminPayoutPayload, markWinnerPayout);

router.get("/charities", listAdminCharities);

module.exports = router;
