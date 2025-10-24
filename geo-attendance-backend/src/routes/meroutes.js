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

module.exports = meRoute;