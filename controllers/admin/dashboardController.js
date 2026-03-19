const ServiceEntry = require("../../models/serviceEntryModel");
const Client = require("../../models/clientModel");
const DataCenter = require("../../models/dataCenterModel");

// @desc    Get dashboard metrics
// @route   GET /api/admin/dashboard/summary
// @access  Private/Admin
const getDashboardSummary = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [todayEntries, totalClients, activeDataCenters] = await Promise.all([
            ServiceEntry.countDocuments({
                date: {
                    $gte: today,
                    $lt: tomorrow
                }
            }),
            Client.countDocuments(),
            DataCenter.countDocuments({ isActive: true })
        ]);

        res.json({
            success: true,
            data: {
                todayEntries,
                totalClients,
                activeDataCenters
            }
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard statistics",
            error: error.message
        });
    }
};

module.exports = {
    getDashboardSummary
};
