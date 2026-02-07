const ClientEngineer = require("../../models/clientEngineerModel");
const Client = require("../../models/clientModel");
/* ----------------------------------------------------
   CREATE CLIENT ENGINEER
---------------------------------------------------- */
const createClientEngineer = async (req, res) => {
  try {
    console.log("reached here", req.body)
    const client = await Client.findById(req.body.company);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const existingClientEngineer = await ClientEngineer.findOne({ name: req.body.name });
    if (existingClientEngineer) {
      return res.status(400).json({ success: false, message: "Client Engineer with this name already exists" });
    }


    const company = await ClientEngineer.create(req.body);
    res.json({ success: true, data: company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ----------------------------------------------------
   GET ALL CLIENT ENGINEERS
---------------------------------------------------- */
const getAllClientEngineers = async (req, res) => {
  try {
    const { search, isActive, company, page = 1, limit = 10 } = req.query;



    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let filter = {};

    // Filter by Active Status
    if (isActive) filter.isActive = isActive === 'true';

    // Filter by Company ID directly
    if (company) filter.company = company;

   

    // Search (Name, Email, Phone)
    if (search) {
      const searchTerms = search.trim();
      const searchRegex = new RegExp(searchTerms.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'i');

      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Execute Query with Pagination
    const [total, engineers] = await Promise.all([
      ClientEngineer.countDocuments(filter),
      ClientEngineer.find(filter)
        .populate('company', 'name') // Optional: populate company details if needed, but keeping it simple for now or matching standard
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    res.json({
      success: true,
      data: engineers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ----------------------------------------------------
   GET SINGLE CLIENT ENGINEER
---------------------------------------------------- */
const getClientEngineer = async (req, res) => {
  try {
    const company = await ClientEngineer.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    res.json({ success: true, data: company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ----------------------------------------------------
   UPDATE CLIENT ENGINEER
---------------------------------------------------- */
const updateClientEngineer = async (req, res) => {
  try {

    console.log(req.body)
    const company = await ClientEngineer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );



    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    res.json({ success: true, data: company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ----------------------------------------------------
   DELETE CLIENT ENGINEER
---------------------------------------------------- */
const deleteClientEngineer = async (req, res) => {
  try {
    const company = await ClientEngineer.findByIdAndDelete(
      req.params.id,
    );

    res.json({ success: true, message: "Company deleted", data: company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ----------------------------------------------------
   TOGGLE CLIENT ENGINEER STATUS
---------------------------------------------------- */
const toggleClientEngineerStatus = async (req, res) => {
  try {
    console.log(req.body)
    const company = await ClientEngineer.findByIdAndUpdate(
      req.params.id,
      { isActive: !req.body.currentStatus },
      { new: true }
    );

    res.json({ success: true, message: "Company status toggled", data: company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  createClientEngineer,
  getAllClientEngineers,
  getClientEngineer,
  updateClientEngineer,
  deleteClientEngineer,
  toggleClientEngineerStatus
};
