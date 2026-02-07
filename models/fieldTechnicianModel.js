const mongoose = require("mongoose");

const fieldTechnicianSchema = new mongoose.Schema({

    technicianId: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    // Technician name
    name: {
        type: String,
        required: true,
        trim: true
    },

    // Mobile number
    mobile: {
        type: String,
        required: true,
        trim: true
    },

    // Email
    email: {
        type: String,
        trim: true
    },

    // Address field (new)
    address: {
        type: String,
        trim: true
    },

    // Profile Image
    profileImg: {
        type: String,
        default: null
    },

    // Technician company (null = individual)
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FTCompany",
        default: null
    },

    // Base location
    country: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Country",
        required: true
    },

    city: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "City",
        required: true
    },

    // Billing currency (INR / USD / AED etc.)
    pricingCurrency: {
        type: String,
        required: true
    },

    // Standard Hourly Price
    standardRate: {
        type: Number,
        required: true
    },

    // Off Standard Price settings
    offStandardRate: {
        type: Number,
        required: true
    },

    isCommuteProvided: {
        type: Boolean,
        default: false,
        required: true
    },
    role: {
        type: String,
        default: "technician"
    },

    // FT Active or not
    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

module.exports = mongoose.model("FieldTechnician", fieldTechnicianSchema);
