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
  constructor(bufferSize = 3) {
    this.buffer = [];
    this.bufferSize = bufferSize;
  }

  /**
   * Add location to buffer and return smoothed coordinates
   */
  smooth(locationEvent) {
    const { coords, timestamp } = locationEvent;

    // Add to buffer
    this.buffer.push(coords);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }

    // Need at least 2 points for smoothing
    if (this.buffer.length < 2) {
      console.log('📊 [Smoother] Buffering... (', this.buffer.length, '/', this.bufferSize, ')');
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

    console.log('📊 [Smoother] Smoothed location (avg of', this.buffer.length, 'points)');

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
      console.log('⚠️ [Geofence] No geofence configured');
      return {
        isWithin: null,
        distance: null,
        geofenceName: null
      };
    }

    let distance;
    let isWithin;

    if (this.geofence.type === 'circle') {
      // Circle geofence
      distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        this.geofence.center.lat,
        this.geofence.center.lng
      );
      isWithin = distance <= this.geofence.radius;
    } else if (this.geofence.type === 'polygon') {
      // Polygon geofence (simplified - using center point for now)
      const center = this._getPolygonCenter(this.geofence.polygon);
      distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        center.lat,
        center.lng
      );
      isWithin = this._isPointInPolygon(coords, this.geofence.polygon);
    }

    const status = isWithin ? 'INSIDE' : 'OUTSIDE';
    console.log(`🏢 [Geofence] Status: ${status} (${distance.toFixed(1)}m)`);

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
    // Ray casting algorithm
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      const intersect = ((yi > point.latitude) !== (yj > point.latitude))
        && (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
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
    this.debounceTime = config.debounceTime || 30000; // 30 seconds
    this.pendingTransition = null;
    this.transitionTimer = null;
    this.listeners = [];
  }

  /**
   * Process geofence status and emit events on state change
   */
  process(geofenceStatus) {
    const { isWithin } = geofenceStatus;

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

    // Layer 1: Validation
    const validatedEvent = this.validator.validate(rawLocationEvent);
    if (!validatedEvent) {
      console.log('🔴 [Pipeline] Event rejected by validator');
      return null;
    }

    // Layer 2: Smoothing
    const smoothedEvent = this.smoother.smooth(validatedEvent);

    // Layer 3: Geofence Check
    const geofenceStatus = this.geofenceEngine.check(smoothedEvent);

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
