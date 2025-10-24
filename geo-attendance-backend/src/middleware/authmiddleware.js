const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");

async function authMiddleware(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided.",
                error: "NO_TOKEN"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user exists and get fresh data
        const user = await UserModel.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
                error: "USER_NOT_FOUND"
            });
        }
        req.user = user;
        next(); 
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid token",
            error: "INVALID_TOKEN"
        });
    }
}

module.exports = authMiddleware;