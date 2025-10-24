const express = require("express");
const authMiddleware = require("../middleware/authmiddleware");
const AttendanceModel = require("../models/attendance");
const MotionModel = require("../models/motion");
const GeofenceService = require("../services/geofenceService")
const MotionAnalysisService = require("../services/motionAnalysisService")
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


module.exports = attendanceRouter;