const express = require("express");
const router = express.Router();
const Country = require("../../models/countryModel");
const FTPermission = require("../../models/ftPermissionModel");
const DataCenter = require("../../models/dataCenterModel");

// GET permitted countries only
router.get("/", async (req, res) => {
  try {

    const ftId = req.user.id; // Extracted from token

    // 1️⃣ Get all Data Center IDs this FT is permitted for
    // .select('dataCenterId') ensures we only fetch the ID field (very fast)
    const permissions = await FTPermission.find({ ftId })
      .select("dataCenterId")
      .lean();

    if (!permissions.length) {
      return res.json({ success: true, data: [] });
    }

    // Extract just the IDs into a simple array
    const permittedDcIds = permissions.map((p) => p.dataCenterId);

    // 2️⃣ Find distinct Country IDs from those Data Centers
    // .distinct() is heavily optimized in MongoDB
    const distinctCountryIds = await DataCenter.find({
      _id: { $in: permittedDcIds },
    }).distinct("country");

    // 3️⃣ Fetch the actual Country details
    const countries = await Country.find({ _id: { $in: distinctCountryIds } })
      .sort({ name: 1 })
      .lean();



    // Note: Changed Cache-Control to 'private' because the data now depends on the specific user (ftId)
    // You cannot use 'public' caching for personalized data.
    res.set('Cache-Control', 'private, max-age=300'); // Cache for 5 mins locally in browser


    res.json({ success: true, data: countries });

  } catch (error) {
    console.error("Error fetching permitted countries:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
