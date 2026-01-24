const express = require("express");
const authMiddleware = require("../middleware/authmiddleware");
const AttendanceModel = require("../models/attendance");
const MotionModel = require("../models/motion");
const GeofenceService = require("../services/geofenceService")
const MotionAnalysisService = require("../services/motionAnalysisService");
const suspicionDetectionService = require("../services/suspicionDetectionService");
const revalidationService = require("../services/revalidationService");
const MockLocationDetectionService = require("../services/mockLocationDetectionService");
const CognitiveService = require("../services/cognitiveService");
const CognitiveChallenge = require("../models/cognitiveChallenge");
const attendanceRouter = express.Router();

const mockLocationService = new MockLocationDetectionService();
const cognitiveService = new CognitiveService();


attendanceRouter.post("/start", authMiddleware, async function (req, res) {
    try {
        const { lat, lng } = req.body;
        const userId = req.user._id;

        // todo : Add geofence validation logic here
        const geoFenceCheck = await GeofenceService.isWithinGeofence(lat, lng)

        if (!geoFenceCheck.isWithin) {
            return res.status(400).json({
                success: false,
                message: "You are not within the office geofence",
                error: "OUTSIDE_GEOFENCE",
                data: {
                    requiredRadius: 100, //meters
                    userDistance: geoFenceCheck.distance
                }
            })
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

        const motionAnalysis = MotionAnalysisService.analyzeMotionPattern(gyro, accel);

        const motionLog = new MotionModel({
            userId,
            attendanceId,
            gyro,
            accel,
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

        attendance.endTime = new Date();
        attendance.status = "completed";

        //Calculate duration
        const duration = (attendance.endTime - attendance.startTime) / (1000 * 60); // minutes

        attendance.totalDuration = duration;

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
        if (typeof lat !== "number" || typeof lng !== "number") {
            return res.status(400).json({
                success: false,
                message: "lat and lng are required numbers"
            });
        }

        const geoFenceCheck = await GeofenceService.isWithinGeofence(lat, lng);

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

attendanceRouter.post("/check-suspicion", authMiddleware, async function (req, res) {
    try {
        const { attendanceId } = req.body;
        const userId = req.user._id;

        const suspicionAnalysis = await suspicionDetectionService.analyzeSuspicion(attendanceId, userId);

        let challenge = null;

        if (suspicionAnalysis.requiresRevalidation) {
            challenge = await revalidationService.generateChallenge(
                userId,
                attendanceId,
                "wordle"   // Fun Wordle-style challenge
            );
        }

        res.json({
            success: true,
            data: {
                suspicionAnalysis,
                challenge: challenge?.success ? challenge : null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error checking suspicion",
            error: error.message
        });
    }
});

// Add endpoint to handle challenge responses
attendanceRouter.post("/validate-challenge", authMiddleware, async (req, res) => {
    try {
        const { challengeId, response } = req.body;
        const userId = req.user._id;

        const validationResult = await revalidationService.validateChallengeResponse(
            challengeId,
            response,
            userId
        );

        if (validationResult.success && validationResult.isValid) {
            // Update attendance status if challenge passed
            await AttendanceModel.findOneAndUpdate(
                { _id: req.body.attendanceId, userId: userId },
                {
                    status: "confirmed",
                    revalidationPassed: true,
                    validationScore: 100
                }
            );
        }

        res.json(validationResult);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error validating challenge",
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

// Generate cognitive challenge
attendanceRouter.post('/generate-cognitive-challenge', authMiddleware, async (req, res) => {
    try {
        const { attendanceId } = req.body;
        const userId = req.user._id;

        // Verify attendance exists and belongs to user
        console.log('Looking for attendance:', { attendanceId, userId });
        const attendance = await AttendanceModel.findOne({
            _id: attendanceId,
            userId,
            status: { $in: ['tentative', 'confirmed'] }
        });

        console.log('Found attendance:', attendance ? 'Yes' : 'No');

        if (!attendance) {
            return res.status(404).json({
                success: false,
                error: 'ATTENDANCE_NOT_FOUND',
                message: 'Active attendance session not found'
            });
        }

        // Random challenge type
        const types = ['reaction_time', 'color_match', 'pattern_memory', 'math_quick'];
        const challengeType = types[Math.floor(Math.random() * types.length)];

        const challengeData = cognitiveService.generateChallenge(challengeType);

        const challenge = new CognitiveChallenge({
            userId,
            attendanceId,
            challengeType,
            challengeData,
            expiresAt: new Date(Date.now() + 30000) // 30 seconds
        });

        await challenge.save();

        // Return challenge without answers
        const clientChallengeData = { ...challengeData };
        delete clientChallengeData.correctAnswer;
        delete clientChallengeData.correctIndex;

        res.json({
            success: true,
            data: {
                challengeId: challenge._id,
                challengeType,
                challengeData: clientChallengeData,
                expiresAt: challenge.expiresAt
            }
        });
    } catch (error) {
        console.error('Cognitive challenge generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate challenge',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Validate cognitive challenge response
attendanceRouter.post('/validate-cognitive-challenge', authMiddleware, async (req, res) => {
    try {
        const { challengeId, response, responseTime } = req.body;
        const userId = req.user._id;

        const challenge = await CognitiveChallenge.findOne({
            _id: challengeId,
            userId,
            status: 'pending'
        });

        if (!challenge) {
            return res.status(404).json({
                success: false,
                error: 'CHALLENGE_NOT_FOUND',
                message: 'Challenge not found or already completed'
            });
        }

        if (new Date() > challenge.expiresAt) {
            challenge.status = 'expired';
            await challenge.save();
            return res.status(400).json({
                success: false,
                error: 'CHALLENGE_EXPIRED',
                message: 'Challenge has expired'
            });
        }

        const isCorrect = cognitiveService.validateResponse(
            challenge.challengeType,
            challenge.challengeData,
            response
        );

        // Reaction time should be human-like (200ms - 3000ms)
        const isHumanTiming = cognitiveService.isHumanTiming(responseTime);

        console.log('Challenge validation:', {
            challengeType: challenge.challengeType,
            response,
            responseTime,
            isCorrect,
            isHumanTiming,
            challengeData: challenge.challengeData
        });

        challenge.userResponse = {
            responseTime,
            answer: response,
            timestamp: new Date()
        };
        challenge.status = (isCorrect && isHumanTiming) ? 'passed' : 'failed';
        await challenge.save();

        // Update attendance validation score
        if (challenge.status === 'passed') {
            await AttendanceModel.findByIdAndUpdate(challenge.attendanceId, {
                $inc: { validationScore: 10 },
                status: 'confirmed'
            });
        } else {
            await AttendanceModel.findByIdAndUpdate(challenge.attendanceId, {
                $inc: { validationScore: -5 }
            });
        }

        res.json({
            success: true,
            data: {
                passed: challenge.status === 'passed',
                responseTime,
                isCorrect,
                isHumanTiming,
                message: challenge.status === 'passed'
                    ? 'Challenge completed successfully!'
                    : 'Challenge failed. Please try again next time.'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to validate challenge',
            error: error.message
        });
    }
});

module.exports = attendanceRouter;