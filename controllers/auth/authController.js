const User = require("../../models/userModel");
const FieldTechnician = require("../../models/fieldTechnicianModel");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.SECRET, { expiresIn: "1d" });
};

const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // False in dev, True in prod
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Lax is better for local dev
  maxAge: 1000 * 60 * 60 * 24, // 1 day
};

// const cookieConfig = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production", // Only true in production
//   sameSite: "none", // recommended for CSRF protection
//   // sameSite: "strict", // recommended for CSRF protection
//   maxAge: 1000 * 60 * 60 * 24, // 1 day
// };



// To get user data on initial page load.
const getUserDataFirst = async (req, res) => {
  try {
    const token = req.cookies.user_token;
    if (!token) {
      throw Error("No token found");
    }

    const { _id } = jwt.verify(token, process.env.SECRET);

    const user = await User.findOne({ _id }, { password: 0 });
    if (user) {
      res.status(200).json(user);
    }

    const technician = await FieldTechnician.findOne({ _id }, { password: 0 });
    if (technician) {
      res.status(200).json(technician);
    }

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


const signUpUser = async (req, res) => {
  try {
    let userCredentials = req.body;

    const profileImgURL = req?.file?.filename;

    if (profileImgURL) {
      userCredentials = { ...userCredentials, profileImgURL: profileImgURL };
    }

    const user = await User.signup(userCredentials, "user", true);

    const token = createToken(user._id);

    res.cookie("user_token", token, cookieConfig);

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


const loginUser = async (req, res) => {
  try {
    const { email, technicianId, password } = req.body;

    // 1️⃣ Technician Login (if technicianId exists)
    if (technicianId) {
      const ft = await FieldTechnician.findOne({ technicianId }); 

      if (!ft) {
        return res.status(401).json({ error: "Invalid Technician ID" });
      }

      const match = await bcrypt.compare(password, ft.password);
      if (!match) {
        return res.status(401).json({ error: "Invalid password" });
      }

      // create token with role = technician
      const token = createToken(ft._id, "technician");

      res.cookie("user_token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      });

      return res.status(200).json({
        success: true,
        role: "technician",
        message: "Technician logged in successfully",
        data: {
          id: ft._id,
          technicianId: ft.technicianId,
          name: ft.name
        }
      });
    }

    // 2️⃣ Admin/User Login (default)
    if (email) {
      const user = await User.login(email, password);

      const token = createToken(user._id, "admin");

      res.cookie("user_token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      });

      return res.status(200).json({
        success: true,
        role: "admin",
        message: "Admin logged in successfully",
        data: user
      });
    }

    // if neither is present → bad request
    return res.status(400).json({
      error: "Please provide email or technicianId"
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(401).json({ error: error.message });
  }
};

const logoutUser = async (req, res) => {
  res.clearCookie("user_token", {
    sameSite: "none",
    secure: true,
    httpOnly: true,
  });

  res.status(200).json({ msg: "Logged out Successfully" });
};

const editUser = async (req, res) => {
  try {
    const token = req.cookies.user_token;

    const { _id } = jwt.verify(token, process.env.SECRET);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid ID!!!");
    }

    let formData = req.body;

    const profileImgURL = req?.file?.filename;

    if (profileImgURL) {
      formData = { ...formData, profileImgURL: profileImgURL };
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id },
      { $set: { ...formData } },
      { new: true }
    );

    if (!updatedUser) {
      throw Error("No such User");
    }

    const user = await User.findOne({ _id }, { password: 0 });

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const token = req.cookies.user_token;

    const { _id } = jwt.verify(token, process.env.SECRET);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid ID!!!");
    }

    const { currentPassword, password, passwordAgain } = req.body;

    const user = await User.changePassword(
      _id,
      currentPassword,
      password,
      passwordAgain
    );

    return res.status(200).json({ user, success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getUserDataFirst,
  signUpUser,
  loginUser,
  logoutUser,
  editUser,
  changePassword,
};
