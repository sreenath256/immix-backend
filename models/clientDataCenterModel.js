const mongoose = require("mongoose");

const clientDataCenterSchema = new mongoose.Schema({

  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  },

  dataCenterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DataCenter",
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("ClientDataCenter", clientDataCenterSchema);
