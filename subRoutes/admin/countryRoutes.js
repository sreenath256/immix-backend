const express = require("express");
const router = express.Router();
const Country = require("../../models/countryModel");

// GET all countries
router.get("/", async (req, res) => {
  try {
    const countries = await Country.find().sort({ name: 1 }).lean(); // 🚀 THIS IS THE MAGIC SPEED BOOST

    // res.set('Cache-Control', 'public, max-age=86400');
    res.json({ success: true, data: countries });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
