const express = require("express");
const { loginUser, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Login route
router.post("/login", loginUser);

// Current user route (protected)
router.get("/me", protect, getMe);

module.exports = router;
