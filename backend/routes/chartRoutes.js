const express = require("express");
const router = express.Router();
const chartController = require("../controllers/chartController");

// ---------------------------------------------------
// Fetch all games (public)
// ---------------------------------------------------
router.get("/games", chartController.getGames);

// ---------------------------------------------------
// Get monthly chart (requires ?year=&month=)
// ---------------------------------------------------
router.get("/charts/:gameId", chartController.getChart);

// ---------------------------------------------------
// Get full yearly chart by game name (?year=)
// ---------------------------------------------------
router.get("/charts/yearly/:gameName", chartController.getYearlyChartUpToYesterday);

// ---------------------------------------------------
// Save entire month chart (Excel Upload / Bulk Save)
// ---------------------------------------------------
router.post("/charts/:gameId", chartController.saveChart);

// ---------------------------------------------------
// Update a single day (inline editing)
// ---------------------------------------------------
router.patch("/charts/:gameId/day", chartController.updateDay);

// ---------------------------------------------------
// Delete a specific day
// ---------------------------------------------------
router.delete("/charts/:gameId/day", chartController.deleteDay);

// ---------------------------------------------------
// Delete entire chart for month (?year=&month=)
// ---------------------------------------------------
router.delete("/charts/:gameId", chartController.deleteChart);

module.exports = router;
