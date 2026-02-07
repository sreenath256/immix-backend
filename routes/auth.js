const express = require("express");
const upload = require("../middlewares/upload");
const { signUpUser, loginUser, logoutUser, getUserDataFirst } = require("../controllers/auth/authController");
const { forgotPassword, validateForgotOTP, newPassword, sendOTP, validateOTP, resentOTP } = require("../controllers/auth/otpController");

const router = express.Router();

// Get user data first
router.get("/", getUserDataFirst)

// Auth
router.post("/signup", upload.single("profileImgURL"), signUpUser);
router.post("/login", loginUser);

// Forget Password
router.post("/forget-password", forgotPassword);
router.post("/forget-password-validate-otp", validateForgotOTP);

// Set new password
router.post("/set-new-password", newPassword);

// OTP
router.post("/send-otp", sendOTP);
router.post("/validate-otp", validateOTP);
router.post("/resend-otp", resentOTP);


//Logout
router.get("/logout",logoutUser)


module.exports = router;
