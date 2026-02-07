const mongoose = require("mongoose");

const citySchema = new mongoose.Schema({
  name: { type: String, required: true },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    required: true
  },
  stateCode: { type: String },
  latitude: { type: String },
  longitude: { type: String }

}, { timestamps: true });

// Prevent duplicate cities in the same country
citySchema.index({ name: 1, countryId: 1 }, { unique: true });
citySchema.index({ countryId: 1 });

module.exports = mongoose.model("City", citySchema);
