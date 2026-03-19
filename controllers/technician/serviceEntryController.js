const ServiceEntry = require("../../models/serviceEntryModel");
const FTPermission = require("../../models/ftPermissionModel");
const DataCenter = require("../../models/dataCenterModel");
const Client = require("../../models/clientModel");


// 🔥 Helper to calculate duration (HH:mm → decimal hours)
function calculateDuration(entry, end) {
  const [eh, em] = entry.split(":").map(Number);
  const [xh, xm] = end.split(":").map(Number);

  let startMins = eh * 60 + em;
  let endMins = xh * 60 + xm;

  if (endMins < startMins) {
    // next-day shift handling (rare but correct)
    endMins += 24 * 60;
  }

  return (endMins - startMins) / 60;
}


// -----------------------------------------------------------
// CREATE SERVICE ENTRY (FT)
// -----------------------------------------------------------
const createServiceEntry = async (req, res) => {
  try {
    const ftId = req.user.id;
    const {
      date, country, city, dataCenterId, clientId,
      workType, referenceNo, additionalFTCount,
      additionalFTIds, clientEngineerId, entryTime,
      endTime, standardDuration, offStandardDuration, totalDuration, totalBillsExpense, workDescription
    } = req.body;

    console.log(req.body)

    // 1️⃣ Calculate Total Man-Hours
    const start = new Date(`${date}T${entryTime}`);
    const end = new Date(`${date}T${endTime}`);

    // Calculate difference in hours
    // (end - start) gives milliseconds, divide by 3.6e+6 to get decimal hours
    const durationInHours = (end - start) / (1000 * 60 * 60);

    // Total people = Main FT (1) + Additional FTs
    const totalStaff = 1 + (Number(additionalFTCount) || 0);
    const totalManHours = durationInHours * totalStaff;

    // 2️⃣ Process Files
    let billUrls = [];
    if (req.files && req.files.length > 0) {
      billUrls = req.files.map((file) => {
        return `${process.env.R2_PUBLIC_ENDPOINT}/${encodeURIComponent(file.key || file.originalname)}`;
      });
    }

    // 3️⃣ Check Permissions
    const permissionExists = await FTPermission.findOne({ ftId, dataCenterId, clientId });
    if (!permissionExists) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission for this Data Center and Client"
      });
    }

    // 4️⃣ Save entry (Adding the calculated hours)
    const entry = await ServiceEntry.create({
      ftId,
      date,
      country,
      city,
      dataCenterId,
      clientId,
      workType,
      referenceNo,
      additionalFTCount,
      additionalFTIds,
      clientEngineerId,
      entryTime,
      endTime,
      standardDuration,
      offStandardDuration,
      totalDuration,
      totalBillsExpense,
      workDescription,
      bills: billUrls,
      totalManHours: totalManHours.toFixed(2) // Adding this to your schema
    });

    await entry.populate("country city clientId clientEngineerId");
    await entry.populate("additionalFTIds", "name");

    res.status(201).json({ success: true, message: "Service entry created", data: entry });

  } catch (err) {
    console.error("Service Entry Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// -----------------------------------------------------------
// GET ALL SERVICE ENTRY (FT)
// -----------------------------------------------------------
const getAllServiceEntry = async (req, res) => {
  try {
    const ftId = req.user.id;
    const { dataCenterId, startDate, endDate, ticket } = req.query;

    let query = { ftId };

    if (dataCenterId) {
      query.dataCenterId = dataCenterId;
    }

    // ✅ ENHANCED DATE FILTERING
    if (startDate || endDate) {
      query.date = {};

      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start)) { // Check if valid date
          start.setUTCHours(0, 0, 0, 0);
          query.date.$gte = start;
        }
      }

      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end)) {
          // Move to the next day at 00:00:00 UTC
          end.setUTCHours(24, 0, 0, 0); // Shorthand for "Next Day, Midnight"
          query.date.$lt = end;
        }
      }

      // Cleanup: If dates were invalid, remove the empty date object
      if (Object.keys(query.date).length === 0) delete query.date;
    }

    if (ticket) {
      query.referenceNo = { $regex: ticket, $options: "i" };
    }

    // Execute query with lean() for better performance if you only need JSON
    const entries = await ServiceEntry.find(query)
      .sort({ createdAt: -1 })
      .populate("country city clientId clientEngineerId") // Combined string for clarity
      .populate("additionalFTIds", "name")
      .lean(); // Faster execution if you don't need Mongoose magic methods

    res.json({ success: true, count: entries.length, data: entries });

  } catch (err) {
    console.error("Service Entry Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// -----------------------------------------------------------
// UPDATE SERVICE ENTRY (FT)
// -----------------------------------------------------------
const updateServiceEntry = async (req, res) => {
  try {
    const entryId = req.params.id;
    const ftId = req.user.id;

    // Verify entry exists and user owns it
    const existingEntry = await ServiceEntry.findOne({ _id: entryId, ftId: ftId });
    if (!existingEntry) {
      return res.status(404).json({ success: false, message: "Entry not found or unauthorized" });
    }

    console.log("--- Update Request Body ---");
    console.log(JSON.stringify(req.body, null, 2));

    // Basic Update Data
    const updateData = {
      date: req.body.date,
      country: req.body.country,
      city: req.body.city,
      dataCenterId: req.body.dataCenterId,
      clientId: req.body.clientId,
      clientEngineerId: req.body.clientEngineerId || null,
      workType: req.body.workType,
      referenceNo: req.body.referenceNo,
      additionalFTCount: Number(req.body.additionalFTCount || 0),
      entryTime: req.body.entryTime,
      endTime: req.body.endTime,
      totalDuration: req.body.totalDuration,
      totalBillsExpense: Number(req.body.totalBillsExpense || 0),
      workDescription: req.body.workDescription,
    };

    // Handle Technician Arrays
    if (req.body.additionalFTIds) {
      updateData.additionalFTIds = Array.isArray(req.body.additionalFTIds)
        ? req.body.additionalFTIds
        : [req.body.additionalFTIds];
    } else {
      updateData.additionalFTIds = [];
    }

    // ✅ FIXED: Image Handling Logic
    // 1. Start with an empty list
    let finalBills = [];

    // 2. Add Existing URLs (Kept Images) from req.body.bills
    // Multer puts text fields with the same key into req.body
    if (req.body.bills) {
      if (Array.isArray(req.body.bills)) {
        // If multiple URLs are sent
        finalBills = [...req.body.bills];
      } else {
        // If only one URL is sent (it comes as a string)
        finalBills.push(req.body.bills);
      }
    }

    // 3. Add New Files (New Images) from req.files
    if (req.files && req.files.length > 0) {
      const newBillUrls = req.files.map((file) => {
        return `${process.env.R2_PUBLIC_ENDPOINT}/${encodeURIComponent(file.key || file.originalname)}`;
      });
      finalBills = [...finalBills, ...newBillUrls];
    }

    // 4. Assign the combined list to the update object
    // If both are empty, this becomes [] which correctly removes all images.
    updateData.bills = finalBills;


    // Update the database
    const entry = await ServiceEntry.findOneAndUpdate(
      { _id: entryId, ftId: ftId },
      updateData,
      { new: true }
    );

    await entry.populate("country city clientId clientEngineerId");
    await entry.populate("additionalFTIds", "name");

    res.json({ success: true, data: entry });

  } catch (err) {
    console.error("Service Entry Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = { createServiceEntry, getAllServiceEntry, updateServiceEntry };
