const express = require("express");

const { listUsers, createUser, updateMyCharity } = require("../controllers/users.controller");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, authorizeRoles("admin"), listUsers);
router.post("/", protect, authorizeRoles("admin"), createUser);
router.patch("/me/charity", protect, updateMyCharity);

module.exports = router;
