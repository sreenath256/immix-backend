const mongoose = require("mongoose");

const clientPricingSchema = new mongoose.Schema({

  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  },

  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    required: true
  },

  standardHourlyRate: {
    type: Number,
    required: true
  },

  offStandardHourlyRate: {
    type: Number,
    required: true
  },

  commuteHourlyRate: {
    type: Number,
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("ClientPricing", clientPricingSchema);
