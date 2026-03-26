const express = require("express");

const { runMonthlyDraw, getLatestMonthlyDraw, getMonthlyDrawHistory } = require("../controllers/draws.controller");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/monthly/latest", protect, authorizeRoles("member", "admin"), getLatestMonthlyDraw);
router.get("/monthly/history", protect, authorizeRoles("member", "admin"), getMonthlyDrawHistory);
router.post("/monthly/run", protect, authorizeRoles("admin"), runMonthlyDraw);

module.exports = router;
