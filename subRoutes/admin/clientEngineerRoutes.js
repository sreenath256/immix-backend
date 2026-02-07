const express = require("express");
const router = express.Router();
const { createClientEngineer, getAllClientEngineers, getClientEngineer, updateClientEngineer, deleteClientEngineer, toggleClientEngineerStatus } = require("../../controllers/admin/clientEngineerController");


// CREATE CLIENT ENGINEER
router.post("/", createClientEngineer);

// GET ALL CLIENT ENGINEERS
router.get("/", getAllClientEngineers);

// GET SINGLE CLIENT ENGINEER
router.get("/:id", getClientEngineer);

// UPDATE CLIENT ENGINEER
router.put("/:id", updateClientEngineer);


// DELETE CLIENT ENGINEER
router.delete("/:id", deleteClientEngineer);

// ACTIVATE CLIENT ENGINEER (optional)
router.patch("/:id/toggle-status", toggleClientEngineerStatus);



module.exports = router;
