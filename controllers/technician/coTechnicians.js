const Technician = require("../../models/fieldTechnicianModel");

const getCoTechnicians = async (req, res) => {
    try {
        const ftId = req.user.id;

        const technician = await Technician.findOne({ _id: ftId, isActive: true }).lean();

        if (!technician) {
            return res.status(404).json({ success: false, message: "Technician not found" });
        }

        const coTechnicians = await Technician.find({
            companyId: technician.companyId,
            _id: { $ne: ftId },
            isActive: true
        }).select("name").lean();

        res.status(200).json({
            success: true,
            coTechnicians,
        });

    } catch (err) {
        console.error("FT dashboard error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


module.exports = { getCoTechnicians };