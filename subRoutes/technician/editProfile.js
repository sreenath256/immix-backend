const express = require("express");
const router = express.Router();
const FieldTechnician = require("../../models/fieldTechnicianModel");

// Edit field technician profile
router.put("/", async (req, res) => {
    try {
        console.log("Edit Profile");
        console.log(req.body);

        const ftId = req.user.id; // Extracted from token

        const { name, mobile, email } = req.body;

        let updateData = { name, mobile, email };

        console.log(req.file)
        // Handle Profile Image Upload
        if (req.file) {
            updateData.profileImg = `${process.env.R2_PUBLIC_ENDPOINT}/${encodeURIComponent(req.file.key || req.files.originalname)}`;
        }

        const ft = await FieldTechnician.findByIdAndUpdate(ftId, updateData, { new: true });

        if (!ft) {
            return res.status(404).json({ success: false, message: "Field Technician not found" });
        }

        res.json({ success: true, data: ft });

    } catch (error) {
        console.error("Error editing profile:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;
