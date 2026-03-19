const express = require("express");
const { getDailyWorkReports, getWorkSummaryMetrics, getDetailedWorkLogs, getDataCenterWorkSummary, getDataCenterDurationSummary, getFieldTechniciansWorkSummary, getClientBillingReport, getTechnicianPayroll } = require("../../controllers/admin/reportsController");

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

// 6. Get Field Technician Work Summary (Aggregated)
router.get("/field-technician-summary", getFieldTechniciansWorkSummary);

// 7. Get Client Billing Report
router.get("/client-billing", getClientBillingReport);

// 8. Get Technician Payroll
router.get("/technician-payroll", getTechnicianPayroll);

module.exports = router;
