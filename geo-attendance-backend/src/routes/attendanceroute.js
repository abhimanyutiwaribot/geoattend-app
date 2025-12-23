const express = require("express");
const authMiddleware = require("../middleware/authmiddleware");
const AttendanceModel = require("../models/attendance");
const MotionModel = require("../models/motion");
const GeofenceService = require("../services/geofenceService")
const MotionAnalysisService = require("../services/motionAnalysisService");
const suspicionDetectionService = require("../services/suspicionDetectionService");
const revalidationService = require("../services/revalidationService");
const attendanceRouter = express.Router();

attendanceRouter.post("/start", authMiddleware, async function (req, res) {
    try{
        const {lat , lng} = req.body;
        const userId = req.user._id;

        // todo : Add geofence validation logic here
        const geoFenceCheck = await GeofenceService.isWithinGeofence(lat, lng)

        if(!geoFenceCheck.isWithin){
            return res.status(400).json({
                success: false,
                message: "You are not within the office geofence",
                error: "OUTSIDE_GEOFENCE",
                data : {
                    requiredRadius : 100, //meters
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
            location: {lat, lng},
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
    }catch (error){
        res.status(500).json({
            success: false,
            message: "Error starting attendance",
            error: error.message
        })
    }
});


attendanceRouter.post("/validate",  authMiddleware, async function (req , res) {
    try{
        const { attendanceId, gyro, accel } = req.body;

        const userId = req.user._id;

        const attendance = await AttendanceModel.findOne({
            _id: attendanceId,
            userId: userId
        });

        if(!attendance){
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

        if(motionAnalysis.isActive && attendance.status === "tentative"){
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
    } catch (error){
        res.status(500).json({
            success: false,
            message: "Error validating presence",
            error: error.message
        })
    }
});


attendanceRouter.post("/end", authMiddleware, async function (req, res){
    try{
        const { attendanceId } = req.body;
        const userId = req.user._id;

        const attendance = await AttendanceModel.findOne({
            _id: attendanceId,
            userId: userId
        });

        if(!attendance) {
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
            data : {
                attendanceId : attendance._id,
                duration : duration,
                status: attendance.status
            }
         });
    } catch(error){
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
    try{
        const{ attendanceId } = req.body;
        const userId = req.user._id;

        const suspicionAnalysis = await suspicionDetectionService.analyzeSuspicion(attendanceId, userId);

        let challenge = null;

        if(suspicionAnalysis.requiresRevalidation){
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
                challenge: challenge?.success ? challenge: null
            }
        });
    } catch(error){
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

attendanceRouter.get("/active-session", authMiddleware, async(req, res) => {
    try {
        const userId = req.user._id;

        const activeSession = await AttendanceModel.findOne({
            userId,
            status: { $in: ["tentative", "confirmed", "flagged"]}
        }).sort({ startTime: -1})
        
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

module.exports = attendanceRouter;