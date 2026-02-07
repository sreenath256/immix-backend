const express = require("express");
const router = express.Router();
const { getClientEngineers } = require("../../controllers/technician/clientEngineer.js");


router.get("/:clientId",getClientEngineers)



module.exports = router;