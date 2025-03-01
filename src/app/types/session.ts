import { calculateDistance, calculateBearing, SpeedData } from '../utils/calculations';
import { parseTimestamp, getTimeInMs, getTimeDifference } from '../utils/timeUtils';

export interface ClipData {
    datetime_timestamp: string;
    frameId: number;
    lat: number;
    long: number;
    distanceFromObject?: number; // Distance from the nearest object marker
    isApproachPoint?: boolean; // New field to mark if this is an approach point
    speed?: number;
    direction?: string;
    speedData?: SpeedData;
    hasInvalidFields?: boolean;
    missingFields?: string[];
    confidence?: number; // Confidence level of GPS coordinates (0-1)
}

export interface SessionData {
    id: string;
    name: string;
    color: string;
    isVisible: boolean;
    clips: ClipData[];
    invalidRowCount?: number;
}

export interface ObjectMarker {
    frameId: number;
    lat: number;
    long: number;
    sessionName: string;
    sessionColor: string;
    datetime_timestamp: string;
    approachPoints?: ApproachPoint[]; // New field to store approach points
}

// New interface for approach points
export interface ApproachPoint {
    frameId: number;
    lat: number;
    long: number;
    datetime_timestamp: string;
    distance: number;
    timeDifference: number; // Time difference in seconds from object detection
    targetDistance: number; // The target distance this point represents (50m, 100m, etc.)
    bearingToObject: number;
    speed: number;
    isInterpolated?: boolean;
}

export interface DistanceFilter {
    distance: number;
    count: number;
    isActive: boolean;
}

export const DEFAULT_DISTANCE_FILTERS: DistanceFilter[] = [
    { distance: 50, count: 0, isActive: false },
    { distance: 100, count: 0, isActive: false },
    { distance: 150, count: 0, isActive: false },
    { distance: 200, count: 0, isActive: false },
    { distance: 250, count: 0, isActive: false },
];

// Predefined colors for sessions
export const SESSION_COLORS = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEEAD', // Yellow
    '#D4A5A5', // Pink
    '#9B59B6', // Purple
    '#3498DB', // Light Blue
    '#E67E22', // Orange
    '#2ECC71', // Emerald
];

// Helper function to find approach points
export function findApproachPoints(
    clips: ClipData[],
    objectTimestamp: string,
    targetDistance: number = 50
): ApproachPoint[] {
    const objectTime = parseTimestamp(objectTimestamp);
    const sortedClips = [...clips].sort((a, b) => 
        getTimeInMs(a.datetime_timestamp) - getTimeInMs(b.datetime_timestamp)
    );

    const approachPoints: ApproachPoint[] = [];
    let foundFirstApproach = false;

    for (let i = 0; i < sortedClips.length; i++) {
        const clip = sortedClips[i];
        const clipTime = parseTimestamp(clip.datetime_timestamp);
        
        // Only look at clips before the object timestamp
        if (clipTime > objectTime) continue;

        // If this clip is around our target distance and we haven't found an approach point yet
        if (!foundFirstApproach && clip.distanceFromObject && 
            Math.abs(clip.distanceFromObject - targetDistance) < 5) { // 5m tolerance
            
            foundFirstApproach = true;
            approachPoints.push({
                frameId: clip.frameId,
                lat: clip.lat,
                long: clip.long,
                datetime_timestamp: clip.datetime_timestamp,
                distance: clip.distanceFromObject,
                timeDifference: getTimeDifference(clip.datetime_timestamp, objectTimestamp),
                targetDistance: targetDistance,
                bearingToObject: 0,
                speed: clip.speedData?.speed || 0
            });
        }
    }

    return approachPoints;
}

export interface VehicleMovement {
    frameId: number;
    timestamp: Date;
    lat: number;
    long: number;
    distanceFromStart: number;
    distanceToObject: number | null;
    isMovingTowardObject: boolean;
}

// Helper function to determine if vehicle is moving toward object
export function isMovingTowardObject(
    currentLat: number,
    currentLong: number,
    prevLat: number,
    prevLong: number,
    objectLat: number,
    objectLong: number
): boolean {
    const prevDistanceToObject = calculateDistance(prevLat, prevLong, objectLat, objectLong);
    const currentDistanceToObject = calculateDistance(currentLat, currentLong, objectLat, objectLong);
    return currentDistanceToObject < prevDistanceToObject;
}

// Enhanced function to find approach points with multiple distances
export function findFirstApproachPoint(
    clips: ClipData[],
    objectMarker: ObjectMarker,
    targetDistances: number[] = [50, 100, 150, 200, 250]
): ApproachPoint[] {
    // Try to get valid timestamp
    let objectTime: Date | null = null;
    try {
        if (objectMarker.datetime_timestamp && objectMarker.datetime_timestamp !== 'N/A') {
            objectTime = parseTimestamp(objectMarker.datetime_timestamp);
            if (isNaN(objectTime.getTime())) {
                objectTime = null;
            }
        }
    } catch (e) {
        objectTime = null;
    }
    
    // Sort clips by either timestamp (if valid) or frameId
    const sortedClips = [...clips].sort((a, b) => {
        if (objectTime) {
            try {
                const timeA = getTimeInMs(a.datetime_timestamp);
                const timeB = getTimeInMs(b.datetime_timestamp);
                if (!isNaN(timeA) && !isNaN(timeB)) {
                    return timeA - timeB;
                }
            } catch (e) {
                // Fall back to frame ID sorting
            }
        }
        return a.frameId - b.frameId;
    });

    const approachPoints: ApproachPoint[] = [];
    const foundDistances = new Set<number>();

    // Prepare point for interpolation if needed
    let prevPoint: ClipData | null = null;
    let nextPoint: ClipData | null = null;

    for (let i = 0; i < sortedClips.length; i++) {
        const clip = sortedClips[i];
        
        // Skip if we're past the object's time (when timestamp is valid)
        if (objectTime) {
            try {
                const clipTime = parseTimestamp(clip.datetime_timestamp);
                if (!isNaN(clipTime.getTime()) && clipTime > objectTime) {
                    continue;
                }
            } catch (e) {
                // Ignore timestamp comparison error and continue
            }
        }

        // Calculate distance to object
        const distanceToObject = calculateDistance(
            clip.lat, 
            clip.long, 
            objectMarker.lat, 
            objectMarker.long
        );

        prevPoint = clip;
        nextPoint = sortedClips[i + 1] || null;

        // Check each target distance
        for (const targetDistance of targetDistances) {
            if (!foundDistances.has(targetDistance)) {
                // Check if this point is close to our target distance
                if (Math.abs(distanceToObject - targetDistance) < 5) { // 5m tolerance
                    foundDistances.add(targetDistance);
                    
                    // Calculate bearing to the object
                    const bearingToObject = calculateBearing(
                        clip.lat,
                        clip.long,
                        objectMarker.lat,
                        objectMarker.long
                    );
                    
                    // Calculate time difference if possible
                    let timeDifference = 0;
                    if (objectTime) {
                        try {
                            const clipTime = parseTimestamp(clip.datetime_timestamp);
                            if (!isNaN(clipTime.getTime())) {
                                timeDifference = getTimeDifference(clip.datetime_timestamp, objectMarker.datetime_timestamp);
                            }
                        } catch (e) {
                            // Default time difference based on frames if timestamp is invalid
                            timeDifference = (objectMarker.frameId - clip.frameId) / 30; // Assuming 30fps
                        }
                    } else {
                        // Default time difference based on frames
                        timeDifference = (objectMarker.frameId - clip.frameId) / 30; // Assuming 30fps
                    }
                    
                    approachPoints.push({
                        frameId: clip.frameId,
                        lat: clip.lat,
                        long: clip.long,
                        datetime_timestamp: clip.datetime_timestamp,
                        distance: distanceToObject,
                        timeDifference: timeDifference,
                        targetDistance,
                        bearingToObject,
                        speed: clip.speedData?.speed || 0
                    });
                }
                // If we don't have exact point, but we have points on either side of target distance
                // interpolate a point at the target distance
                else if (nextPoint && 
                         distanceToObject > targetDistance && 
                         calculateDistance(nextPoint.lat, nextPoint.long, objectMarker.lat, objectMarker.long) < targetDistance) {
                    
                    // Linear interpolation to estimate the position at target distance
                    const d1 = distanceToObject;
                    const d2 = calculateDistance(nextPoint.lat, nextPoint.long, objectMarker.lat, objectMarker.long);
                    const ratio = (d1 - targetDistance) / (d1 - d2);
                    
                    const interpolatedLat = clip.lat + ratio * (nextPoint.lat - clip.lat);
                    const interpolatedLong = clip.long + ratio * (nextPoint.long - clip.long);
                    
                    // Calculate bearing to the object
                    const bearingToObject = calculateBearing(
                        interpolatedLat,
                        interpolatedLong,
                        objectMarker.lat,
                        objectMarker.long
                    );
                    
                    // Interpolate frameId
                    const interpolatedFrameId = Math.round(clip.frameId + ratio * (nextPoint.frameId - clip.frameId));
                    
                    // Calculate time difference if possible
                    let timeDifference = 0;
                    if (objectTime) {
                        try {
                            const clipTime = parseTimestamp(clip.datetime_timestamp);
                            const nextTime = parseTimestamp(nextPoint.datetime_timestamp);
                            
                            if (!isNaN(clipTime.getTime()) && !isNaN(nextTime.getTime())) {
                                const interpolatedTime = clipTime.getTime() + ratio * (nextTime.getTime() - clipTime.getTime());
                                timeDifference = (objectTime.getTime() - interpolatedTime) / 1000;
                            }
                        } catch (e) {
                            // Default time difference based on frames if timestamp is invalid
                            timeDifference = (objectMarker.frameId - interpolatedFrameId) / 30; // Assuming 30fps
                        }
                    } else {
                        // Default time difference based on frames
                        timeDifference = (objectMarker.frameId - interpolatedFrameId) / 30; // Assuming 30fps
                    }
                    
                    // Estimate the speed at this point
                    const speed = clip.speedData?.speed || 
                                (nextPoint.speedData?.speed || 0);
                    
                    foundDistances.add(targetDistance);
                    approachPoints.push({
                        frameId: interpolatedFrameId,
                        lat: interpolatedLat,
                        long: interpolatedLong,
                        datetime_timestamp: clip.datetime_timestamp, // Using the previous point's timestamp as reference
                        distance: targetDistance,
                        timeDifference: timeDifference,
                        targetDistance,
                        bearingToObject,
                        speed,
                        isInterpolated: true
                    });
                }
            }
        }
    }

    // Sort approach points by distance (ascending)
    return approachPoints.sort((a, b) => a.targetDistance - b.targetDistance);
}

export type TimeFilter = 'before' | 'after' | 'all' | 'none';

export interface TimeFilterOption {
    value: TimeFilter;
    label: string;
    description: string;
}

export const TIME_FILTER_OPTIONS: TimeFilterOption[] = [
    { 
        value: 'before', 
        label: 'Before Object', 
        description: 'Show only markers before reaching the object' 
    },
    { 
        value: 'after', 
        label: 'After Object', 
        description: 'Show only markers after passing the object' 
    },
    { 
        value: 'all', 
        label: 'All Markers', 
        description: 'Show all markers' 
    },
    { 
        value: 'none', 
        label: 'None', 
        description: 'Hide all markers (keep only distance indicators)' 
    }
]; 