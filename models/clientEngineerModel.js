const mongoose = require("mongoose");

const clientEngineerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model("ClientEngineer", clientEngineerSchema);
