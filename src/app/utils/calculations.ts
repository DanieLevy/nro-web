// Haversine formula to calculate distance between two points in meters
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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
    // Calculate speed in m/s
    const speedMS = distance / timeInterval;
    // Convert to km/h (1 m/s = 3.6 km/h)
    return speedMS * 3.6;
}

export interface SpeedData {
    distance: number;    // in meters
    speed: number;      // in km/h
    timeDiff: number;   // in seconds
    speedMS: number;    // in m/s (added for verification)
}

export function calculateSpeedBetweenPoints(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number,
    frame1: number,
    frame2: number,
    fps: number
): SpeedData {
    // 1. Calculate distance using Haversine formula
    const distance = calculateDistance(lat1, lon1, lat2, lon2);

    // 2. Calculate time interval based on frame difference and FPS
    const framesDiff = Math.abs(frame2 - frame1);
    const timeInterval = calculateTimeInterval(framesDiff, fps);

    // 3. Calculate speed in m/s
    const speedMS = distance / timeInterval;

    // 4. Convert to km/h
    const speed = speedMS * 3.6;

    return {
        distance,      // in meters
        speed,        // in km/h
        timeDiff: timeInterval,  // in seconds
        speedMS       // in m/s (for verification)
    };
} 