const express = require("express");

const { addScore, listScores } = require("../controllers/scores.controller");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");
const { validateScoreCreatePayload } = require("../middleware/validate.middleware");

const router = express.Router();

router.get("/", protect, authorizeRoles("member", "admin"), listScores);
router.post("/", protect, authorizeRoles("member", "admin"), validateScoreCreatePayload, addScore);

module.exports = router;
