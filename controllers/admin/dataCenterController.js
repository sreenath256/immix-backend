const DataCenter = require("../../models/dataCenterModel");

const createDataCenter = async (req, res) => {
    try {
        const {
            name,
            country,
            city,
            address,
            googleMapLink,
            locationType,
            commuteTimeInMinutes,
            isActive
        } = req.body;

        // Validate locationType rules
        let commuteTime = commuteTimeInMinutes;

        if (locationType === "within_city_limits") {
            commuteTime = 0;
        }

        const dc = await DataCenter.create({
            name,
            country,
            city,
            address,
            googleMapLink,
            locationType,
            commuteTimeInMinutes: commuteTime,
            isActive
        });

        res.json({ success: true, data: dc });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}


const getAllDataCenters = async (req, res) => {
    try {
        const { countryId, cityId, name, address, locationType, isActive, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        let filter = {};

        if (countryId) filter.country = countryId;
        if (cityId) filter.city = cityId;
        if (locationType) filter.locationType = locationType;
        if (isActive) filter.isActive = isActive;

        if (name) {
            filter.name = { $regex: name, $options: "i" };
        }

        if (address) {
            filter.address = { $regex: address, $options: "i" };
        }

        const [total, dcList] = await Promise.all([
            DataCenter.countDocuments(filter),
            DataCenter.find(filter)
                .populate("country", "name")
                .populate("city", "name")
                .sort({ name: 1 })
                .skip(skip)
                .limit(limitNum)
                .lean()
        ]);



        res.json({
            success: true,
            data: dcList,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

const getDataCenter = async (req, res) => {
    try {
        const dc = await DataCenter.findById(req.params.id)
            .populate("country")
            .populate("city");

        if (!dc) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        res.json({ success: true, data: dc });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

const updateDataCenter = async (req, res) => {
    try {
        const updates = req.body;

        // Reset commute if within city
        if (updates.locationType === "within_city_limits") {
            updates.commuteTimeInMinutes = 0;
        }

        const dc = await DataCenter.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        );

        res.json({ success: true, data: dc });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}


const deleteDataCenter = async (req, res) => {
    try {
        const dc = await DataCenter.findByIdAndDelete(req.params.id);

        if (!dc) {
            return res.status(404).json({ success: false, message: "Data center not found" });
        }

        res.json({ success: true, message: "Data center deleted", data: dc });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

const toggleDataCenterStatus = async (req, res) => {
    try {
        const dc = await DataCenter.findById(req.params.id);

        if (!dc) {
            return res.status(404).json({ success: false, message: "Data center not found" });
        }

        dc.isActive = !dc.isActive;
        await dc.save();

        const populatedDc = await DataCenter.findById(req.params.id)
            .populate("country", "name")
            .populate("city", "name");

        res.json({ success: true, message: `Data center ${populatedDc.isActive ? 'activated' : 'deactivated'}`, data: populatedDc });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

module.exports = {
    createDataCenter,
    getAllDataCenters,
    getDataCenter,
    updateDataCenter,
    deleteDataCenter,
    toggleDataCenterStatus
}