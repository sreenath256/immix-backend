const express = require("express");
const router = express.Router();
const City = require("../../models/cityModel");
const FTPermission = require("../../models/ftPermissionModel");
const DataCenter = require("../../models/dataCenterModel");

// GET cities
router.get("/:countryId?", async (req, res) => {
    try {
        const ftId = req.user.id;
        const countryId = req.params.countryId || req.query.countryId;

        // 1️⃣ Get all Data Center IDs this FT is permitted for
        const permissions = await FTPermission.find({ ftId })
            .select("dataCenterId")
            .lean();

        if (!permissions.length) {
            return res.json({ success: true, data: [] });
        }

        const permittedDcIds = permissions.map((p) => p.dataCenterId);

        // 2️⃣ Build the query for Data Centers
        // We filter by permission AND country (if provided) at the same time
        let dcQuery = { _id: { $in: permittedDcIds } };

        if (countryId) {
            dcQuery.country = countryId;
        }

        // 3️⃣ Get distinct City IDs from the filtered Data Centers
        // This finds ONLY cities that have a DC the user is allowed to access
        const distinctCityIds = await DataCenter.find(dcQuery).distinct("city");

        // 4️⃣ Fetch the actual City details
        const cities = await City.find({ _id: { $in: distinctCityIds } })
            .sort({ name: 1 })
            .lean();

        // Cache control: Private because it depends on the user's permissions
        res.set('Cache-Control', 'private, max-age=300');

        res.json({
            success: true,
            data: cities
        });

    } catch (error) {
        console.error("Error fetching permitted cities:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;
