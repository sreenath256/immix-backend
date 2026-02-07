const express = require("express");
const router = express.Router();

const Client = require("../../models/clientModel");
const ClientPricing = require("../../models/clientPricingModel");
const ClientDataCenter = require("../../models/clientDataCenterModel");
const { createClient, getAllClients, getClient, updateClient, deleteClient, toggleClientStatus } = require("../../controllers/admin/clientController");

//    CREATE CLIENT
router.post("/", createClient);

//    GET ALL CLIENTS
router.get("/", getAllClients);

//    GET SINGLE CLIENT BY ID
router.get("/:id", getClient);

//    UPDATE CLIENT
router.put("/:id", updateClient);

//    DEACTIVATE CLIENT (Soft Delete)
router.delete("/:id", deleteClient);

//    TOGGLE CLIENT STATUS
router.patch("/:id/toggle-status", toggleClientStatus);




//    REMOVE A DATA CENTER   FROM CLIENT
router.delete("/:clientId/datacenters/:dcId", async (req, res) => {
    try {
        const { clientId, dcId } = req.params;

        await ClientDataCenter.findOneAndDelete({
            clientId,
            dataCenterId: dcId
        });

        res.json({ success: true, message: "Mapping removed" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;
