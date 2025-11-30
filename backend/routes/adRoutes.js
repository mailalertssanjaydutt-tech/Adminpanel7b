const express = require("express");
const { getAds, saveAds, deleteAd } = require("../controllers/adController.js");

const router = express.Router();

// Get all ads
router.get("/", getAds);

// Save/update ads
router.post("/", saveAds);

// Delete ONE ad by ID
router.delete("/:id", deleteAd);

module.exports = router;
