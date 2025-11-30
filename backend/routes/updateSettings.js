const express = require("express");
const router = express.Router();
const { updateSettings } = require("../controllers/updateSettings");
const { protect } = require("../middleware/authMiddleware");

router.put("/settings", protect, updateSettings);

module.exports = router;
