const express = require("express");
const { createDataCenter, getAllDataCenters, getDataCenter, updateDataCenter, deleteDataCenter, toggleDataCenterStatus } = require("../../controllers/admin/dataCenterController");
const router = express.Router();

// CREATE Data Center
router.post("/", createDataCenter)

// GET all Data Centers (optional filters)
router.get("/", getAllDataCenters)

// GET single Data Center
router.get("/:id", getDataCenter)

// UPDATE Data Center
router.put("/:id", updateDataCenter)

// TOGGLE Data Center Status
router.patch("/:id/toggle-status", toggleDataCenterStatus)

// DELETE (soft delete by setting isActive = false)
router.delete("/:id", deleteDataCenter)

module.exports = router;
