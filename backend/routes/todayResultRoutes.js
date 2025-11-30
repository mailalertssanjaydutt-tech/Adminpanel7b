const express = require("express");
const router = express.Router();
const todayResultController = require("../controllers/todayResultController");

// Route to get latest result by game name
router.get("/result/:gameName", todayResultController.getLatestResult);

module.exports = router;
