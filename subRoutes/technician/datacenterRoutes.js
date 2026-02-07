const express = require("express");
const { getDataCenters, getEntriesByDataCenter, createEntry } = require("../../controllers/technician/datacenterController");
const { requireAuth } = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/upload");
const router = express.Router();

router.get("/", getDataCenters)
router.get("/:id/entries", getEntriesByDataCenter)
router.post("/", upload.array("bills"), createEntry)


module.exports = router;