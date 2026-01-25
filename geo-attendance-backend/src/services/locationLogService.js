const LocationLog = require('../models/locationLog');
const GeofenceService = require('./geofenceService');

class LocationLogService {
  /**
   * Log a location point with automatic geofence status detection
   */
  async logLocation(userId, attendanceId, location, metadata = {}) {
    try {
      // Check geofence status
      const geofenceCheck = await GeofenceService.isWithinGeofence(
        location.lat,
        location.lng,
        userId
      );

      // Get previous location to detect enter/exit events
      const previousLog = await LocationLog.findOne({
        userId,
        attendanceId
      }).sort({ timestamp: -1 });

      let eventType = 'periodic';

      // Detect enter/exit events
      if (previousLog) {
        const wasInside = previousLog.isInside;
        const isInside = geofenceCheck.isWithin;

        if (!wasInside && isInside) {
          eventType = 'enter';
        } else if (wasInside && !isInside) {
          eventType = 'exit';
        }
      }

      // Create location log
      const locationLog = new LocationLog({
        userId,
        attendanceId,
        location: {
          lat: location.lat,
          lng: location.lng
        },
        accuracy: location.accuracy || 0,
        isInside: geofenceCheck.isWithin,
        geofenceId: geofenceCheck.geofence?._id,
        distance: geofenceCheck.distance || 0,
        eventType,
        metadata: {
          speed: metadata.speed,
          altitude: metadata.altitude,
          heading: metadata.heading,
          isMock: metadata.isMock || false
        }
      });

      await locationLog.save();

      return {
        success: true,
        locationLog,
        eventType,
        geofenceStatus: geofenceCheck
      };
    } catch (error) {
      console.error('Location logging error:', error);
      throw error;
    }
  }

  /**
   * Get location history for a user
   */
  async getLocationHistory(userId, startDate, endDate, attendanceId = null) {
    const query = {
      userId,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (attendanceId) {
      query.attendanceId = attendanceId;
    }

    return await LocationLog.find(query)
      .sort({ timestamp: 1 })
      .populate('geofenceId', 'name type');
  }

  /**
   * Analyze location consistency for anomaly detection
   */
  async analyzeLocationConsistency(userId, attendanceId, timeWindow = 30) {
    const since = new Date(Date.now() - timeWindow * 60 * 1000);

    const locations = await LocationLog.find({
      userId,
      attendanceId,
      timestamp: { $gte: since }
    }).sort({ timestamp: 1 });

    if (locations.length < 2) {
      return {
        score: 100,
        flags: [],
        anomalies: []
      };
    }

    let score = 100;
    const flags = [];
    const anomalies = [];

    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];

      const distance = this.calculateDistance(
        prev.location.lat,
        prev.location.lng,
        curr.location.lat,
        curr.location.lng
      );

      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds

      // Skip very short time intervals (< 3 seconds) - GPS noise
      if (timeDiff < 3) continue;

      const velocity = distance / timeDiff; // m/s

      // Only flag if distance is significant AND velocity is impossible
      // Ignore small GPS drift (< 50 meters)
      if (distance > 50 && velocity > 100) {
        // Very strict: only flag truly impossible velocities (>360 km/h)
        score -= 15; // Reduced penalty
        flags.push('impossible_velocity');
        anomalies.push({
          type: 'impossible_velocity',
          velocity: velocity.toFixed(2),
          distance: distance.toFixed(2),
          timeDiff: timeDiff.toFixed(2),
          timestamp: curr.timestamp
        });
      }

      // Flag large jumps (>1000m in <5min) - more lenient
      if (distance > 1000 && timeDiff < 300) {
        score -= 10; // Reduced penalty
        flags.push('location_jump');
        anomalies.push({
          type: 'location_jump',
          distance: distance.toFixed(2),
          timeDiff: timeDiff.toFixed(2),
          timestamp: curr.timestamp
        });
      }

      // Flag mock location
      if (curr.metadata?.isMock) {
        score -= 40;
        flags.push('mock_location');
      }
    }

    return {
      score: Math.max(0, score),
      flags: [...new Set(flags)],
      anomalies
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg) => deg * (Math.PI / 180);

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get enter/exit events for a user
   */
  async getGeofenceEvents(userId, startDate, endDate) {
    return await LocationLog.find({
      userId,
      eventType: { $in: ['enter', 'exit'] },
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ timestamp: 1 });
  }
}

module.exports = new LocationLogService();
