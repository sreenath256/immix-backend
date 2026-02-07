const express = require("express");
const {
    getAllClientDataCenters,
    getClientDataCenter,
    createClientDataCenter,
    updateClientDataCenter,
    deleteClientDataCenter
} = require("../../controllers/admin/clientDataCenterController");

const router = express.Router();

router.get("/", getAllClientDataCenters);
router.get("/:id", getClientDataCenter);
router.post("/", createClientDataCenter);
router.put("/:id", updateClientDataCenter);
router.delete("/:id", deleteClientDataCenter);

module.exports = router;