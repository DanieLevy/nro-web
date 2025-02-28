import { calculateDistance } from '../utils/calculations';

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

// Helper function to parse timestamp string into Date object
export function parseTimestamp(timestamp: string): Date {
    return new Date(timestamp);
}

// Helper function to find approach points
export function findApproachPoints(
    clips: ClipData[],
    objectTimestamp: string,
    targetDistance: number = 50
): ApproachPoint[] {
    const objectTime = parseTimestamp(objectTimestamp);
    const sortedClips = [...clips].sort((a, b) => 
        parseTimestamp(a.datetime_timestamp).getTime() - parseTimestamp(b.datetime_timestamp).getTime()
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
                timeDifference: (objectTime.getTime() - clipTime.getTime()) / 1000,
                targetDistance: targetDistance
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
    const objectTime = parseTimestamp(objectMarker.datetime_timestamp);
    const sortedClips = [...clips].sort((a, b) => 
        parseTimestamp(a.datetime_timestamp).getTime() - parseTimestamp(b.datetime_timestamp).getTime()
    );

    const approachPoints: ApproachPoint[] = [];
    const foundDistances = new Set<number>();

    for (let i = 0; i < sortedClips.length; i++) {
        const clip = sortedClips[i];
        const clipTime = parseTimestamp(clip.datetime_timestamp);
        
        // Skip if we're past the object's time
        if (clipTime > objectTime) continue;

        // Calculate distance to object
        const distanceToObject = calculateDistance(
            clip.lat, 
            clip.long, 
            objectMarker.lat, 
            objectMarker.long
        );

        // Check each target distance
        for (const targetDistance of targetDistances) {
            if (!foundDistances.has(targetDistance) && 
                Math.abs(distanceToObject - targetDistance) < 5) { // 5m tolerance
                
                foundDistances.add(targetDistance);
                approachPoints.push({
                    frameId: clip.frameId,
                    lat: clip.lat,
                    long: clip.long,
                    datetime_timestamp: clip.datetime_timestamp,
                    distance: distanceToObject,
                    timeDifference: (objectTime.getTime() - clipTime.getTime()) / 1000,
                    targetDistance
                });
            }
        }
    }

    // Sort approach points by distance (ascending)
    return approachPoints.sort((a, b) => a.targetDistance - b.targetDistance);
}

export type TimeFilter = 'before' | 'after' | 'all';

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
    }
]; 