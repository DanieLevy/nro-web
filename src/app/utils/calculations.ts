// Calculate distance between two points using Haversine formula
import { getTimeInMs } from './timeUtils';

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula for more accurate earth distance calculations
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in meters
}

export function calculateTimeInterval(framesDiff: number, fps: number): number {
    // Time per frame = 1/FPS seconds
    const timePerFrame = 1 / fps;
    return framesDiff * timePerFrame;
}

export function calculateSpeed(
    distance: number,  // in meters
    timeInterval: number  // in seconds
): number {
    if (timeInterval <= 0 || !isFinite(timeInterval)) {
        return 0;
    }
    // Calculate speed in m/s
    const speedMS = distance / timeInterval;
    // Convert to km/h (1 m/s = 3.6 km/h)
    return speedMS * 3.6;
}

export interface SpeedData {
    distance: number;     // Distance in meters
    duration: number;     // Duration in seconds
    speed: number;        // Speed in km/h
    speedMS: number;      // Speed in m/s
    bearing: number;      // Heading in degrees (0-360)
    timestamp: number;    // Timestamp when calculated
    reliability?: number; // Reliability score (0-1)
    acceleration?: number; // Acceleration in m/s²
}

// Calculate bearing between two points
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    
    // Normalize to 0-360 degrees
    bearing = (bearing + 360) % 360;
    
    return bearing;
}

// Enhanced speed calculation with error handling, smoothing and reliability assessment
export function calculateSpeedBetweenPoints(
    lat1: number, lon1: number, lat2: number, lon2: number,
    frame1: number, frame2: number, fps: number,
    timestamp?: string,
    prevSpeed?: number
): SpeedData {
    // Calculate distance in meters
    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    
    // Calculate time difference in seconds based on frame rate
    const frameDiff = Math.abs(frame2 - frame1);
    const duration = frameDiff / fps;
    
    // Handle potential division by zero or very small durations
    if (duration < 0.001) {
        return {
            distance,
            duration: 0,
            speed: 0,
            speedMS: 0,
            bearing: calculateBearing(lat1, lon1, lat2, lon2),
            timestamp: timestamp ? getTimeInMs(timestamp) : Date.now(),
            reliability: 0
        };
    }
    
    // Calculate speed in m/s and km/h
    const speedMS = distance / duration;
    const speed = speedMS * 3.6; // Convert m/s to km/h
    
    // Calculate acceleration if previous speed is available
    let acceleration = undefined;
    if (prevSpeed !== undefined) {
        const prevSpeedMS = prevSpeed / 3.6; // Convert km/h to m/s
        acceleration = (speedMS - prevSpeedMS) / duration;
    }
    
    // Calculate reliability based on potential GPS errors and physical limitations
    // Lower reliability for very high speeds or accelerations
    let reliability = 1.0;
    
    // Check for unrealistic speeds (e.g., > 200 km/h)
    if (speed > 200) {
        reliability *= 0.2;
    } else if (speed > 150) {
        reliability *= 0.6;
    } else if (speed > 120) {
        reliability *= 0.8;
    }
    
    // Check for unrealistic accelerations (> 3g or ~30 m/s²)
    if (acceleration !== undefined) {
        const absAccel = Math.abs(acceleration);
        if (absAccel > 30) {
            reliability *= 0.1;
        } else if (absAccel > 20) {
            reliability *= 0.4;
        } else if (absAccel > 10) {
            reliability *= 0.7;
        }
    }
    
    return {
        distance,
        duration,
        speed,
        speedMS,
        bearing: calculateBearing(lat1, lon1, lat2, lon2),
        timestamp: timestamp ? getTimeInMs(timestamp) : Date.now(),
        reliability,
        acceleration
    };
}

// Calculate if a point is within a radius of another point
export function isPointWithinRadius(
    lat1: number, lon1: number, 
    lat2: number, lon2: number, 
    radiusMeters: number
): boolean {
    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= radiusMeters;
}

// Calculate the coordinates of a point at a specific distance and bearing from another point
export function calculateDestinationPoint(
    lat: number, lon: number, 
    distanceMeters: number, 
    bearingDegrees: number
): { lat: number; long: number } {
    const R = 6371000; // Earth radius in meters
    const δ = distanceMeters / R;
    const θ = bearingDegrees * Math.PI / 180;
    
    const φ1 = lat * Math.PI / 180;
    const λ1 = lon * Math.PI / 180;
    
    const φ2 = Math.asin(
        Math.sin(φ1) * Math.cos(δ) +
        Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    );
    
    const λ2 = λ1 + Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );
    
    return {
        lat: φ2 * 180 / Math.PI,
        long: λ2 * 180 / Math.PI
    };
}

// Advanced Kalman filter for GPS coordinate smoothing with speed awareness
export function kalmanSmoothCoordinates(
    coordinates: {lat: number; long: number; timestamp?: number | string; speed?: number}[]
): {lat: number; long: number; timestamp?: number; speed?: number}[] {
    if (coordinates.length <= 2) {
        return [...coordinates];
    }
    
    // Initialize Kalman filter parameters
    const result = [];
    
    // Process and measurement noise parameters (tune these based on GPS accuracy)
    const Q_lat = 0.00001;  // Process noise covariance for latitude
    const Q_lon = 0.00001;  // Process noise covariance for longitude
    const R_lat = 0.00005;  // Measurement noise covariance for latitude
    const R_lon = 0.00005;  // Measurement noise covariance for longitude
    
    // Initial state
    let x_lat = coordinates[0].lat;
    let x_lon = coordinates[0].long;
    let P_lat = 1.0;  // Initial estimate error covariance
    let P_lon = 1.0;
    
    // Keep the first point unchanged
    result.push({...coordinates[0]});
    
    // Process remaining points
    for (let i = 1; i < coordinates.length; i++) {
        const point = coordinates[i];
        
        // Time update (prediction)
        // Since we don't have a motion model, we assume position remains the same
        // but uncertainty increases
        P_lat += Q_lat;
        P_lon += Q_lon;
        
        // Measurement update (correction)
        // Calculate Kalman gain
        const K_lat = P_lat / (P_lat + R_lat);
        const K_lon = P_lon / (P_lon + R_lon);
        
        // Update state with measurement
        x_lat += K_lat * (point.lat - x_lat);
        x_lon += K_lon * (point.long - x_lon);
        
        // Update estimate error covariance
        P_lat = (1 - K_lat) * P_lat;
        P_lon = (1 - K_lon) * P_lon;
        
        // Save the filtered position
        result.push({
            lat: x_lat,
            long: x_lon,
            timestamp: point.timestamp,
            speed: point.speed
        });
    }
    
    return result;
}

// Standard rolling window smoothing algorithm
export function smoothCoordinates(
    coordinates: {lat: number; long: number; timestamp?: number | string; speed?: number}[],
    windowSize: number = 3
): {lat: number; long: number; timestamp?: number | string; speed?: number}[] {
    if (coordinates.length <= windowSize) {
        return [...coordinates];
    }
    
    const result = [];
    
    // Keep first point
    result.push({...coordinates[0]});
    
    // Apply smoothing to middle points
    for (let i = 1; i < coordinates.length - 1; i++) {
        const windowStart = Math.max(0, i - Math.floor(windowSize / 2));
        const windowEnd = Math.min(coordinates.length - 1, i + Math.floor(windowSize / 2));
        
        let sumLat = 0, sumLong = 0, sumSpeed = 0;
        let count = 0;
        
        for (let j = windowStart; j <= windowEnd; j++) {
            sumLat += coordinates[j].lat;
            sumLong += coordinates[j].long;
            if (coordinates[j].speed !== undefined) {
                sumSpeed += coordinates[j].speed;
            }
            count++;
        }
        
        result.push({
            lat: sumLat / count,
            long: sumLong / count,
            timestamp: coordinates[i].timestamp,
            speed: coordinates[i].speed !== undefined ? sumSpeed / count : undefined
        });
    }
    
    // Keep last point
    result.push({...coordinates[coordinates.length - 1]});
    
    return result;
}

// Calculate a comprehensive speed profile for an entire track
export function calculateSpeedProfile(
    track: {lat: number; long: number; frameId: number; datetime_timestamp?: string}[], 
    fps: number = 30
): {
    distances: number[],  // Distances between consecutive points (meters)
    speeds: number[],     // Speed at each point (km/h)
    cumulativeDistance: number[],  // Cumulative distance traveled (meters)
    smoothedSpeeds: number[],  // Smoothed speeds (km/h)
    maxSpeed: number,     // Maximum speed (km/h)
    averageSpeed: number, // Average speed (km/h)
    totalDistance: number, // Total distance (meters)
    timeIntervals: number[], // Time intervals between points (seconds)
    bearings: number[],   // Bearings at each point (degrees)
    accelerations: number[], // Accelerations at each point (m/s²)
    speedData: SpeedData[] // Complete speed data for each point
} {
    if (track.length < 2) {
        return {
            distances: [],
            speeds: [],
            cumulativeDistance: [0],
            smoothedSpeeds: [],
            maxSpeed: 0,
            averageSpeed: 0,
            totalDistance: 0,
            timeIntervals: [],
            bearings: [],
            accelerations: [],
            speedData: []
        };
    }
    
    const distances: number[] = [];
    const speeds: number[] = [];
    const cumulativeDistance: number[] = [0];
    const timeIntervals: number[] = [];
    const bearings: number[] = [];
    const accelerations: number[] = [];
    const speedData: SpeedData[] = [];
    
    let totalDistance = 0;
    let prevSpeedMS = 0;
    
    // Calculate distances, speeds, etc. between consecutive points
    for (let i = 1; i < track.length; i++) {
        const p1 = track[i-1];
        const p2 = track[i];
        
        // Calculate distance
        const distance = calculateDistance(p1.lat, p1.long, p2.lat, p2.long);
        distances.push(distance);
        totalDistance += distance;
        cumulativeDistance.push(totalDistance);
        
        // Calculate time interval
        const frameDiff = Math.abs(p2.frameId - p1.frameId);
        const duration = frameDiff / fps;
        timeIntervals.push(duration);
        
        // Calculate bearing
        const bearing = calculateBearing(p1.lat, p1.long, p2.lat, p2.long);
        bearings.push(bearing);
        
        // Calculate speed and acceleration
        const speedMS = duration > 0 ? distance / duration : 0;
        const speed = speedMS * 3.6; // Convert to km/h
        speeds.push(speed);
        
        const acceleration = duration > 0 ? (speedMS - prevSpeedMS) / duration : 0;
        accelerations.push(acceleration);
        prevSpeedMS = speedMS;
        
        // Store complete speed data
        speedData.push(calculateSpeedBetweenPoints(
            p1.lat, p1.long, p2.lat, p2.long,
            p1.frameId, p2.frameId, fps,
            p2.datetime_timestamp,
            i > 1 ? speeds[i-2] : undefined
        ));
    }
    
    // Calculate smoothed speeds using a 5-point window
    const speedsWithFirst = [speeds[0], ...speeds];
    const smoothedSpeeds = smoothValues(speedsWithFirst, 5).slice(1);
    
    // Calculate average speed
    const validSpeeds = speeds.filter(s => s > 0 && s < 200); // Filter out zeros and unrealistic speeds
    const averageSpeed = validSpeeds.length > 0 
        ? validSpeeds.reduce((sum, s) => sum + s, 0) / validSpeeds.length 
        : 0;
    
    // Calculate maximum speed
    const maxSpeed = validSpeeds.length > 0 
        ? Math.max(...validSpeeds)
        : 0;
    
    return {
        distances,
        speeds,
        cumulativeDistance,
        smoothedSpeeds,
        maxSpeed,
        averageSpeed,
        totalDistance,
        timeIntervals,
        bearings,
        accelerations,
        speedData
    };
}

// Helper function to smooth any array of numerical values
export function smoothValues(values: number[], windowSize: number = 3): number[] {
    if (values.length <= windowSize) {
        return [...values];
    }
    
    const result = [];
    
    // Keep first point
    result.push(values[0]);
    
    // Apply smoothing to middle points
    for (let i = 1; i < values.length - 1; i++) {
        const windowStart = Math.max(0, i - Math.floor(windowSize / 2));
        const windowEnd = Math.min(values.length - 1, i + Math.floor(windowSize / 2));
        
        let sum = 0;
        let count = 0;
        
        for (let j = windowStart; j <= windowEnd; j++) {
            sum += values[j];
            count++;
        }
        
        result.push(sum / count);
    }
    
    // Keep last point
    result.push(values[values.length - 1]);
    
    return result;
}

// Detect and classify specific maneuvers from a track
export function detectManeuvers(
    track: {lat: number; long: number; frameId: number; speed?: number; bearing?: number}[],
    fps: number = 30
): {
    hardBraking: {startIndex: number, endIndex: number, deceleration: number}[],
    sharpTurns: {index: number, angle: number}[],
    rapidAcceleration: {startIndex: number, endIndex: number, acceleration: number}[]
} {
    const speedProfile = track.map((p, i, arr) => {
        if (i === 0) return { ...p, speed: 0, acceleration: 0 };
        
        if (p.speed !== undefined) return p;
        
        const prevP = arr[i-1];
        const distance = calculateDistance(prevP.lat, prevP.long, p.lat, p.long);
        const duration = Math.abs(p.frameId - prevP.frameId) / fps;
        const speed = duration > 0 ? (distance / duration) * 3.6 : 0; // km/h
        
        return { ...p, speed };
    });
    
    // Calculate accelerations
    const withAcceleration = speedProfile.map((p, i, arr) => {
        if (i === 0) return { ...p, acceleration: 0 };
        
        const prevP = arr[i-1];
        const duration = Math.abs(p.frameId - prevP.frameId) / fps;
        const speedDiff = (p.speed! - prevP.speed!) / 3.6; // Convert km/h to m/s
        const acceleration = duration > 0 ? speedDiff / duration : 0; // m/s²
        
        return { ...p, acceleration };
    });
    
    // Calculate bearing changes
    const withBearing = withAcceleration.map((p, i, arr) => {
        if (i === 0) return { ...p, bearingChange: 0 };
        if (p.bearing !== undefined) return { ...p, bearingChange: 0 };
        
        const prevP = arr[i-1];
        const bearing = calculateBearing(prevP.lat, prevP.long, p.lat, p.long);
        
        let bearingChange = 0;
        if (i > 0 && prevP.bearing !== undefined) {
            bearingChange = Math.abs(bearing - prevP.bearing);
            if (bearingChange > 180) bearingChange = 360 - bearingChange;
        }
        
        return { ...p, bearing, bearingChange };
    });
    
    // Detect hard braking (deceleration < -3 m/s²)
    const hardBraking: {startIndex: number, endIndex: number, deceleration: number}[] = [];
    let brakingStart: number | null = null;
    
    for (let i = 0; i < withBearing.length; i++) {
        const accel = withBearing[i].acceleration!;
        
        if (accel < -3 && brakingStart === null) {
            brakingStart = i;
        } else if ((accel >= -3 || i === withBearing.length - 1) && brakingStart !== null) {
            const avgDecel = withBearing
                .slice(brakingStart, i)
                .reduce((sum, p) => sum + p.acceleration!, 0) / (i - brakingStart);
            
            hardBraking.push({
                startIndex: brakingStart,
                endIndex: i,
                deceleration: avgDecel
            });
            
            brakingStart = null;
        }
    }
    
    // Detect sharp turns (bearing change > 30° in a short time)
    const sharpTurns: {index: number, angle: number}[] = [];
    
    for (let i = 1; i < withBearing.length; i++) {
        const bearingChange = withBearing[i].bearingChange!;
        
        if (bearingChange > 30) {
            sharpTurns.push({
                index: i,
                angle: bearingChange
            });
        }
    }
    
    // Detect rapid acceleration (acceleration > 2.5 m/s²)
    const rapidAcceleration: {startIndex: number, endIndex: number, acceleration: number}[] = [];
    let accelStart: number | null = null;
    
    for (let i = 0; i < withBearing.length; i++) {
        const accel = withBearing[i].acceleration!;
        
        if (accel > 2.5 && accelStart === null) {
            accelStart = i;
        } else if ((accel <= 2.5 || i === withBearing.length - 1) && accelStart !== null) {
            const avgAccel = withBearing
                .slice(accelStart, i)
                .reduce((sum, p) => sum + p.acceleration!, 0) / (i - accelStart);
            
            rapidAcceleration.push({
                startIndex: accelStart,
                endIndex: i,
                acceleration: avgAccel
            });
            
            accelStart = null;
        }
    }
    
    return {
        hardBraking,
        sharpTurns,
        rapidAcceleration
    };
} 