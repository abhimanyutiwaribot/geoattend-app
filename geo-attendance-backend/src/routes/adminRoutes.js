const express = require("express");
const { adminAuthMiddleware, requireRole, requirePermission } = require("../middleware/adminauthMiddleware");
const User = require("../models/user");
const Attendance = require("../models/attendance");
const MotionLog = require("../models/motion");
const GeoFenceModel = require("../models/officeGeofence");

const adminRoutes = express.Router();

// Apply admin auth to all routes
adminRoutes.use(adminAuthMiddleware);

// 📊 DASHBOARD OVERVIEW
adminRoutes.get("/dashboard", requirePermission("canViewReports"), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get today's stats
        const [
            totalUsers,
            activeSessions,
            todayAttendances,
            suspiciousActivities,
            recentChallenges
        ] = await Promise.all([
            User.countDocuments(),
            Attendance.countDocuments({ status: { $in: ["tentative", "confirmed"] } }),
            Attendance.countDocuments({
                startTime: { $gte: today, $lt: tomorrow }
            }),
            Attendance.countDocuments({ status: "flagged" })
        ]);

        // Get weekly attendance trend
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weeklyTrend = await Attendance.aggregate([
            {
                $match: {
                    startTime: { $gte: weekAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$startTime" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    activeSessions,
                    todayAttendances,
                    suspiciousActivities
                },
                weeklyTrend,
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching dashboard data"
        });
    }
});

// 👥 USER MANAGEMENT
adminRoutes.get("/users", requirePermission("canManageUsers"), async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;

        const query = search ? {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ]
        } : {};

        const users = await User.find(query)
            .select("-password")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    totalUsers: total
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching users"
        });
    }
});

// 📍 ATTENDANCE MONITORING
adminRoutes.get("/attendances", requirePermission("canViewReports"), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            userId,
            startDate,
            endDate
        } = req.query;

        let query = {};

        if (status) query.status = status;
        if (userId) query.userId = userId;
        if (startDate || endDate) {
            query.startTime = {};
            if (startDate) query.startTime.$gte = new Date(startDate);
            if (endDate) query.startTime.$lte = new Date(endDate);
        }

        const attendances = await Attendance.find(query)
            .populate("userId", "name email")
            .sort({ startTime: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Attendance.countDocuments(query);

        res.json({
            success: true,
            data: {
                attendances,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    totalRecords: total
                }
            }
        });

    } catch (error) {
        console.error("Attendance monitoring error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching attendance records"
        });
    }
});

// 🚨 SUSPICIOUS ACTIVITIES
adminRoutes.get("/suspicious-activities", requirePermission("canViewSuspicious"), async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const suspiciousAttendances = await Attendance.find({
            $or: [
                { status: "flagged" },
                { validationScore: { $lt: 30 } }
            ]
        })
            .populate("userId", "name email")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);


        res.json({
            success: true,
            data: {
                suspiciousAttendances,
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        console.error("Suspicious activities error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching suspicious activities"
        });
    }
});

// ⚙️ GEOFENCE MANAGEMENT
adminRoutes.get("/geofences", requirePermission("canManageGeofence"), async (req, res) => {
    try {
        const geofences = await GeoFenceModel.find().sort({ createdAt: -1 });

        res.json({
            success: true,
            data: {
                geofences
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching geofences"
        });
    }
});

adminRoutes.post("/geofences", requirePermission("canManageGeofence"), async (req, res) => {
    try {
        const { name, type, center, radius, polygon } = req.body;

        const geofenceData = {
            name,
            type: type || 'circle'
        };

        // Add type-specific fields
        if (type === 'polygon') {
            geofenceData.polygon = polygon;
        } else {
            geofenceData.center = center;
            geofenceData.radius = radius;
        }

        const geofence = new GeoFenceModel(geofenceData);
        await geofence.save();

        res.status(201).json({
            success: true,
            message: "Geofence created successfully",
            data: { geofence }
        });
    } catch (error) {
        console.error("Geofence creation error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error creating geofence"
        });
    }
});

// Assign office to user
adminRoutes.put("/users/:userId/assign-office", requirePermission("canManageUsers"), async (req, res) => {
    try {
        const { userId } = req.params;
        const { officeId } = req.body;

        // Verify office exists
        if (officeId) {
            const office = await GeoFenceModel.findById(officeId);
            if (!office) {
                return res.status(404).json({
                    success: false,
                    message: "Office not found"
                });
            }
        }

        // Update user
        const user = await User.findByIdAndUpdate(
            userId,
            { assignedOfficeId: officeId || null },
            { new: true }
        ).select("-password").populate("assignedOfficeId");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: officeId ? "Office assigned successfully" : "Office assignment removed",
            data: { user }
        });
    } catch (error) {
        console.error("Assign office error:", error);
        res.status(500).json({
            success: false,
            message: "Error assigning office"
        });
    }
});

// 📈 REPORTS GENERATION
adminRoutes.post("/reports/generate", requirePermission("canViewReports"), async (req, res) => {
    try {
        const { type, startDate, endDate } = req.body;

        let reportData = {};

        switch (type) {
            case "daily_attendance":
                reportData = await generateDailyAttendanceReport(startDate, endDate);
                break;
            case "suspicious_activity":
                reportData = await generateSuspiciousActivityReport(startDate, endDate);
                break;
            case "user_analytics":
                reportData = await generateUserAnalyticsReport(startDate, endDate);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: "Invalid report type"
                });
        }

        res.json({
            success: true,
            data: {
                report: {
                    type,
                    dateRange: { startDate, endDate },
                    generatedAt: new Date(),
                    data: reportData
                }
            }
        });

    } catch (error) {
        console.error("Report generation error:", error);
        res.status(500).json({
            success: false,
            message: "Error generating report"
        });
    }
});

// Helper functions for reports
async function generateDailyAttendanceReport(startDate, endDate) {
    const attendanceData = await Attendance.aggregate([
        {
            $match: {
                startTime: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$startTime" }
                },
                total: { $sum: 1 },
                confirmed: {
                    $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] }
                },
                flagged: {
                    $sum: { $cond: [{ $eq: ["$status", "flagged"] }, 1, 0] }
                },
                averageDuration: { $avg: "$totalDuration" }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    return attendanceData;
}

async function generateSuspiciousActivityReport(startDate, endDate) {
    const suspiciousData = await Attendance.aggregate([
        {
            $match: {
                startTime: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                $or: [
                    { status: "flagged" },
                    { validationScore: { $lt: 30 } }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $group: {
                _id: "$userId",
                user: { $first: "$user" },
                suspiciousCount: { $sum: 1 },
                averageScore: { $avg: "$validationScore" }
            }
        },
        {
            $sort: { suspiciousCount: -1 }
        }
    ]);

    return suspiciousData;
}

async function generateUserAnalyticsReport(startDate, endDate) {
    const userAnalytics = await Attendance.aggregate([
        {
            $match: {
                startTime: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $group: {
                _id: "$userId",
                userName: { $first: "$user.name" },
                userEmail: { $first: "$user.email" },
                totalAttendance: { $sum: 1 },
                averageDuration: { $avg: "$totalDuration" },
                completionRate: {
                    $avg: {
                        $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
                    }
                }
            }
        },
        {
            $sort: { totalAttendance: -1 }
        }
    ]);

    return userAnalytics;
}

module.exports = adminRoutes;