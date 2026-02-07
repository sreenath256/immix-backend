const ClientEngineer = require("../../models/clientEngineerModel");

const getClientEngineers = async (req, res) => {
    try {
        const clientId = req.params.clientId;

        if(!clientId){
            return res.status(400).json({ success: false, message: "Client ID is required" });
        }

        const clientEngineers = await ClientEngineer.find({ 
          company: clientId })
          .lean();
        
        
        res.status(200).json({
            success: true,
            clientEngineers,
        });

    } catch (err) {
        console.error("FT dashboard error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


module.exports = { getClientEngineers };
