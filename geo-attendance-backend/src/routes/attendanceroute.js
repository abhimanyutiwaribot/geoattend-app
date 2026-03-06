const express = require("express");
const authMiddleware = require("../middleware/authmiddleware");
const AttendanceModel = require("../models/attendance");
const MotionModel = require("../models/motion");
const GeofenceService = require("../services/geofenceService")
const MotionAnalysisService = require("../services/motionAnalysisService");
const suspicionDetectionService = require("../services/suspicionDetectionService");
const MockLocationDetectionService = require("../services/mockLocationDetectionService");
const FaceVerificationService = require("../services/faceVerificationService");
const attendanceRouter = express.Router();

const mockLocationService = new MockLocationDetectionService();


attendanceRouter.post("/start", authMiddleware, async function (req, res) {
    try {
        const { lat, lng, identityEmbedding, identityImage } = req.body;
        const userId = req.user._id;

        let faceEmbedding;

        // Support both image (real) and embedding (simulation)
        if (identityImage) {
            const RealFaceRecognitionService = require('../services/realFaceRecognitionService');
            console.log('[Attendance] Processing face image for check-in verification');
            faceEmbedding = await RealFaceRecognitionService.generateEmbedding(identityImage);
        } else if (identityEmbedding) {
            // SIMULATION MODE: Use provided embedding
            console.log('🎭 [Attendance] Using simulated embedding for verification');
            faceEmbedding = identityEmbedding;
        } else {
            return res.status(400).json({
                success: false,
                message: "Face verification data is required (image or embedding)",
                error: "MISSING_IDENTITY_DATA"
            });
        }

        // Identity Verification (Phase 4 MANDATORY GATE)
        const faceVerification = await FaceVerificationService.verifyFace(userId, faceEmbedding);

        if (!faceVerification.success) {
            return res.status(401).json({
                success: false,
                message: "Identity verification failed. Please ensure your face is clearly visible.",
                error: "IDENTITY_VERIFICATION_FAILED",
                data: faceVerification.data
            });
        }

        // Check if user is within their assigned office geofence
        const geoFenceCheck = await GeofenceService.isWithinGeofence(lat, lng, userId);

        if (!geoFenceCheck.isWithin) {
            return res.status(400).json({
                success: false,
                message: "You are not within your assigned office geofence",
                error: "OUTSIDE_GEOFENCE",
                data: {
                    assignedOffice: geoFenceCheck.geofence?.name || "Not assigned",
                    requiredRadius: geoFenceCheck.geofence?.radius || 100, //meters
                    userDistance: geoFenceCheck.distance
                }
            });
        }

        // Check if user already has an active session
        const activeSession = await AttendanceModel.findOne({
            userId,
            status: { $in: ["tentative", "confirmed"] }
        });

        if (activeSession) {
            return res.status(409).json({
                success: false,
                message: "You already have an active attendance session",
                error: "ACTIVE_SESSION_EXISTS",
                data: {
                    existingSessionId: activeSession._id,
                    startedAt: activeSession.startTime
                }
            });
        }

        const attendance = new AttendanceModel({
            userId,
            location: { lat, lng },
            status: "tentative",
            startTime: new Date()
        })

        await attendance.save();

        // Create initial LocationLog entry for immediate PresenceEngine tracking
        const LocationLogService = require('../services/locationLogService');
        try {
            await LocationLogService.logLocation(
                userId,
                attendance._id,
                { lat, lng },
                { source: 'check_in_baseline' }
            );
        } catch (logError) {
            console.error('⚠️ Failed to create initial location log:', logError.message);
        }

        res.status(201).json({
            success: true,
            message: "Attendance session started",
            data: {
                attendanceId: attendance._id,
                status: attendance.status,
                startTime: attendance.startTime,
                geofence: {
                    name: geoFenceCheck.geofence.name,
                    distance: geoFenceCheck.distance
                }
            }
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error starting attendance",
            error: error.message
        })
    }
});


attendanceRouter.post("/validate", authMiddleware, async function (req, res) {
    try {
        const { attendanceId, gyro, accel } = req.body;

        const userId = req.user._id;

        const attendance = await AttendanceModel.findOne({
            _id: attendanceId,
            userId: userId
        });

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: "Attendance session not found"
            });
        }

        // Check for approved leave - pause validation if on leave
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const LeaveRequest = require('../models/leaveRequest');
        const onLeave = await LeaveRequest.findOne({
            userId,
            status: 'approved',
            startDate: { $lte: new Date() },
            endDate: { $gte: today }
        });

        if (onLeave) {
            return res.json({
                success: true,
                status: 'on_leave',
                message: 'Validation paused: user is on approved leave',
                data: {
                    attendanceStatus: attendance.status,
                    validationScore: attendance.validationScore
                }
            });
        }

        const motionAnalysis = MotionAnalysisService.analyzeMotionPattern(gyro, accel);

        // Frontend (expo-sensors) sends { x, y, z } objects.
        // MotionModel schema expects [Number] arrays → convert defensively.
        const toArray = (d) => Array.isArray(d) ? d : [d?.x ?? 0, d?.y ?? 0, d?.z ?? 0];
        // console.log(toArray(gyro))
        // console.log(toArray(accel))

        const motionLog = new MotionModel({
            userId,
            attendanceId,
            gyro: toArray(gyro),
            accel: toArray(accel),
            motionType: motionAnalysis.motionType,
            confidence: motionAnalysis.confidence
        });

        await motionLog.save();

        if (motionAnalysis.isActive && attendance.status === "tentative") {
            attendance.status = "confirmed",
                await attendance.save();
        }

        // Calculate validation score (average of last 10 readings)
        const recentMotions = await MotionModel.find({
            attendanceId: attendanceId
        }).sort({ timestamp: -1 }).limit(10);

        const avgConfidence = recentMotions.length > 0
            ? recentMotions.reduce((sum, m) => sum + (m.confidence || 0), 0) / recentMotions.length
            : 0;

        attendance.validationScore = Math.min(100, avgConfidence);
        await attendance.save();


        res.json({
            success: true,
            message: "Presence Validation",
            data: {
                motionLogId: motionLog._id,
                motionAnalysis: motionAnalysis,
                attendanceStatus: attendance.status,
                validationScore: attendance.validationScore
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error validating presence",
            error: error.message
        })
    }
});


attendanceRouter.post("/end", authMiddleware, async function (req, res) {
    try {
        const { attendanceId } = req.body;
        const userId = req.user._id;

        const attendance = await AttendanceModel.findOne({
            _id: attendanceId,
            userId: userId
        });

        if (!attendance) {
            res.status(404).json({
                success: false,
                message: "Attendance session not found"
            });
        }

        const { exitReason, remarks } = req.body;

        attendance.endTime = new Date();
        attendance.status = "completed";
        attendance.exitReason = exitReason || 'manual';
        attendance.remarks = remarks || '';

        //Calculate duration
        const duration = (attendance.endTime - attendance.startTime) / (1000 * 60); // minutes

        attendance.totalDuration = duration;

        if (exitReason === 'emergency') {
            try {
                const LeaveRequest = require('../models/leaveRequest');
                const emergencyLeave = new LeaveRequest({
                    userId: attendance.userId,
                    startDate: new Date(),
                    endDate: new Date(),
                    type: 'emergency',
                    reason: remarks || 'Emergency exit from active session',
                    status: 'pending'
                });
                await emergencyLeave.save();
                console.log(`🚑 Emergency leave request created for User: ${attendance.userId}`);
            } catch (leaveErr) {
                console.error('⚠️ Failed to auto-create emergency leave:', leaveErr.message);
            }
        }

        await attendance.save();

        res.json({
            success: true,
            message: "attendance session ended",
            data: {
                attendanceId: attendance._id,
                duration: duration,
                status: attendance.status
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error ending Attendance",
            error: error.message
        });
    }
});

// Check current geofence status for given coordinates
attendanceRouter.post("/geofence-status", authMiddleware, async function (req, res) {
    try {
        const { lat, lng } = req.body;
        const userId = req.user._id;

        if (typeof lat !== "number" || typeof lng !== "number") {
            return res.status(400).json({
                success: false,
                message: "lat and lng are required numbers"
            });
        }

        const geoFenceCheck = await GeofenceService.isWithinGeofence(lat, lng, userId);

        res.json({
            success: true,
            data: {
                isWithin: geoFenceCheck.isWithin,
                distance: geoFenceCheck.distance,
                geofence: geoFenceCheck.geofence ? {
                    name: geoFenceCheck.geofence.name,
                    radius: geoFenceCheck.geofence.radius,
                    center: geoFenceCheck.geofence.center
                } : null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error checking geofence status",
            error: error.message
        });
    }
});


attendanceRouter.get("/active-session", authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;

        const activeSession = await AttendanceModel.findOne({
            userId,
            status: { $in: ["tentative", "confirmed", "flagged"] }
        }).sort({ startTime: -1 })

        if (!activeSession) {
            // Use 204 No Content to indicate success but no data (recommended for GET with no results)
            return res.status(204).json({
                success: true,
                message: "No active attendance session found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Active attendance session retrieved",
            data: {
                attendanceId: activeSession._id,
                status: activeSession.status,
                startTime: activeSession.startTime,
                validationScore: activeSession.validationScore,
                location: activeSession.location
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving active session",
            error: error.message
        });
    }
});

attendanceRouter.get("/my", authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20 } = req.query;

        const query = { userId };

        const attendances = await AttendanceModel.find(query)
            .sort({ startTime: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await AttendanceModel.countDocuments(query);

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
        res.status(500).json({
            success: false,
            message: "Error fetching attendance history",
            error: error.message
        });
    }
});

// Validate location with mock detection
attendanceRouter.post('/validate-location', authMiddleware, async (req, res) => {
    try {
        const { latitude, longitude, accuracy, speed, altitude, isMockLocation } = req.body;
        const userId = req.user._id;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        const validation = await mockLocationService.validateLocation(userId, {
            latitude,
            longitude,
            accuracy,
            speed,
            altitude,
            isMockLocation,
            ipAddress
        });

        if (validation.action === 'BLOCK') {
            return res.status(403).json({
                success: false,
                error: 'LOCATION_SPOOFING_DETECTED',
                message: 'Your location appears to be spoofed. Please disable mock location apps.',
                flags: validation.flags
            });
        }

        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Location validation failed',
            error: error.message
        });
    }
});


module.exports = attendanceRouter;
