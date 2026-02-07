const express = require("express");
const upload = require("../middlewares/upload");

const countryRoutes = require("../subRoutes/technician/countryRoutes");
const cityRoutes = require("../subRoutes/technician/cityRoutes");
const serviceEntryRoutes = require("../subRoutes/technician/serviceEntryRoutes");
const dataCenterRoutes = require("../subRoutes/technician/datacenterRoutes");
const coTechnicians = require("../subRoutes/technician/coTechnicians");
const clientEngineer = require("../subRoutes/technician/clientEngineer.js");
const editProfile = require("../subRoutes/technician/editProfile.js");

const router = express.Router();




router.use("/countries", countryRoutes)
router.use("/cities", cityRoutes)
router.use("/data-centers", dataCenterRoutes)
router.use("/service-entry", serviceEntryRoutes);
router.use("/co-technicians",coTechnicians)
router.use("/client-engineers",clientEngineer)
router.use("/edit-profile",upload.single("profile"), editProfile)



module.exports = router;
