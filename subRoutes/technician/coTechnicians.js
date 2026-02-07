const express = require("express");
const router = express.Router();
const { getCoTechnicians } = require("../../controllers/technician/coTechnicians");


router.get("/",getCoTechnicians)


module.exports = router;