const FTPermission = require("../../models/ftPermissionModel");
const ServiceEntry = require("../../models/serviceEntryModel");
const DataCenter = require("../../models/dataCenterModel");

const getDataCenters = async (req, res) => {
  try {
    const ftId = req.user.id;
    const { countryId, cityId } = req.query;

    // --- FIX 1 & 2: Filter Data Centers ---
    // Start with isActive: true requirement
    const dcMatchQuery = { isActive: true };

    // Append location filters if they exist
    if (countryId) dcMatchQuery.country = countryId;
    if (cityId) dcMatchQuery.city = cityId;

    const permissions = await FTPermission.find({ ftId })
      .populate({
        path: "dataCenterId",
        match: dcMatchQuery, // <--- Now checks Location AND isActive
        populate: [
          { path: "country" },
          { path: "city" }
        ]
      })
      .populate({
        path: "clientId",
        match: { isActive: true } // <--- FIX 3: Filter inactive Clients
      });

    const result = {};

    permissions.forEach(p => {
      const dc = p.dataCenterId;
      const client = p.clientId;

      // If DC is null (because it was Inactive or Country/City didn't match), skip it.
      if (!dc) return;

      // Grouping logic: create the DC entry if it doesn't exist yet
      if (!result[dc._id]) {
        result[dc._id] = {
          _id: dc._id,
          name: dc.name,
          country: dc.country,
          city: dc.city,
          clients: []
        };
      }

      // If Client is null (because it was Inactive), do not add it.
      if (client) {
        result[dc._id].clients.push({
          _id: client._id,
          name: client.name
        });
      }
    });


    res.json({
      success: true,
      dataCenters: Object.values(result),
    });

  } catch (err) {
    console.error("FT dashboard error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


const createEntry = async (req, res) => {
  try {
    const {
      dataCenterId,
      clientId,
      workType,
      referenceNo,
      additionalFTCount,
      additionalFTIds,
      clientEngineerId,
      entryTime,
      endTime,
      totalBillsExpense,
      workDescription,
    } = req.body;

    console.log("Files", req.files)
    console.log("Body", req.body)

    const ftId = req.user.id; // field technician from token

    let bills = [];
    if (req.files && req.files.length > 0) {
      bills = req.files.map((file) => file.path);
    }

    // 1. Fetch DataCenter to get country/city
    const dc = await DataCenter.findById(dataCenterId);
    if (!dc) {
      return res
        .status(404)
        .json({ success: false, message: "Data Center not found" });
    }

    // 2. Calculate durationHours
    // entryTime/endTime format "HH:mm" e.g. "09:00", "13:30"
    const [startH, startM] = entryTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let start = startH * 60 + startM;
    let end = endH * 60 + endM;

    // Handle crossing midnight (e.g. 23:00 to 01:00)
    if (end < start) {
      end += 24 * 60;
    }

    const durationMinutes = end - start;
    const durationHours = parseFloat((durationMinutes / 60).toFixed(2));

    // 3. Create ServiceEntry
    const entry = await ServiceEntry.create({
      ftId,
      date: new Date(), // or req.body.date if passed, assuming today for now
      country: dc.country,
      city: dc.city,

      dataCenterId,
      clientId,

      workType,
      referenceNo,

      additionalFTCount,
      additionalFTIds,

      clientEngineerId,

      entryTime,
      endTime,
      durationHours,

      totalBillsExpense,
      bills,

      workDescription,
    });

    res.status(201).json({ success: true, entry });
  } catch (err) {
    console.error("FT dashboard error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getEntriesByDataCenter = async (req, res) => {
  try {
    const ftId = req.user.id;
    const dataCenterId = req.params.id;

    const entries = await ServiceEntry.find({ ftId, dataCenterId });

    if (!entries) {
      return res.status(404).json({ success: false, message: "No entries found" });
    }

    res.status(200).json({
      success: true,
      entries
    });

    console.log(entries)
  } catch (err) {
    console.error("FT dashboard error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


module.exports = { getDataCenters, createEntry, getEntriesByDataCenter };
