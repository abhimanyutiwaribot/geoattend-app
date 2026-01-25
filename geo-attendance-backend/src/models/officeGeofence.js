const mongoose = require("mongoose");

const OfficeGeoFenceTable = new mongoose.Schema({
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['circle', 'polygon'],
        default: 'circle'
    },
    // For circle type only
    center: {
        lat: { type: Number },
        lng: { type: Number }
    },
    radius: {
        type: Number
        // No default - only set for circle type
    },
    // For polygon type only
    polygon: [{
        lat: { type: Number },
        lng: { type: Number }
    }]
}, { timestamps: true });

// Validation: ensure correct fields are present based on type
OfficeGeoFenceTable.pre('save', function (next) {
    if (this.type === 'circle') {
        if (!this.center || !this.center.lat || !this.center.lng) {
            return next(new Error('Circle geofence requires center coordinates'));
        }
        if (!this.radius) {
            return next(new Error('Circle geofence requires radius'));
        }
    } else if (this.type === 'polygon') {
        if (!this.polygon || this.polygon.length < 3) {
            return next(new Error('Polygon geofence requires at least 3 points'));
        }
    }
    next();
});

const GeoFenceModel = mongoose.model("OfficeGeofence", OfficeGeoFenceTable)

module.exports = GeoFenceModel;