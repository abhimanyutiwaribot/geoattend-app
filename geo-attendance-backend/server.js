const express = require("express");
const cors = require("cors");
const connectDB = require("./db.js")
const userRoutes = require("./src/routes/userroutes");
const attendanceRouter = require("./src/routes/attendanceroute.js");
const locationActivityRouter = require("./src/routes/locationActivityRoute.js");
const presenceRouter = require("./src/routes/presenceRoute.js");
const adminRoutes = require("./src/routes/adminRoutes.js");
const adminAuthRoutes = require("./src/routes/adminAuthRoutes.js");
const adminPresenceRouter = require("./src/routes/adminPresenceRoute.js");

const app = express();
require("dotenv").config();

// Middleware
app.use(cors()); // Enable CORS for admin panel
app.use(express.json({ limit: '10mb' })); // Increased limit for face images
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Database connection
connectDB();

// Routes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/attendance", attendanceRouter);
app.use("/api/v1/attendance", locationActivityRouter); // Location & Activity tracking
app.use("/api/v1/presence", presenceRouter); // Presence scoring
app.use("/api/v1/admin/auth", adminAuthRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/admin/presence", adminPresenceRouter); // Admin presence monitoring


// Health check route
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString()
    });
});

// // Handle undefined routes
// app.use("*", (req, res) => {
//     res.status(404).json({
//         success: false,
//         message: "Route not found"
//     });
// });

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start background workers
    const presenceScoreWorker = require('./src/workers/presenceScoreWorker');
    presenceScoreWorker.start();
});