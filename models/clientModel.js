const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({

  // Client Name
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  // Registered Country
  registeredCountry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    required: true
  },

  // Registered City
  registeredCity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
    required: true
  },

  // Full Address
  address: {
    type: String,
    required: true,
    trim: true
  },

  // Pincode
  pincode: {
    type: String,
    required: true,
    trim: true
  },

  // Official email
  email: {
    type: String,
    required: true,
    trim: true
  },

  // Phone Number
  phone: {
    type: String,
    required: true,
    trim: true
  },

  // Active / Inactive
  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Client", clientSchema);
