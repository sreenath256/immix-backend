const express = require("express");
const { getDailyWorkReports, getWorkSummaryMetrics, getDetailedWorkLogs, getDataCenterWorkSummary, getDataCenterDurationSummary } = require("../../controllers/admin/reportsController");

const router = express.Router();

// 1. Get Daily Work Reports (Paginated & Filtered)
router.get("/work-entries", getDailyWorkReports);

// 2. Get Work Summary Metrics (Dashboard)
router.get("/summary", getWorkSummaryMetrics);

// 3. Get Detailed Work Logs (Billing/Reports)
router.get("/logs", getDetailedWorkLogs);

// 4. Get Data Center Work Summary (Aggregated)
router.get("/datacenter-summary", getDataCenterWorkSummary);

// 5. Get Data Center Duration Summary (Standard vs Off-Standard)
router.get("/datacenter-duration", getDataCenterDurationSummary);

module.exports = router;
