const express = require("express");
const authMiddleware = require("../middleware/authmiddleware");
const meRoute = express.Router();

meRoute.get("/me", authMiddleware, async (req, res) => {
    try {
        res.json({
            success: true,
            message: "User profile retrieved successfully",
            data: {
                user: {
                    id: req.user._id,
                    name: req.user.name,
                    email: req.user.email,
                    deviceID: req.user.deviceID,
                    loginCount: req.user.loginCount,
                    lastLogin: req.user.lastLogin
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching user profile",
            error: error.message
        });
    }
});

// Get user's assigned geofence
meRoute.get("/my-geofence", authMiddleware, async (req, res) => {
    try {
        const User = require("../models/user");
        const GeoFenceModel = require("../models/officeGeofence");

        // Get user with populated assignedOfficeId
        const user = await User.findById(req.user._id).populate('assignedOfficeId');

        if (!user.assignedOfficeId) {
            return res.json({
                success: true,
                message: "No geofence assigned",
                data: { geofence: null }
            });
        }

        res.json({
            success: true,
            message: "Assigned geofence retrieved successfully",
            data: {
                geofence: user.assignedOfficeId
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching assigned geofence",
            error: error.message
        });
    }
});

module.exports = meRoute;