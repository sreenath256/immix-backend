const express = require("express");
const router = express.Router();
const { getCities } = require("../../controllers/admin/cityController");

// GET cities
router.get("/:countryId?", getCities);

module.exports = router;
