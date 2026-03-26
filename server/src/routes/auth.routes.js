const express = require("express");

const { register, login, refresh, logout, me, bootstrapAdmin } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const {
	validateRegisterPayload,
	validateLoginPayload,
	validateBootstrapAdminPayload
} = require("../middleware/validate.middleware");

const router = express.Router();

router.post("/register", validateRegisterPayload, register);
router.post("/bootstrap-admin", validateBootstrapAdminPayload, bootstrapAdmin);
router.post("/login", validateLoginPayload, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, me);

module.exports = router;
