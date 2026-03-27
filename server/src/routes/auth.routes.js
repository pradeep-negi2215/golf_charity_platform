const express = require("express");

const {
	register,
	registerAdmin,
	login,
	forgotPassword,
	resetPassword,
	changePassword,
	guestLogin,
	refresh,
	logout,
	me,
	bootstrapAdmin
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const {
	validateRegisterPayload,
	validateLoginPayload,
	validateForgotPasswordPayload,
	validateResetPasswordPayload,
	validateChangePasswordPayload,
	validateBootstrapAdminPayload
} = require("../middleware/validate.middleware");

const router = express.Router();

router.post("/register", validateRegisterPayload, register);
router.post("/register-admin", registerAdmin);
router.post("/bootstrap-admin", validateBootstrapAdminPayload, bootstrapAdmin);
router.post("/login", validateLoginPayload, login);
router.post("/forgot-password", validateForgotPasswordPayload, forgotPassword);
router.post("/reset-password", validateResetPasswordPayload, resetPassword);
router.post("/change-password", protect, validateChangePasswordPayload, changePassword);
router.post("/guest-login", guestLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, me);

module.exports = router;
