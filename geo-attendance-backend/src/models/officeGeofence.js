const mongoose = require("mongoose");

const OfficeGeoFenceTable = new mongoose.Schema({
    name: {type: String, required: true},
    center: {
        lat: {type: Number, required: true},
        lng: {type: Number, required: true}
    },
    radius: {
        type : Number,
        default: 100   //meters
    }
}, {timestamps: true});

module.exports = mongoose.model("OfficeGeofence", OfficeGeoFenceTable)