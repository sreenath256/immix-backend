const City = require("../../models/cityModel");


const getCities = async (req, res) => {
    try {
        const countryId = req.params.countryId || req.query.countryId;

        let filter = {};

        // If countryId exists → filter by country
        if (countryId) {
            filter.countryId = countryId;
        }

        const cities = await City.find(filter).sort({ name: 1 }).lean(); // 🚀 THIS IS THE MAGIC SPEED BOOST

        res.json({
            success: true,
            data: cities
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
}


module.exports = {
    getCities
}   