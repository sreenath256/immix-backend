const express = require("express");
const {
    getAllClientPricings,
    getClientPricing,
    createClientPricing,
    updateClientPricing,
    deleteClientPricing
} = require("../../controllers/admin/clientPricingController");

const router = express.Router();

router.get("/", getAllClientPricings);
router.get("/:id", getClientPricing);
router.post("/", createClientPricing);
router.put("/:id", updateClientPricing);
router.delete("/:id", deleteClientPricing);

module.exports = router;
