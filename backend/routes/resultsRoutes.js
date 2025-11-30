const express = require("express");
const router = express.Router();
const resultsController = require("../controllers/resultsController");

// Route for recent results must come first
router.get("/recent", resultsController.getRecentResults);

// Routes for a specific game
router.get("/:gameId", resultsController.getResults);
router.post("/:gameId", resultsController.postResult);
router.delete("/:gameId/:resultId", resultsController.deleteResult);

module.exports = router;
