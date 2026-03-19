const express = require("express");
const { getDashboardSummary } = require("../../controllers/admin/dashboardController");

const router = express.Router();

router.get("/summary", getDashboardSummary);

module.exports = router;
