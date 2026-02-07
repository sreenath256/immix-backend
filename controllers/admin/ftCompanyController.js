const FTCompany = require("../../models/ftCompanyModel");

/* ----------------------------------------------------
   CREATE COMPANY
---------------------------------------------------- */
const createFTCompany = async (req, res) => {
  try {
    const company = await FTCompany.create(req.body);
    res.json({ success: true, data: company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ----------------------------------------------------
   GET ALL COMPANIES
---------------------------------------------------- */
const getAllFTCompanies = async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let filter = {};

    if (isActive) filter.isActive = isActive === 'true';

    if (search) {
      const searchTerms = search.trim();
      const searchRegex = new RegExp(searchTerms.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'i');

      filter.$or = [
        { name: searchRegex },
        { address: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }



    const [total, companies] = await Promise.all([
      FTCompany.countDocuments(filter),
      FTCompany.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
    ]);


    res.json({
      success: true,
      data: companies,
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
   GET SINGLE COMPANY
---------------------------------------------------- */
const getFTCompany = async (req, res) => {
  try {
    const company = await FTCompany.findById(req.params.id);

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
   UPDATE COMPANY
---------------------------------------------------- */
const updateFTCompany = async (req, res) => {
  try {
    const company = await FTCompany.findByIdAndUpdate(
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
   toggleFTCompanyStatus COMPANY
---------------------------------------------------- */
const toggleFTCompanyStatus = async (req, res) => {
  try {
    const ftCompany = await FTCompany.findById(req.params.id);

    if (!ftCompany) {
      return res.status(404).json({ success: false, message: "FT Company not found" });
    }

    ftCompany.isActive = !ftCompany.isActive;
    await ftCompany.save();

    res.json({ success: true, message: `FT Company ${ftCompany.isActive ? 'activated' : 'deactivated'}`, data: ftCompany });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};



module.exports = {
  createFTCompany,
  getAllFTCompanies,
  getFTCompany,
  updateFTCompany,
  toggleFTCompanyStatus,
};
