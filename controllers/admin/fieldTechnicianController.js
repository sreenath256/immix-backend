const mongoose = require("mongoose");
const FieldTechnician = require("../../models/fieldTechnicianModel");
const FTPermission = require("../../models/ftPermissionModel");
const ClientDataCenter = require("../../models/clientDataCenterModel");
const bcrypt = require("bcrypt");


/**
 * Helper: validate permissions array.
 * permissions = [{ dataCenterId, clientId }]
 * Returns { valid: true, invalid: [] } or { valid: false, invalid: [...] }
 */

// auto generate technicianId like FT001
async function generateTechnicianId() {
  const count = await FieldTechnician.countDocuments();
  const number = (count + 1).toString().padStart(3, "0");
  return `FT${number}`;
}

// auto generate password
function generatePassword() {
  return "FTIM" + Math.floor(1000 + Math.random() * 9000); // FT1234
}



async function validatePermissions(permissions = []) {
  const invalid = [];

  for (const p of permissions) {
    if (!p.dataCenterId || !p.clientId) {
      invalid.push({ reason: "missing_fields", item: p });
      continue;
    }

    const mapping = await ClientDataCenter.findOne({
      clientId: p.clientId,
      dataCenterId: p.dataCenterId
    });

    if (!mapping) {
      invalid.push({
        reason: "client_not_in_datacenter",
        item: p
      });
    }
  }

  return { valid: invalid.length === 0, invalid };
}

/* ---------------------------
   CREATE FIELD TECHNICIAN (with permissions)
   - Body may include `permissions: [{ dataCenterId, clientId }, ...]`
---------------------------- */
const createFieldTechnician = async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      permissions = [],
      password,   // password from admin or undefined
      ...ftData
    } = req.body;

    // validate permissions
    const { valid, invalid } = await validatePermissions(permissions);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid permissions",
        invalid
      });
    }

    // generate technicianId
    const technicianId = await generateTechnicianId();

    // use provided password or auto-generate
    const plainPassword = password || generatePassword();

    // hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // create FT
    const ft = await FieldTechnician.create(
      [{
        ...ftData,
        technicianId,
        pricingCurrency: ftData.currency,
        password: hashedPassword,
        role: "technician"
      }],
      { session }
    );

    const ftDoc = ft[0];

    // insert permissions
    if (permissions.length > 0) {
      const docs = permissions.map((p) => ({
        ftId: ftDoc._id,
        dataCenterId: p.dataCenterId,
        clientId: p.clientId
      }));

      await FTPermission.insertMany(docs, { session });
    }

    await session.commitTransaction();
    session.endSession();

    const fullFT = await FieldTechnician.findById(ftDoc._id)
      .populate("companyId")
      .populate("country")
      .populate("city");

    const permissionsSaved = await FTPermission.find({ ftId: ftDoc._id })
      .populate("dataCenterId")
      .populate("clientId");

    // 💥 NEVER return h,,,,ashed password
    // return plain password ONCE so admin can show it
    return res.status(201).json({
      success: true,
      message: "Field technician created",
      loginCredentials: {
        technicianId,
        password: plainPassword
      },
      ft: fullFT,
      permissions: permissionsSaved
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("createFieldTechnician error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


/* ---------------------------
   UPDATE FIELD TECHNICIAN STATUS
---------------------------- */
const toggleFieldTechnicianStatus = async (req, res) => {
  try {
    const ftId = req.params.id;
    const ft = await FieldTechnician.findById(ftId);
    if (!ft) {
      return res.status(404).json({ success: false, message: "Field technician not found" });
    }
    ft.isActive = !ft.isActive;
    await ft.save();
    return res.json({ success: true, data: ft });
  } catch (err) {
    console.error("toggleFieldTechnicianStatus error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


/* ---------------------------
   GET ALL FIELD TECHNICIANS
---------------------------- */
const getAllFieldTechnicians = async (req, res) => {
  try {
    const {
      companyId,
      country,
      city,
      dataCenterId,
      clientId,
      search,
      isActive,
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // 1. Filter by company
    if (companyId) filter.companyId = companyId;

    // 2. Filter by country
    if (country) filter.country = country;

    // 3. Filter by city
    if (city) filter.city = city;

    // 4. Filter by active/inactive status
    if (isActive === "true") filter.isActive = true;
    if (isActive === "false") filter.isActive = false;

    // 5. Search by name / phone / email
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
        { email: new RegExp(search, "i") }
      ];
    }

    // STEP 6 — Filter by permission: dataCenter, client
    let ftIdsFromPermissions = null;

    if (dataCenterId || clientId) {
      const permFilter = {};
      if (dataCenterId) permFilter.dataCenterId = dataCenterId;
      if (clientId) permFilter.clientId = clientId;

      const permissions = await FTPermission.find(permFilter).select("ftId");
      ftIdsFromPermissions = permissions.map(p => p.ftId.toString());

      // If no FT matches — return empty
      if (ftIdsFromPermissions.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: pageNum,
            limit: limitNum,
            pages: 0
          }
        });
      }

      // Add to main filter
      filter._id = { $in: ftIdsFromPermissions };
    }

    // Fetch FT with applied filters and pagination
    const [total, ftList] = await Promise.all([
      FieldTechnician.countDocuments(filter),
      FieldTechnician.find(filter)
        .select("-password")
        .populate("companyId")
        .populate("country")
        .populate("city")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    res.json({
      success: true,
      data: ftList,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (err) {
    console.error("FT List Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ---------------------------
   GET FT WITH PERMISSIONS
---------------------------- */
const getFtWithPermissions = async (req, res) => {
  try {
    const ft = await FieldTechnician.findById(req.params.id)
      .populate("companyId")
      .populate("country")
      .populate("city");

    if (!ft) {
      return res.status(404).json({ success: false, message: "Field technician not found" });
    }

    const permissions = await FTPermission.find({ ftId: req.params.id })
      .populate("dataCenterId")
      .populate("clientId");

    res.json({ success: true, ft, permissions });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ---------------------------
   UPDATE FIELD TECHNICIAN
   - If permissions array provided, replace existing permissions atomically
   - Body may include permissions: [{ dataCenterId, clientId }, ...]
---------------------------- */
const updateFieldTechnician = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();


  try {
    const ftId = req.params.id;
    const { permissions, ...ftData } = req.body;

    console.log("FT Data", ftData)

    // 1) Check FT exists
    const existingFT = await FieldTechnician.findById(ftId).session(session);
    if (!existingFT) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Field technician not found" });
    }

    // 2) If permissions provided, validate them first
    if (permissions) {
      const { valid, invalid } = await validatePermissions(permissions);
      if (!valid) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "One or more permissions are invalid",
          invalid
        });
      }
    }

    // ---------------------------------------------------------
    // 3) Handle Password Logic
    // ---------------------------------------------------------
    if (ftData.password && ftData.password.trim() !== "") {
      // If password exists and is not empty: Hash it
      const salt = await bcrypt.genSalt(10);
      ftData.password = await bcrypt.hash(ftData.password, salt);
    } else {
      // If password is undefined, null, or empty string: 
      // Delete the key so Mongoose doesn't try to update it
      delete ftData.password;
    }

    // 3) Update FT main document
    const ft = await FieldTechnician.findByIdAndUpdate(ftId, ftData, { new: true, session });

    // 4) Replace permissions if provided
    if (permissions) {
      // delete existing
      await FTPermission.deleteMany({ ftId }).session(session);

      // insert new unique permissions
      const unique = new Map();
      const docs = [];
      for (const p of permissions) {
        const key = `${p.dataCenterId.toString()}_${p.clientId.toString()}`;
        if (!unique.has(key)) {
          unique.set(key, true);
          docs.push({
            ftId,
            dataCenterId: p.dataCenterId,
            clientId: p.clientId
          });
        }
      }
      if (docs.length > 0) {
        await FTPermission.insertMany(docs, { session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    const permissionsSaved = await FTPermission.find({ ftId })
      .populate("dataCenterId")
      .populate("clientId");

    const ftFull = await FieldTechnician.findById(ftId)
      .populate("companyId")
      .populate("country")
      .populate("city");

    return res.json({
      success: true,
      message: "Field technician updated",
      ft: ftFull,
      permissions: permissionsSaved
    });

  } catch (err) {
    await session.abortTransaction().catch(() => { });
    session.endSession();
    console.error("updateFieldTechnician error:", err);
    return res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

/* ---------------------------
   DEACTIVATE TECHNICIAN
---------------------------- */
const deleteTechnician = async (req, res) => {
  try {
    const ft = await FieldTechnician.findByIdAndDelete(
      req.params.id,

    );

    res.json({ success: true, message: "Technician deactivated", data: ft });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ---------------------------
   ADD ACCESS (separate endpoint still supported)
   - body.permissions = [{ dataCenterId, clientId }]
---------------------------- */
const addAccess = async (req, res) => {
  try {
    const { ftId } = req.params;
    const { permissions = [] } = req.body;

    // validate
    const { valid, invalid } = await validatePermissions(permissions);
    if (!valid) {
      return res.status(400).json({ success: false, message: "Invalid permissions", invalid });
    }

    // avoid duplicates for same ft
    const unique = new Map();
    const docs = [];
    for (const p of permissions) {
      const key = `${p.dataCenterId.toString()}_${p.clientId.toString()}`;
      if (!unique.has(key)) {
        unique.set(key, true);
        docs.push({
          ftId,
          dataCenterId: p.dataCenterId,
          clientId: p.clientId
        });
      }
    }

    if (docs.length > 0) await FTPermission.insertMany(docs);

    res.json({ success: true, message: "Access added" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ---------------------------
   REMOVE ACCESS
   - permissionId is the FTPermission doc id
---------------------------- */
const removeAccess = async (req, res) => {
  try {
    await FTPermission.findByIdAndDelete(req.params.permissionId);
    res.json({ success: true, message: "Access removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ---------------------------
   GET ONLY PERMISSIONS
---------------------------- */
const getFieldTechnicianPermissions = async (req, res) => {
  try {
    console.log("Searching for custom ID:", req.params.id); // "FT005"

    // 1. Find the Technician using the custom ID "FT005"
    // CHANGE 'technicianId' to whatever field name you use for "FT005" in your FieldTechnician Schema (e.g., ftCode, customId, etc.)
    const technician = await FieldTechnician.findOne({ technicianId: req.params.id });

    console.log("Technician found:", technician);

    if (!technician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }

    // 2. Now use the REAL _id to find permissions
    // Note: Use .find() instead of .findOne() if a technician can have multiple permission entries
    const permissions = await FTPermission.find({ ftId: technician._id })
      .populate("dataCenterId")
      .populate("clientId");

    res.json({ success: true, data: permissions });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


module.exports = {
  createFieldTechnician,
  getAllFieldTechnicians,
  getFtWithPermissions,
  updateFieldTechnician,
  deleteTechnician,
  addAccess,
  removeAccess,
  getFieldTechnicianPermissions,
  toggleFieldTechnicianStatus
};