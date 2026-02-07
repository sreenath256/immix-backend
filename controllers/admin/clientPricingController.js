const ClientPricing = require("../../models/clientPricingModel");

// GET ALL PRICINGS (Optional filters: clientId, countryId)
const getAllClientPricings = async (req, res) => {
    try {
        const { clientId, countryId, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        let filter = {};
        if (clientId) filter.clientId = clientId;
        if (countryId) filter.countryId = countryId;

        const [total, pricings] = await Promise.all([
            ClientPricing.countDocuments(filter),
            ClientPricing.find(filter)
                .populate("clientId", "name")
                .populate("countryId", "name")
                .skip(skip)
                .limit(limitNum)
                .lean()
        ]);

        res.json({
            success: true,
            data: pricings,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// GET SINGLE PRICING
const getClientPricing = async (req, res) => {
    try {
        const pricing = await ClientPricing.findById(req.params.id)
            .populate("clientId", "name")
            .populate("countryId", "name");

        if (!pricing) {
            return res.status(404).json({ success: false, message: "Client Pricing not found" });
        }

        res.json({ success: true, data: pricing });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// CREATE PRICING
const createClientPricing = async (req, res) => {
    try {
        const newPricing = await ClientPricing.create(req.body);
        res.json({ success: true, data: newPricing });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// UPDATE PRICING
const updateClientPricing = async (req, res) => {
    try {
        const pricing = await ClientPricing.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!pricing) {
            return res.status(404).json({ success: false, message: "Client Pricing not found" });
        }

        res.json({ success: true, data: pricing });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// DELETE PRICING
const deleteClientPricing = async (req, res) => {
    try {
        const pricing = await ClientPricing.findByIdAndDelete(req.params.id);

        if (!pricing) {
            return res.status(404).json({ success: false, message: "Client Pricing not found" });
        }

        res.json({ success: true, message: "Client Pricing deleted", data: pricing });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    getAllClientPricings,
    getClientPricing,
    createClientPricing,
    updateClientPricing,
    deleteClientPricing
};
