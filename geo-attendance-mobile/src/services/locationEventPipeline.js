/**
 * EVENT-DRIVEN LOCATION PIPELINE
 * 
 * Flow: Location Event → Validation → Smoothing → Geofence → State Machine → Business Logic
 * 
 * No loops. No timers. Pure event-driven.
 */

import { calculateDistance } from '../utils/geoUtils';

// ============================================================================
// LAYER 1: VALIDATION
// ============================================================================

/**
 * Validates incoming location events
 * Filters out: mock locations, poor accuracy, impossible jumps
 */
export class LocationValidator {
  constructor(config = {}) {
    this.maxAccuracy = config.maxAccuracy || 20; // meters
    this.maxSpeed = config.maxSpeed || 33.33; // m/s (~120 km/h)
    this.lastValidLocation = null;
    this.lastValidTimestamp = null;
  }

  /**
   * Validate a location event
   * @returns {object|null} Validated location or null if invalid
   */
  validate(locationEvent) {
    const { coords, timestamp } = locationEvent;

    // Check for mock location
    if (coords.mocked) {
      console.log('🚫 [Validator] Rejected: Mock location detected');
      return null;
    }

    // Accuracy filter
    if (coords.accuracy > this.maxAccuracy) {
      console.log('🚫 [Validator] Rejected: Poor accuracy', coords.accuracy);
      return null;
    }

    // First location - accept
    if (!this.lastValidLocation) {
      this.lastValidLocation = coords;
      this.lastValidTimestamp = timestamp;
      console.log('✅ [Validator] First location accepted');
      return locationEvent;
    }

    // Check for impossible movement
    const distance = calculateDistance(
      this.lastValidLocation.latitude,
      this.lastValidLocation.longitude,
      coords.latitude,
      coords.longitude
    );

    const timeDiff = (timestamp - this.lastValidTimestamp) / 1000; // seconds
    const speed = distance / timeDiff;

    if (speed > this.maxSpeed) {
      console.log('🚫 [Validator] Rejected: Impossible speed', {
        distance: distance.toFixed(2),
        timeDiff: timeDiff.toFixed(2),
        speed: speed.toFixed(2)
      });
      return null;
    }

    // Update last valid
    this.lastValidLocation = coords;
    this.lastValidTimestamp = timestamp;

    console.log('✅ [Validator] Location validated');
    return locationEvent;
  }

  reset() {
    this.lastValidLocation = null;
    this.lastValidTimestamp = null;
  }
}

// ============================================================================
// LAYER 2: SMOOTHING
// ============================================================================

/**
 * Smooths location data to remove jitter
 * Uses moving average of last N points
 */
export class LocationSmoother {
  constructor(bufferSize = 2) {
    this.buffer = [];
    this.bufferSize = bufferSize;
  }

  /**
   * Add location to buffer and return smoothed coordinates
   */
  smooth(locationEvent) {
    const { coords, timestamp } = locationEvent;

    // Add to buffer
    this.buffer.push({ ...coords }); // Deep copy
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }

    // Need at least 2 points for smoothing
    if (this.buffer.length < 2) {
      return locationEvent;
    }

    // Calculate average
    const smoothedCoords = {
      latitude: this.buffer.reduce((sum, c) => sum + c.latitude, 0) / this.buffer.length,
      longitude: this.buffer.reduce((sum, c) => sum + c.longitude, 0) / this.buffer.length,
      accuracy: Math.max(...this.buffer.map(c => c.accuracy)),
      altitude: coords.altitude,
      heading: coords.heading,
      speed: coords.speed,
      mocked: coords.mocked
    };

    console.log(`📊 [Smoother] Raw: [${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}] | Smoothed: [${smoothedCoords.latitude.toFixed(6)}, ${smoothedCoords.longitude.toFixed(6)}]`);

    return {
      coords: smoothedCoords,
      timestamp,
      isSmoothed: true
    };
  }

  reset() {
    this.buffer = [];
  }
}

// ============================================================================
// LAYER 3: GEOFENCE ENGINE
// ============================================================================

/**
 * Calculates geofence status for each location event
 */
export class GeofenceEngine {
  constructor() {
    this.geofence = null;
  }

  setGeofence(geofence) {
    this.geofence = geofence;
    console.log('🏢 [Geofence] Geofence configured:', geofence?.name || 'None');
  }

  /**
   * Check if location is within geofence
   * @returns {object} { isWithin, distance, geofenceName }
   */
  check(locationEvent) {
    const { coords } = locationEvent;

    if (!this.geofence) {
      console.log('⚠️ [Geofence] No geofence configured in engine');
      return { isWithin: null, distance: null, geofenceName: null };
    }

    let distance = 0;
    let isWithin = false;

    try {
      if (this.geofence.type === 'circle') {
        if (!this.geofence.center || this.geofence.center.lat === undefined) {
          console.log('❌ [Geofence] Circle config error: Missing center');
          return { isWithin: false, distance: null, geofenceName: this.geofence.name };
        }

        distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          this.geofence.center.lat,
          this.geofence.center.lng
        );
        isWithin = distance <= this.geofence.radius;
        console.log(`� [Geofence Check] Type: CIRCLE | Result: ${isWithin ? 'INSIDE' : 'OUTSIDE'} | Dist: ${distance.toFixed(1)}m | Radius: ${this.geofence.radius}m`);
      } else if (this.geofence.type === 'polygon') {
        if (!this.geofence.polygon || this.geofence.polygon.length === 0) {
          console.log('❌ [Geofence] Polygon config error: Empty polygon array');
          return { isWithin: false, distance: null, geofenceName: this.geofence.name };
        }

        const center = this._getPolygonCenter(this.geofence.polygon);
        distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          center.lat,
          center.lng
        );
        isWithin = this._isPointInPolygon(coords, this.geofence.polygon);
        // _isPointInPolygon already logs its result, but we'll add one here for consistency
        console.log(`� [Geofence Check] Type: POLYGON | Result: ${isWithin ? 'INSIDE' : 'OUTSIDE'} | Dist to Center: ${distance.toFixed(1)}m`);
      } else {
        console.log(`❓ [Geofence] Unknown geofence type: ${this.geofence.type}`);
      }
    } catch (err) {
      console.error('❌ [Geofence] Engine error during check:', err.message);
    }

    return {
      isWithin,
      distance,
      geofenceName: this.geofence.name
    };
  }

  _getPolygonCenter(polygon) {
    const latSum = polygon.reduce((sum, p) => sum + p.lat, 0);
    const lngSum = polygon.reduce((sum, p) => sum + p.lng, 0);
    return {
      lat: latSum / polygon.length,
      lng: lngSum / polygon.length
    };
  }

  _isPointInPolygon(point, polygon) {
    // Point: { latitude: Y, longitude: X }
    // Polygon: [{ lat: Y, lng: X }]
    const x = point.longitude;
    const y = point.latitude;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;

      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

      if (intersect) inside = !inside;
    }

    console.log(`🎯 [Geofence Check] Point: [${x.toFixed(6)}, ${y.toFixed(6)}] | Polygon Corners: ${polygon.length} | Result: ${inside ? 'INSIDE' : 'OUTSIDE'}`);
    return inside;
  }
}

// ============================================================================
// LAYER 4: STATE MACHINE
// ============================================================================

/**
 * Tracks geofence state transitions with debouncing
 * States: INSIDE, OUTSIDE
 * Events: ENTRY, EXIT
 */
export class GeofenceStateMachine {
  constructor(config = {}) {
    this.currentState = null;
    this.debounceTime = 0; // Temporarily 0 for real-time debugging (revert later)
    this.pendingTransition = null;
    this.transitionTimer = null;
    this.listeners = [];
  }

  /**
   * Process geofence status and emit events on state change
   */
  process(geofenceStatus) {
    const { isWithin } = geofenceStatus;
    console.log("bool:", isWithin)

    if (isWithin === null) {
      return; // No geofence configured
    }

    const newState = isWithin ? 'INSIDE' : 'OUTSIDE';

    // First state
    if (this.currentState === null) {
      this.currentState = newState;
      console.log(`🔄 [StateMachine] Initial state: ${newState}`);
      return;
    }

    // No change
    if (this.currentState === newState) {
      // Cancel any pending transition
      if (this.pendingTransition) {
        clearTimeout(this.transitionTimer);
        this.pendingTransition = null;
        console.log('🔄 [StateMachine] Transition cancelled - back to stable state');
      }
      return;
    }

    // State change detected
    const event = newState === 'INSIDE' ? 'ENTRY' : 'EXIT';

    // Start debounce timer if not already pending
    if (!this.pendingTransition) {
      this.pendingTransition = { newState, event };
      console.log(`🔄 [StateMachine] Pending ${event} - debouncing for ${this.debounceTime / 1000}s`);

      this.transitionTimer = setTimeout(() => {
        // Confirm transition
        this.currentState = newState;
        console.log(`🔄 [StateMachine] State transition confirmed: ${event}`);

        // Emit event to listeners
        this._emitEvent(event, geofenceStatus);

        this.pendingTransition = null;
      }, this.debounceTime);
    }
  }

  /**
   * Subscribe to state transition events
   */
  onTransition(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _emitEvent(event, geofenceStatus) {
    this.listeners.forEach(callback => {
      try {
        callback(event, geofenceStatus);
      } catch (error) {
        console.error('Error in state machine listener:', error);
      }
    });
  }

  reset() {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
    }
    this.currentState = null;
    this.pendingTransition = null;
    this.transitionTimer = null;
  }

  getState() {
    return this.currentState;
  }
}

// ============================================================================
// LAYER 5: EVENT PIPELINE (Orchestrator)
// ============================================================================

/**
 * Orchestrates the entire event pipeline
 * Location Event → Validator → Smoother → Geofence → State Machine
 */
export class LocationEventPipeline {
  constructor(config = {}) {
    this.validator = new LocationValidator(config.validator);
    this.smoother = new LocationSmoother(config.smootherBufferSize);
    this.geofenceEngine = new GeofenceEngine();
    this.stateMachine = new GeofenceStateMachine(config.stateMachine);
    this.listeners = [];
  }

  /**
   * Process a raw location event through the pipeline
   */
  async process(rawLocationEvent) {
    console.log('🔵 [Pipeline] New location event received');

    // Layer 0: Check geofence BEFORE validation (ensures log visibility)
    const initialGeofence = this.geofenceEngine.check(rawLocationEvent);

    // Layer 1: Validation
    const validatedEvent = this.validator.validate(rawLocationEvent);
    if (!validatedEvent) {
      console.log(`🔴 [Pipeline] Rejected (Accuracy: ${rawLocationEvent.coords.accuracy.toFixed(1)}m > ${this.validator.maxAccuracy}m)`);

      // Still emit event so UI can show the status, but marked as invalid
      this._emitEvent({
        location: rawLocationEvent,
        geofence: initialGeofence,
        isValid: false,
        state: this.stateMachine.getState(),
        timestamp: rawLocationEvent.timestamp
      });
      return null;
    }

    // Layer 2: Smoothing
    const smoothedEvent = this.smoother.smooth(validatedEvent);

    // Layer 3: Geofence Check
    const geofenceStatus = this.geofenceEngine.check(smoothedEvent);

    // DEBUG: Check raw status to see if smoothing is causing lag
    const rawGeofenceStatus = this.geofenceEngine.check(validatedEvent);
    if (rawGeofenceStatus.isWithin !== geofenceStatus.isWithin) {
      console.log(`⚠️ [Pipeline] Lag Detected! Raw: ${rawGeofenceStatus.isWithin ? 'INSIDE' : 'OUTSIDE'} | Smoothed: ${geofenceStatus.isWithin ? 'INSIDE' : 'OUTSIDE'}`);
    }

    // Layer 4: State Machine
    this.stateMachine.process(geofenceStatus);

    // Emit processed event to listeners
    const processedEvent = {
      location: smoothedEvent,
      geofence: geofenceStatus,
      state: this.stateMachine.getState(),
      timestamp: rawLocationEvent.timestamp
    };

    this._emitEvent(processedEvent);

    console.log('🟢 [Pipeline] Event processed successfully');
    return processedEvent;
  }

  /**
   * Subscribe to processed location events
   */
  onLocationUpdate(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to geofence transition events
   */
  onGeofenceTransition(callback) {
    return this.stateMachine.onTransition(callback);
  }

  /**
   * Configure geofence
   */
  setGeofence(geofence) {
    this.geofenceEngine.setGeofence(geofence);
  }

  /**
   * Reset pipeline (e.g., when session ends)
   */
  reset() {
    this.validator.reset();
    this.smoother.reset();
    this.stateMachine.reset();
    console.log('🔄 [Pipeline] Reset complete');
  }

  _emitEvent(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in pipeline listener:', error);
      }
    });
  }
}
