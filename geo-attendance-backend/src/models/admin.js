const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: {
        type: String,
        enum: ["super_admin", "admin", "viewer"],
        default: "admin"
    },
    permissions: {
        canManageUsers: { type: Boolean, default: true },
        canViewReports: { type: Boolean, default: true },
        canManageGeofence: { type: Boolean, default: true },
        canViewSuspicious: { type: Boolean, default: true }
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    lastLogin: { 
        type: Date 
    }
}, { 
    timestamps: true 
});

const Admin = mongoose.model("Admin", AdminSchema);
module.exports = Admin