const mongoose = require("mongoose");

const dataCenterSchema = new mongoose.Schema({
  // Data Center Name
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Country (reference)
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    required: true
  },

  // City (reference)
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
    required: true
  },

  // Address
  address: {
    type: String,
    trim: true
  },

  // Google Maps Link
  googleMapLink: {
    type: String,
    trim: true
  },

  // Within city or out of city
  locationType: {
    type: String,
    enum: ["within_city_limits", "outside_city_limits"],
    required: true
  },

  // Only required when locationType == "outside_city_limits"
  // Example: 2 hours 30 mins = 150
  commuteTimeInMinutes: {
    type: Number,
    default: 0
  },

  // Data Center Active or not
  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model("DataCenter", dataCenterSchema);
