const express = require("express");
const router = express.Router();

const {
  createFieldTechnician,
  getAllFieldTechnicians,
  getFtWithPermissions,
  updateFieldTechnician,
  deleteTechnician,
  addAccess,
  removeAccess,
  getFieldTechnicianPermissions,
  toggleFieldTechnicianStatus
} = require("../../controllers/admin/fieldTechnicianController");

// CREATE FIELD TECHNICIAN (with permissions)
router.post("/", createFieldTechnician);

// GET ALL FIELD TECHNICIANS
router.get("/", getAllFieldTechnicians);

// GET SINGLE FT WITH PERMISSIONS
router.get("/:id", getFtWithPermissions);

// GET ONLY PERMISSIONS FOR FT
router.get("/:id/permissions", getFieldTechnicianPermissions);

// UPDATE FIELD TECHNICIAN (with full permission replace support)
router.put("/:id", updateFieldTechnician);

// UPDATE FIELD TECHNICIAN STATUS
router.patch("/:id/toggle-status", toggleFieldTechnicianStatus);

// DEACTIVATE TECHNICIAN
router.delete("/:id", deleteTechnician);

// ADD ACCESS (DC + CLIENT)
router.post("/:ftId/access", addAccess);

// REMOVE ACCESS
router.delete("/:ftId/access/:permissionId", removeAccess);

module.exports = router;
