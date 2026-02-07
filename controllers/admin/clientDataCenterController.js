const ClientDataCenter = require("../../models/clientDataCenterModel");

// GET ALL CLIENT DATA CENTERS (Optional filters: clientId, dataCenterId)
const getAllClientDataCenters = async (req, res) => {
    try {
        const { clientId, dataCenterId, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        let filter = {};
        if (clientId) filter.clientId = clientId;
        if (dataCenterId) filter.dataCenterId = dataCenterId;

        const [total, links] = await Promise.all([
            ClientDataCenter.countDocuments(filter),
            ClientDataCenter.find(filter)
                .populate("clientId", "name")
                .populate("dataCenterId", "name")
                .skip(skip)
                .limit(limitNum)
                .lean()
        ]);

        res.json({
            success: true,
            data: links,
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

// GET SINGLE LINK
const getClientDataCenter = async (req, res) => {
    try {
        const link = await ClientDataCenter.findById(req.params.id)
            .populate("clientId", "name")
            .populate("dataCenterId", "name");

        if (!link) {
            return res.status(404).json({ success: false, message: "Client Data Center link not found" });
        }

        res.json({ success: true, data: link });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// CREATE LINK
const createClientDataCenter = async (req, res) => {
    try {
        const newLink = await ClientDataCenter.create(req.body);
        res.json({ success: true, data: newLink });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// UPDATE LINK (Rarely used, usually delete and recreate, but good to have)
const updateClientDataCenter = async (req, res) => {
    try {
        const link = await ClientDataCenter.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!link) {
            return res.status(404).json({ success: false, message: "Client Data Center link not found" });
        }

        res.json({ success: true, data: link });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// DELETE LINK
const deleteClientDataCenter = async (req, res) => {
    try {
        const link = await ClientDataCenter.findByIdAndDelete(req.params.id);

        if (!link) {
            return res.status(404).json({ success: false, message: "Client Data Center link not found" });
        }

        res.json({ success: true, message: "Client Data Center link deleted", data: link });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    getAllClientDataCenters,
    getClientDataCenter,
    createClientDataCenter,
    updateClientDataCenter,
    deleteClientDataCenter
};
