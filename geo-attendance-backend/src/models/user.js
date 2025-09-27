const mongoose = require("mongoose");

const UserTable = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type:String, required: true, unique: true},
    password: {type:String, required: true},
    deviceID: {type: String, required: true, unique: true, sparse: true},
    devices: [{
        deviceID: { 
            type: String, 
            required: true 
        },
        deviceName: { 
            type: String, 
            default: "Primary Device" 
        },
        lastLogin: { 
            type: Date, 
            default: Date.now 
        },
        isActive: { 
            type: Boolean, 
            default: true 
        },
        addedAt: { 
            type: Date, 
            default: Date.now 
        }
    }],
    firstLogin: { 
        type: Date, 
        default: Date.now 
    },
    lastLogin: { 
        type: Date, 
        default: Date.now 
    },
    loginCount: { 
        type: Number, 
        default: 1 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    }
}, {
    timestamps: true
});

UserTable.index({deviceID: 1});
UserTable.index({email: 1});

const UserModel = mongoose.model("User", UserTable);
module.exports = UserModel