import { getDistanceInMeters, isWithinGeofence } from '../src/lib/geo.js';
import { GeoPoint } from '../src/lib/types.js';

describe('Geo Library', () => {
  const point1: GeoPoint = { lat: 40.7128, lng: -74.0060 }; // New York
  const point2: GeoPoint = { lat: 34.0522, lng: -118.2437 }; // Los Angeles
  const point3: GeoPoint = { lat: 40.7129, lng: -74.0061 }; // Near New York

  it('should calculate the distance between two points correctly', () => {
    const distance = getDistanceInMeters(point1, point2);
    expect(distance).toBeCloseTo(3935746, 0); // Approximately 3936 km
  });

  it('should return true if a point is within the geofence', () => {
    expect(isWithinGeofence(point3, point1, 150)).toBe(true);
  });

  it('should return false if a point is outside the geofence', () => {
    expect(isWithinGeofence(point2, point1, 150)).toBe(false);
  });
});
