const GeoFenceModel = require("../models/officeGeofence");

class GeofenceService {
    // Calculate distance between two points using Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance;
    }

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Check if user is within their assigned office geofence
    async isWithinGeofence(userLat, userLng, userId = null) {
        try {
            let geofences;

            // If userId provided, get only their assigned office
            if (userId) {
                const UserModel = require('../models/user');
                const user = await UserModel.findById(userId).populate('assignedOfficeId');

                if (user && user.assignedOfficeId) {
                    // User has assigned office - check only that one
                    geofences = [user.assignedOfficeId];
                } else {
                    // User has no assigned office - check all (backward compatibility)
                    geofences = await GeoFenceModel.find();
                }
            } else {
                // No userId provided - check all geofences (backward compatibility)
                geofences = await GeoFenceModel.find();
            }


            let closestGeofence = null;
            let closestDistance = Infinity;

            for (let geofence of geofences) {
                let isInside = false;
                let distance = null;

                if (geofence.type === 'polygon' && geofence.polygon && geofence.polygon.length > 0) {
                    // Check if point is inside polygon
                    isInside = this.isPointInPolygon(userLat, userLng, geofence.polygon);

                    // Calculate distance to polygon center for tracking
                    const center = this.getPolygonCenter(geofence.polygon);
                    distance = this.calculateDistance(userLat, userLng, center.lat, center.lng);
                } else {
                    // Circle geofence (default)
                    distance = this.calculateDistance(
                        userLat,
                        userLng,
                        geofence.center.lat,
                        geofence.center.lng
                    );
                    isInside = distance <= geofence.radius;
                }

                // Track closest geofence
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestGeofence = geofence;
                }

                if (isInside) {
                    return {
                        isWithin: true,
                        geofence: geofence,
                        distance: distance
                    };
                }
            }

            // Return closest geofence info even when outside
            return {
                isWithin: false,
                geofence: closestGeofence,
                distance: closestDistance !== Infinity ? closestDistance : null
            };
        } catch (error) {
            throw new Error(`Geofence check failed: ${error.message}`);
        }
    }

    // Check if point is inside polygon using ray-casting algorithm
    isPointInPolygon(lat, lng, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat, yi = polygon[i].lng;
            const xj = polygon[j].lat, yj = polygon[j].lng;

            const intersect = ((yi > lng) !== (yj > lng))
                && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // Calculate center of polygon
    getPolygonCenter(polygon) {
        let latSum = 0;
        let lngSum = 0;
        for (let point of polygon) {
            latSum += point.lat;
            lngSum += point.lng;
        }
        return {
            lat: latSum / polygon.length,
            lng: lngSum / polygon.length
        };
    }
}

module.exports = new GeofenceService();