const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");

async function adminAuthMiddleware(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify admin exists and is active
        const admin = await Admin.findOne({ 
            _id: decoded.adminId, 
            isActive: true 
        });
        
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Admin account not found or inactive"
            });
        }

        // Attach admin to request object
        req.admin = admin;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
}

// Middleware for role-based access
function requireRole(roles) {
    return (req, res, next) => {
        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: "Insufficient permissions"
            });
        }
        next();
    };
}

// Middleware for permission checks
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.admin.permissions[permission]) {
            return res.status(403).json({
                success: false,
                message: `Permission denied: ${permission}`
            });
        }
        next();
    };
}

module.exports = { adminAuthMiddleware, requireRole, requirePermission };