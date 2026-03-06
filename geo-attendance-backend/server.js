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
const leaveRoutes = require("./src/routes/leaveRoutes.js");


const app = express();
require("dotenv").config();

app.use(cors());

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
app.use("/api/v1/leaves", leaveRoutes); // Leave management



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

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // Pre-load face recognition models so first check-in isn't slow
    try {
        const RealFaceRecognitionService = require('./src/services/realFaceRecognitionService');
        await RealFaceRecognitionService.loadModels();
        console.log('✅ [FaceAPI] Real face recognition is ACTIVE');
    } catch (err) {
        console.error('❌ [FaceAPI] Face recognition models failed to load:', err.message);
        console.error('   → Ensure model files exist at /models/ (ssdMobilenetv1, faceLandmark68Net, faceRecognitionNet)');
        console.error('   → Face enrollment and check-in will be UNAVAILABLE until models are loaded');
    }

    // Start background workers
    const presenceScoreWorker = require('./src/workers/presenceScoreWorker');
    presenceScoreWorker.start();
});
