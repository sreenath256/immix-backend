const mongoose = require("mongoose");

const ftPermissionSchema = new mongoose.Schema({
  ftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FieldTechnician",
    required: true
  },
  dataCenterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DataCenter",
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("FTPermission", ftPermissionSchema);
