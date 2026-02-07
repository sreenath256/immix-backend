const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  isoCode: { type: String, required: true, unique: true }, // e.g., 'IN', 'US'
  phoneCode: { type: String },
  currency: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Country", countrySchema);
