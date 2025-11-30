const Ad = require("../models/Ad");

// GET ADS
const getAds = async (req, res) => {
  try {
    const position = req.query.position;
    let query = {};
    if (position) query.position = position;

    const ads = await Ad.find(query).sort({ position: 1, order: 1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// SAVE / UPDATE ADS
const saveAds = async (req, res) => {
  try {
    const ads = req.body; // [{content, position, order}]
    const positions = [...new Set(ads.map(ad => ad.position))];

    // Remove old ads in these positions
    await Ad.deleteMany({ position: { $in: positions } });

    // Insert new ads
    const inserted = await Ad.insertMany(
      ads.map(ad => ({
        content: ad.content,
        position: ad.position,
        order: ad.order || 0,
      }))
    );

    // RETURN INSERTED ADS BACK TO FRONTEND
    res.json({
      success: true,
      ads: inserted
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE ONE AD
const deleteAd = async (req, res) => {
  try {
    const deleted = await Ad.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Ad not found",
      });
    }

    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getAds, saveAds, deleteAd };
