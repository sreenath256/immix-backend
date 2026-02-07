const express = require("express");
const { createFTCompany, getAllFTCompanies, getFTCompany, updateFTCompany, toggleFTCompanyStatus } = require("../../controllers/admin/ftCompanyController");
const router = express.Router();


// CREATE FIELD TECHNICIAN COMPANY
router.post("/", createFTCompany);

// GET ALL FIELD TECHNICIANS COMPANY
router.get("/", getAllFTCompanies);

// GET SINGLE FT COMPANY
router.get("/:id", getFTCompany);

// UPDATE FIELD TECHNICIAN COMPANY
router.put("/:id", updateFTCompany);

// DEACTIVATE TECHNICIAN COMPANY
router.patch("/:id/toggle-status", toggleFTCompanyStatus);




module.exports = router;
