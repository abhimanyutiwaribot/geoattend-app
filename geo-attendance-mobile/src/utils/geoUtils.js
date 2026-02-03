/**
 * Geospatial utility functions
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng || polygon[i].longitude;
    const yi = polygon[i].lat || polygon[i].latitude;
    const xj = polygon[j].lng || polygon[j].longitude;
    const yj = polygon[j].lat || polygon[j].latitude;

    const intersect = ((yi > point.latitude) !== (yj > point.latitude))
      && (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Get center point of a polygon
 */
export function getPolygonCenter(polygon) {
  const latSum = polygon.reduce((sum, p) => sum + (p.lat || p.latitude), 0);
  const lngSum = polygon.reduce((sum, p) => sum + (p.lng || p.longitude), 0);

  return {
    lat: latSum / polygon.length,
    lng: lngSum / polygon.length
  };
}
