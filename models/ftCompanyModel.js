const mongoose = require("mongoose");

const ftCompanySchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String },
    email: { type: String },
    phone: { type: String },
   
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model("FTCompany", ftCompanySchema);
