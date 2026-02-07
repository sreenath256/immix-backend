require("dotenv").config();
const express = require('express')
const cookieParser = require("cookie-parser");
const cors = require("cors"); // Add it back when communicating with react
const logger = require("morgan");
const mongoose = require("mongoose");

const app = express()

// Setting up cors
const allowedOrigins = ["http://localhost:5173"];

const corsOptions = {
    credentials: true,
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
};



// Mounting necessary middlewares.
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(express.json());
app.use(logger("dev"));


// Import route handlers
const authRoutes = require("./routes/auth");
const technicianRoutes = require("./routes/technician");
const adminRoutes = require("./routes/admin");


// Import custom middleware for authentication
const { requireAuth, requireAdminAuth } = require("./middlewares/authMiddleware");


// Test route for API health check
app.get("/api/test", (req, res) => {
    res.status(200).json({ data: "test route success" });
});


// Routes for actions
app.use("/api/auth", authRoutes);
app.use("/api/technician", requireAuth, technicianRoutes)
app.use("/api/admin", requireAdminAuth, adminRoutes)



// Connect to MongoDB and start the server
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(process.env.PORT || 3000, () => {
            console.log(`Listening on Port: ${process.env.PORT || 3000} - DB Connected`);
        });
    })
    .catch((error) => {
        console.log(error);
    });
