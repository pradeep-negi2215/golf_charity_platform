const express = require("express");

const {
  listCharities,
  getCharityById,
  createCharity,
  updateCharity,
  deleteCharity
} = require("../controllers/charities.controller");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");
const { validateCharityPayload } = require("../middleware/validate.middleware");

const router = express.Router();

router.get("/", listCharities);
router.get("/:id", getCharityById);

router.post("/", protect, authorizeRoles("admin"), validateCharityPayload, createCharity);
router.put("/:id", protect, authorizeRoles("admin"), validateCharityPayload, updateCharity);
router.delete("/:id", protect, authorizeRoles("admin"), deleteCharity);

module.exports = router;
