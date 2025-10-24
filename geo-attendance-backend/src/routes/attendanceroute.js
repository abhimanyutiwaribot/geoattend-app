const express = require("express");
const authMiddleware = require("../middleware/authmiddleware");
const AttendanceModel = require("../models/attendance");
const MotionModel = require("../models/motion");

const attendanceRouter = express.Router();

attendanceRouter.post("/start", authMiddleware, async function (req, res) {
    try{
        const {lat , lng} = req.body;
        const userId = req.user._id;

        // todo : Add geofence validation logic here

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
                startTime: attendance.startTime
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

        const motionLog = new MotionModel({
            userId,
            attendanceId,
            gyro,
            accel
        });

        await motionLog.save();

        // TODO: Add logic to update attendace status based on motion patterns

        res.json({
            success: true,
            message: "Presence Validation",
            data: {
                motionLogId: motionLog._id
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