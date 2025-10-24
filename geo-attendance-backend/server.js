const express = require("express");
const connectDB = require("./db.js")
const userRoutes = require("./src/routes/userroutes");
const attendanceRouter = require("./src/routes/attendanceroute.js");
const adminRoutes = require("./src/routes/adminRoutes.js");
const adminAuthRoutes = require("./src/routes/adminAuthRoutes.js");
const app = express();
require("dotenv").config();

// Middleware
app.use(express.json());

// Database connection
connectDB();

// Routes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/attendance", attendanceRouter)
app.use("/api/v1/admin/auth", adminAuthRoutes)
app.use("/api/v1/admin", adminRoutes)

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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));