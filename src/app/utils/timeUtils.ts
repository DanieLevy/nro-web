/**
 * Utility functions for handling timestamp formats
 */

const DEBUG_TIMESTAMPS = true;

/**
 * Properly parses timestamps that might be in microseconds format
 * @param timestamp - A timestamp string which could be in microseconds (16 digits) or any other format
 * @returns Date object representing the parsed timestamp
 */
export function parseTimestamp(timestamp: string | number): Date {
    if (DEBUG_TIMESTAMPS) {
        console.log(`Parsing timestamp: ${timestamp}, type: ${typeof timestamp}`);
    }
    
    if (typeof timestamp === 'number') {
        // If it's already a number, check if it's in microseconds
        const result = isMicrosecondTimestamp(timestamp) 
            ? new Date(timestamp / 1000) 
            : new Date(timestamp);
            
        if (DEBUG_TIMESTAMPS) {
            console.log(`  Numeric timestamp: ${timestamp} → ${result.toISOString()}, microseconds: ${isMicrosecondTimestamp(timestamp)}`);
        }
        
        return result;
    }
    
    if (!timestamp || timestamp === 'N/A') {
        if (DEBUG_TIMESTAMPS) {
            console.log(`  Invalid timestamp: ${timestamp}`);
        }
        return new Date(); // Return current time for invalid inputs
    }
    
    // Try to convert to number if it's a numeric string
    const numericTimestamp = Number(timestamp);
    if (!isNaN(numericTimestamp)) {
        const result = isMicrosecondTimestamp(numericTimestamp) 
            ? new Date(numericTimestamp / 1000) 
            : new Date(numericTimestamp);
            
        if (DEBUG_TIMESTAMPS) {
            console.log(`  Numeric string: ${timestamp} → ${result.toISOString()}, microseconds: ${isMicrosecondTimestamp(numericTimestamp)}`);
        }
        
        return result;
    }
    
    // Handle ISO format and other string formats
    try {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
            if (DEBUG_TIMESTAMPS) {
                console.log(`  Standard format: ${timestamp} → ${date.toISOString()}`);
            }
            return date;
        }
    } catch (e) {
        console.warn(`Failed to parse timestamp: ${timestamp}`);
    }
    
    // If all parsing attempts fail
    if (DEBUG_TIMESTAMPS) {
        console.warn(`  All parsing methods failed for: ${timestamp}`);
    }
    return new Date();
}

/**
 * Returns timestamp in milliseconds regardless of input format
 * @param timestamp - Input timestamp which could be in various formats
 * @returns milliseconds since epoch
 */
export function getTimeInMs(timestamp: string | number): number {
    const result = parseTimestamp(timestamp).getTime();
    if (DEBUG_TIMESTAMPS) {
        console.log(`getTimeInMs: ${timestamp} → ${result}`);
    }
    return result;
}

/**
 * Detects if a numeric timestamp is likely in microseconds
 * @param timestamp - Numeric timestamp to check
 * @returns boolean indicating if the timestamp is likely in microseconds
 */
function isMicrosecondTimestamp(timestamp: number): boolean {
    // Typical microsecond timestamps are 16 digits long (as of 2025)
    // This will detect timestamps between 2001 and 2286 in microseconds
    return timestamp > 1000000000000000 && timestamp < 10000000000000000;
}

/**
 * Formats a timestamp for display
 * @param timestamp - Timestamp in any format
 * @returns Formatted time string
 */
export function formatTime(timestamp: string | number): string {
    try {
        const date = parseTimestamp(timestamp);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleTimeString();
    } catch (e) {
        return 'Invalid Date';
    }
}

/**
 * Calculates and formats the time difference between two timestamps
 * @param timestamp1 - First timestamp
 * @param timestamp2 - Second timestamp
 * @returns Formatted time difference string
 */
export function getTimeDifference(timestamp1: string | number, timestamp2: string | number): number {
    const time1 = getTimeInMs(timestamp1);
    const time2 = getTimeInMs(timestamp2);
    return (time2 - time1) / 1000; // Return difference in seconds
}

/**
 * Formats time difference in seconds to a readable string
 * @param seconds - Time difference in seconds
 * @returns Formatted string
 */
export function formatTimeDifference(seconds: number): string {
    if (seconds < 0) return `${Math.abs(seconds).toFixed(1)}s before`;
    return `${seconds.toFixed(1)}s after`;
} 