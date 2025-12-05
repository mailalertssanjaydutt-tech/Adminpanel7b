const express = require("express");
const router = express.Router();
const todayResultController = require("../controllers/todayResultController");

// existing single-game endpoint
router.get("/result/:gameName", todayResultController.getLatestResult);

// new aggregated endpoint used by client: /api/upcoming?limit=3
router.get("/upcoming", todayResultController.getUpcoming);

module.exports = router;
