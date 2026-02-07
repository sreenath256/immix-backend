const mongoose = require("mongoose");

const serviceEntrySchema = new mongoose.Schema({
  ftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FieldTechnician",
    required: true
  },

  date: { type: Date, required: true },

  country: { type: mongoose.Schema.Types.ObjectId, ref: "Country", required: true },
  city: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true },

  dataCenterId: { type: mongoose.Schema.Types.ObjectId, ref: "DataCenter", required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },

  workType: { type: String, enum: ["Project", "Maintenance", "Others"], required: true },

  referenceNo: { type: String },

  additionalFTCount: { type: Number, default: 0 },

  additionalFTIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "FieldTechnician" }],

  clientEngineerId: { type: mongoose.Schema.Types.ObjectId, ref: "ClientEngineer" },

  entryTime: { type: String, required: true }, // 09:00
  endTime: { type: String, required: true },   // 13:30

  totalBillsExpense: { type: Number, default: 0 },

  bills: [{ type: String }], // file URLs

  workDescription: { type: String },

}, { timestamps: true });

module.exports = mongoose.model("ServiceEntry", serviceEntrySchema);
