const GeoFenceModel = require("../models/officeGeofence");

class GeofenceService {
    // Calculate distance between two points using Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance;
    }

    toRad(degrees) {
        return degrees * (Math.PI/180);
    }

    // Check if user is within any office geofence
    async isWithinGeofence(userLat, userLng) {
        try {
            const geofences = await GeoFenceModel.find();
            
            for (let geofence of geofences) {
                const distance = this.calculateDistance(
                    userLat, 
                    userLng, 
                    geofence.center.lat, 
                    geofence.center.lng
                );
                
                if (distance <= geofence.radius) {
                    return {
                        isWithin: true,
                        geofence: geofence,
                        distance: distance
                    };
                }
            }
            
            return {
                isWithin: false,
                geofence: null,
                distance: null
            };
        } catch (error) {
            throw new Error(`Geofence check failed: ${error.message}`);
        }
    }
}

module.exports = new GeofenceService();