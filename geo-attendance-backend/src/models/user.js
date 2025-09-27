const mongoose = require("mongoose");

const UserTable = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type:String, required: true, unique: true},
    password: {type:String, required: true},
    deviceID: {type: String, required: true},
    role: {
       type: String,
        default: "user" 
    }
}, {timestamps: true});

const UserModel = mongoose.model("User", UserTable);
module.exports = UserModel