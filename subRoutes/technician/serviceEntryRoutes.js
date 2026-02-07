const express = require("express");
const { createServiceEntry, getAllServiceEntry, updateServiceEntry } = require("../../controllers/technician/serviceEntryController");
const upload = require("../../middlewares/upload");
const router = express.Router();


// CREATE SERVICE ENTRY COMPANY
router.post("/",upload.array("bills"), createServiceEntry);

// GET ALL SERVICE ENTRY
router.get("/", getAllServiceEntry);

// UPDATE SERVICE ENTRY
router.put("/:id",upload.array("bills"), updateServiceEntry);




module.exports = router;