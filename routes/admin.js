const express = require("express");
const countryRoutes = require("../subRoutes/admin/countryRoutes.js");
const cityRoutes = require("../subRoutes/admin/cityRoutes.js");
const dataCenterRoutes = require("../subRoutes/admin/dataCenterRoutes.js");
const clientRoutes = require("../subRoutes/admin/clientRoutes.js");
const fieldTechnicianRoutes = require("../subRoutes/admin/fieldTechnicianRoutes.js");
const ftCompanyRoutes = require("../subRoutes/admin/ftCompanyRoutes.js");
const clientEngineerRoutes = require("../subRoutes/admin/clientEngineerRoutes.js");
const clientPricingRoutes = require("../subRoutes/admin/clientPricingRoutes.js");
const clientDataCenterRoutes = require("../subRoutes/admin/clientDataCenterRoutes.js");
const reportsRoutes = require("../subRoutes/admin/reportsRoutes.js");

const router = express.Router();

router.use("/countries", countryRoutes)
router.use("/cities", cityRoutes)
router.use("/datacenters", dataCenterRoutes)
router.use("/clients", clientRoutes)
router.use("/fieldtechnicians", fieldTechnicianRoutes)
router.use("/ftcompanies", ftCompanyRoutes)
router.use("/clientengineers", clientEngineerRoutes)
router.use("/clientpricing", clientPricingRoutes)
router.use("/clientdatacenters", clientDataCenterRoutes)
router.use("/reports", reportsRoutes);


module.exports = router;
