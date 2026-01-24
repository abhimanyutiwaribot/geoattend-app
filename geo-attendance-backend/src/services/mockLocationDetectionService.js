const geoip = require('geoip-lite');
const geofenceService = require('./geofenceService');

class MockLocationDetectionService {
  constructor() {
    // GeofenceService is exported as a singleton, so we use it directly
    this.userLocationHistory = new Map(); // In-memory cache (use Redis in production)
  }

  /**
   * Validate location authenticity using multiple detection methods
   */
  async validateLocation(userId, locationData) {
    const {
      latitude,
      longitude,
      accuracy,
      speed,
      altitude,
      isMockLocation, // From client
      ipAddress
    } = locationData;

    let suspicionScore = 0;
    const flags = [];

    // 1. Client-reported mock location
    if (isMockLocation === true) {
      suspicionScore += 100;
      flags.push('CLIENT_MOCK_DETECTED');
    }

    // 2. Accuracy too perfect (< 5m consistently is suspicious)
    if (accuracy && accuracy < 5) {
      suspicionScore += 20;
      flags.push('SUSPICIOUSLY_ACCURATE');
    }

    // 3. Speed analysis (compare with last location)
    const lastLocation = this.getLastLocation(userId);
    if (lastLocation) {
      const distance = geofenceService.calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        latitude,
        longitude
      );
      const timeDiff = (Date.now() - lastLocation.timestamp) / 1000; // seconds

      if (timeDiff > 0) {
        const calculatedSpeed = distance / timeDiff; // m/s

        // > 50 m/s = 180 km/h (impossible for walking/driving in office context)
        if (calculatedSpeed > 50) {
          suspicionScore += 50;
          flags.push('IMPOSSIBLE_SPEED');
        }
      }
    }

    // 4. IP Geolocation mismatch
    if (ipAddress) {
      const ipGeo = this.getIPGeolocation(ipAddress);
      if (ipGeo && ipGeo.ll) {
        const [ipLat, ipLng] = ipGeo.ll;
        const ipDistance = geofenceService.calculateDistance(
          ipLat,
          ipLng,
          latitude,
          longitude
        );

        // > 100km mismatch suggests VPN or location spoofing
        if (ipDistance > 100000) {
          suspicionScore += 30;
          flags.push('IP_LOCATION_MISMATCH');
        }
      }
    }

    // 5. Coordinate pattern analysis (check for fake patterns)
    if (this.hasUnrealisticPattern(userId, latitude, longitude)) {
      suspicionScore += 25;
      flags.push('UNREALISTIC_PATTERN');
    }

    // Save location for future comparisons
    this.saveLocation(userId, {
      latitude,
      longitude,
      timestamp: Date.now()
    });

    return {
      isValid: suspicionScore < 50,
      suspicionScore,
      flags,
      action: suspicionScore >= 100 ? 'BLOCK' :
        suspicionScore >= 50 ? 'CHALLENGE' : 'ALLOW'
    };
  }

  /**
   * Get IP-based geolocation
   */
  getIPGeolocation(ipAddress) {
    try {
      // Skip localhost/private IPs
      if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.')) {
        return null;
      }
      return geoip.lookup(ipAddress);
    } catch (error) {
      console.error('IP geolocation error:', error);
      return null;
    }
  }

  /**
   * Check for unrealistic coordinate patterns
   */
  hasUnrealisticPattern(userId, latitude, longitude) {
    // Check if coordinates are suspiciously round (e.g., exactly 28.0000, 77.0000)
    const latDecimals = (latitude.toString().split('.')[1] || '').length;
    const lngDecimals = (longitude.toString().split('.')[1] || '').length;

    // Real GPS coordinates usually have 6+ decimal places
    if (latDecimals < 4 || lngDecimals < 4) {
      return true;
    }

    // Check if coordinates are exactly the same as last 3 readings (GPS drift should vary)
    const history = this.userLocationHistory.get(userId) || [];
    if (history.length >= 3) {
      const lastThree = history.slice(-3);
      const allSame = lastThree.every(loc =>
        loc.latitude === latitude && loc.longitude === longitude
      );
      if (allSame) {
        return true;
      }
    }

    return false;
  }

  /**
   * Save location to history
   */
  saveLocation(userId, locationData) {
    const history = this.userLocationHistory.get(userId) || [];
    history.push(locationData);

    // Keep only last 10 locations
    if (history.length > 10) {
      history.shift();
    }

    this.userLocationHistory.set(userId, history);
  }

  /**
   * Get last known location
   */
  getLastLocation(userId) {
    const history = this.userLocationHistory.get(userId) || [];
    return history.length > 0 ? history[history.length - 1] : null;
  }
}

module.exports = MockLocationDetectionService;
