'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SessionData, ObjectMarker, ClipData, TimeFilter, findFirstApproachPoint, ApproachPoint } from '../types/session';
import { calculateDistance, calculateSpeedProfile, detectManeuvers, kalmanSmoothCoordinates, SpeedData } from '../utils/calculations';
import { formatTime, formatTimeDifference } from '../utils/timeUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Navigation, BarChart2, Map as MapIcon, Activity, Clock, Gauge, Info, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "../components/ui/slider";
import { Toggle } from "../components/ui/toggle";
import { Badge } from "../components/ui/badge";
import { useTheme } from 'next-themes';

// Create a custom marker icon with dynamic color
const createColoredIcon = (color: string) => {
    const svgTemplate = `
        <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>
            <circle cx="10" cy="10" r="4" fill="${color}"/>
        </svg>
    `;

    const svgUrl = `data:image/svg+xml;base64,${btoa(svgTemplate)}`;

    return L.divIcon({
        html: `
            <div class="session-marker" style="position: relative;">
                <img src="${svgUrl}" style="width: 20px; height: 20px;"/>
                <div class="marker-pulse" style="background-color: ${color};"></div>
            </div>
        `,
        className: 'custom-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
    });
};

// Function to safely parse numeric values
const safeNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

// Modern monochromatic color palette
const MONOCHROME_COLORS = {
    primary: '#475569', // slate-600
    accent: '#64748b', // slate-500
    light: '#94a3b8', // slate-400
    lighter: '#cbd5e1', // slate-300
    lightest: '#e2e8f0', // slate-200
    dark: '#334155', // slate-700
    darkest: '#1e293b', // slate-800
};

// Update approach icon with modern monochromatic design
const createApproachIcon = (distance: number, isInterpolated: boolean = false) => {
    // Use monochromatic colors for distances
    const getDistanceColor = (distance: number) => {
        return MONOCHROME_COLORS.primary;
    };

    const color = getDistanceColor(distance);
    const opacity = isInterpolated ? "0.4" : "0.8";
    
    const svgTemplate = `
        <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" fill="${color}" fill-opacity="${opacity}" stroke="${color}" stroke-width="1.5" />
            <text x="10" y="10" dominant-baseline="middle" text-anchor="middle" fill="white" font-weight="bold" font-size="7">${distance}</text>
        </svg>
    `;

    const svgUrl = `data:image/svg+xml;base64,${btoa(svgTemplate)}`;

    // Simplified marker without the duplicate top label
    return L.divIcon({
        html: `<img src="${svgUrl}" style="width:20px;height:20px"/>`,
        className: 'approach-marker-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -8]
    });
};

// Create object detection marker icon with monochromatic design
const createObjectIcon = () => {
    const svgTemplate = `
        <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="12" fill="${MONOCHROME_COLORS.darkest}" fill-opacity="0.2" stroke="${MONOCHROME_COLORS.darkest}" stroke-width="1.5"/>
            <circle cx="14" cy="14" r="5" fill="${MONOCHROME_COLORS.darkest}"/>
            <path d="M14 4 L14 7 M14 21 L14 24 M4 14 L7 14 M21 14 L24 14" 
                  stroke="${MONOCHROME_COLORS.darkest}" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
    `;

    const svgUrl = `data:image/svg+xml;base64,${btoa(svgTemplate)}`;

    return L.divIcon({
        html: `<img src="${svgUrl}" style="width: 28px; height: 28px;"/>`,
        className: 'object-marker-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });
};

// Add new function for terrain marker
const createTerrainIcon = (elevation: number) => {
    const getElevationColor = (elevation: number) => {
        // Color gradient based on elevation
        if (elevation < 100) return '#2dd4bf';
        if (elevation < 300) return '#34d399';
        if (elevation < 500) return '#fbbf24';
        if (elevation < 1000) return '#f97316';
        return '#ef4444';
    };

    const color = getElevationColor(elevation);
    const svgTemplate = `
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22h20L12 2z" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>
            <text x="12" y="18" text-anchor="middle" fill="${color}" font-size="10">${elevation}m</text>
        </svg>
    `;

    return L.divIcon({
        html: svgTemplate,
        className: 'terrain-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

// Add type for the onValueChange handler
type SliderValue = number[];

interface SessionMapProps {
    sessions: SessionData[];
    objectMarkers: ObjectMarker[];
    timeFilter: TimeFilter;
    animationPath?: [number, number][];
}

// Function to determine marker color based on speed (monochromatic version)
const getSpeedColor = (speed: number, reliability?: number): string => {
    // Adjust color based on reliability if available
    const alpha = reliability !== undefined ? Math.max(0.3, reliability) : 1;
    
    // Single color palette for all speeds
    return `rgba(${parseInt(MONOCHROME_COLORS.primary.slice(1, 3), 16)}, 
              ${parseInt(MONOCHROME_COLORS.primary.slice(3, 5), 16)}, 
              ${parseInt(MONOCHROME_COLORS.primary.slice(5, 7), 16)}, ${alpha})`;
};

// Format distance nicely
const formatDistance = (distance: number): string => {
    if (distance < 1000) {
        return `${distance.toFixed(1)}m`;
    }
    return `${(distance / 1000).toFixed(2)}km`;
};

export default function SessionMap({ sessions, objectMarkers, timeFilter, animationPath }: SessionMapProps) {
    const mapRef = useRef<L.Map | null>(null);
    const [speedProfiles, setSpeedProfiles] = useState<Map<number, ReturnType<typeof calculateSpeedProfile>>>(new Map());
    const [detectedManeuvers, setDetectedManeuvers] = useState<Map<number, ReturnType<typeof detectManeuvers>>>(new Map());
    const [smoothedPaths, setSmoothedPaths] = useState<Map<number, {lat: number, long: number}[]>>(new Map());
    const {theme} = useTheme();
    
    // Find map center based on points
    const mapCenter = useMemo(() => {
        if (objectMarkers.length > 0) {
            return [objectMarkers[0].lat, objectMarkers[0].long] as [number, number];
        } else if (sessions.length > 0 && sessions[0].clips.length > 0) {
            return [sessions[0].clips[0].lat, sessions[0].clips[0].long] as [number, number];
        }
        return [0, 0] as [number, number];
    }, [sessions, objectMarkers]);

    // Process approach points with enhanced detection
    const approachPoints = useMemo(() => {
        const allPoints: {
            point: ApproachPoint;
            objectMarker: ObjectMarker;
            sessionId: number;
        }[] = [];
        
        objectMarkers.forEach(marker => {
            sessions.forEach(session => {
                const points = findFirstApproachPoint(session.clips, marker);
                points.forEach(point => {
                    allPoints.push({ 
                        point, 
                        objectMarker: marker,
                        sessionId: safeNumber(session.id)
                    });
                });
            });
        });
        
        return allPoints;
    }, [sessions, objectMarkers]);

    // Calculate speed profiles and smooth paths for each session
    useEffect(() => {
        const newSpeedProfiles = new Map<number, ReturnType<typeof calculateSpeedProfile>>();
        const newManeuvers = new Map<number, ReturnType<typeof detectManeuvers>>();
        const newSmoothedPaths = new Map<number, {lat: number, long: number}[]>();
        
        sessions.forEach(session => {
            // Calculate speed profile
            const profile = calculateSpeedProfile(session.clips);
            newSpeedProfiles.set(Number(session.id), profile);
            
            // Detect maneuvers
            const maneuvers = detectManeuvers(session.clips);
            newManeuvers.set(Number(session.id), maneuvers);
            
            // Apply Kalman filter for smoother path
            const smoothedPath = kalmanSmoothCoordinates(session.clips);
            newSmoothedPaths.set(Number(session.id), smoothedPath);
        });
        
        setSpeedProfiles(newSpeedProfiles);
        setDetectedManeuvers(newManeuvers);
        setSmoothedPaths(newSmoothedPaths);
    }, [sessions]);

    // Create polyline paths for each session (use smoothed paths)
    const sessionPaths = useMemo(() => {
        return sessions.map(session => {
            // Use smoothed path if available, otherwise original clips
            const pathData = smoothedPaths.get(Number(session.id)) || session.clips;
            
            // Map coordinates to [lat, lng] format for polyline
            const coordinates = pathData.map(point => [point.lat, point.long]);
            
            // Add properties like color based on session ID or other attributes
            return {
                id: session.id,
                coordinates,
                color: `hsl(${(Number(session.id) * 137) % 360}, 70%, 50%)`, // Unique color per session
                weight: 3,
                opacity: 0.8
            };
        });
    }, [sessions, smoothedPaths]);
    
    // Create approach circles for distance visualization with monochromatic design
    const approachCircles = useMemo(() => {
        return objectMarkers.map(marker => {
            return [50, 100, 150, 200, 250].map(distance => ({
                center: [marker.lat, marker.long] as [number, number],
                radius: distance,
                color: MONOCHROME_COLORS.primary,
                fillColor: MONOCHROME_COLORS.primary,
                fillOpacity: 0.05,
                weight: 1.5,
                dashArray: distance % 100 === 0 ? '0' : '3',
                id: `${marker.frameId}-${distance}`
            }));
        }).flat();
    }, [objectMarkers]);

    // Create the MapCenter component for auto-focusing
    const MapCenter = () => {
        const map = useMap();
        
        useEffect(() => {
            if (mapCenter[0] !== 0 && mapCenter[1] !== 0) {
                map.setView(mapCenter, 16);
                mapRef.current = map;
            }
        }, [map, mapCenter]);
        
        return null;
    };

    // Get session stats summary
    const sessionStats = useMemo(() => {
        let totalDistance = 0;
        let maxSpeed = 0;
        let avgSpeed = 0;
        let speedCount = 0;
        
        // Combine stats from all sessions
        Array.from(speedProfiles.values()).forEach(profile => {
            totalDistance += profile.totalDistance;
            maxSpeed = Math.max(maxSpeed, profile.maxSpeed);
            avgSpeed += profile.averageSpeed * profile.distances.length;
            speedCount += profile.distances.length;
        });
        
        // Calculate overall average
        const overallAvgSpeed = speedCount > 0 ? avgSpeed / speedCount : 0;
        
        return {
            totalDistance,
            maxSpeed,
            avgSpeed: overallAvgSpeed
        };
    }, [speedProfiles]);

    return (
        <div className="h-[calc(100vh-8rem)] w-full relative">
            <MapContainer 
                center={mapCenter} 
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url={theme === 'dark' 
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    }
                />
                <ZoomControl position="bottomright" />
                <MapCenter />
                
                {/* Approach Circles - Updated with monochromatic design */}
                {approachCircles.map(circle => (
                    <Circle
                        key={circle.id}
                        center={circle.center}
                        radius={circle.radius}
                        pathOptions={{
                            color: circle.color,
                            fillColor: circle.fillColor,
                            fillOpacity: circle.fillOpacity,
                            weight: circle.weight,
                            dashArray: circle.dashArray
                        }}
                    />
                ))}
                
                {/* Session Paths */}
                {sessionPaths.map(path => (
                    <Polyline
                        key={path.id}
                        positions={path.coordinates as [number, number][]}
                        pathOptions={{
                            color: MONOCHROME_COLORS.primary,
                            weight: 2.5,
                            opacity: 0.7
                        }}
                    />
                ))}
                
                {/* Session Points - Updated with monochromatic design */}
                {sessions.map(session => {
                    const speedProfile = speedProfiles.get(Number(session.id));
                    const maneuvers = detectedManeuvers.get(Number(session.id));
                    
                    if (!speedProfile || !maneuvers) return null;
                    
                    return session.clips.map((clip, index) => {
                        const speedData = speedProfile.speedData[index > 0 ? index - 1 : 0];
                        
                        // Only show markers every 30th point for less clutter
                        if (index % 30 !== 0) {
                            return null;
                        }
                        
                        return (
                            <Marker
                                key={`${session.id}-${clip.frameId}`}
                                position={[clip.lat, clip.long]}
                                icon={L.divIcon({
                                    html: `<div style="background-color: ${MONOCHROME_COLORS.primary}; width: 6px; height: 6px; border-radius: 50%; opacity: 0.8;"></div>`,
                                    className: '',
                                    iconSize: [6, 6],
                                    iconAnchor: [3, 3]
                                })}
                            >
                                <Popup className="custom-popup">
                                    <Card className="border-0 shadow-none">
                                        <CardHeader className="p-2 pb-0">
                                            <CardTitle className="text-sm">Point Data</CardTitle>
                                            <CardDescription className="text-xs">
                                                Session: {session.id} | Frame: {clip.frameId}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-2 pt-1">
                                            <div className="grid gap-1 text-xs">
                                                <div className="flex items-center">
                                                    <Clock size={14} className="mr-1" />
                                                    {formatTime(clip.datetime_timestamp)}
                                                </div>
                                                <div className="flex items-center">
                                                    <Gauge size={14} className="mr-1" />
                                                    {speedData?.speed ? speedData.speed.toFixed(1) : "0.0"} km/h
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Popup>
                            </Marker>
                        );
                    });
                })}
                
                {/* Approach Points with better visualization */}
                {approachPoints.map(({ point, objectMarker, sessionId }) => (
                    <Marker
                        key={`approach-${objectMarker.frameId}-${sessionId}-${point.targetDistance}`}
                        position={[point.lat, point.long]}
                        icon={createApproachIcon(point.targetDistance, point.isInterpolated)}
                    >
                        <Popup className="approach-popup">
                            <Card className="border-0 shadow-none">
                                <CardHeader className="p-2 pb-0">
                                    <CardTitle className="text-sm">{point.targetDistance}m Approach Point</CardTitle>
                                    <CardDescription className="text-xs">
                                        {point.isInterpolated ? 'Interpolated Position' : 'Exact Position'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-2 pt-1">
                                    <div className="grid gap-1 text-xs">
                                        <div className="flex items-center">
                                            <Clock size={14} className="mr-1" /> 
                                            {formatTime(point.datetime_timestamp)}
                                        </div>
                                        <div className="flex items-center">
                                            <ChevronRight size={14} className="mr-1" /> 
                                            {formatTimeDifference(point.timeDifference)}
                                        </div>
                                        <div className="flex items-center">
                                            <Gauge size={14} className="mr-1" /> 
                                            {point.speed.toFixed(1)} km/h
                                        </div>
                                        <div className="flex items-center">
                                            <Navigation size={14} className="mr-1" /> 
                                            Bearing: {point.bearingToObject.toFixed(0)}°
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Popup>
                    </Marker>
                ))}
                
                {/* Object Markers */}
                {objectMarkers.map(marker => (
                    <Marker
                        key={marker.frameId}
                        position={[marker.lat, marker.long]}
                        icon={createObjectIcon()}
                    >
                        <Popup className="object-popup">
                            <Card className="border-0 shadow-none">
                                <CardHeader className="p-2 pb-0">
                                    <CardTitle className="text-sm">{marker.sessionName || `Object ${marker.frameId}`}</CardTitle>
                                    <CardDescription className="text-xs">
                                        Frame: {marker.frameId}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-2 pt-1">
                                    <div className="grid gap-1 text-xs">
                                        <div className="flex items-center">
                                            <Clock size={14} className="mr-1" /> 
                                            {formatTime(marker.datetime_timestamp)}
                                        </div>
                                        <div className="mt-1">
                                            <div className="font-semibold text-xs mb-1">Approach Points:</div>
                                            <div className="grid grid-cols-5 gap-1">
                                                {[50, 100, 150, 200, 250].map(distance => {
                                                    const found = approachPoints.some(ap => 
                                                        ap.objectMarker.frameId === marker.frameId && 
                                                        ap.point.targetDistance === distance
                                                    );
                                                    
                                                    return (
                                                        <Badge 
                                                            key={distance}
                                                            className={`text-[10px] ${found ? 'bg-green-500' : 'bg-gray-400'}`}
                                                        >
                                                            {distance}m
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
            
            {/* Stats Panel */}
            <div className="absolute left-2 top-2 bg-background/80 backdrop-blur-sm p-2 rounded border border-border z-[1000] shadow-md">
                <div className="text-xs font-semibold mb-1">Session Data Analyzer</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex flex-col items-center">
                        <div className="font-semibold">{sessions.length}</div>
                        <div>Sessions</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="font-semibold">{objectMarkers.length}</div>
                        <div>Objects</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="font-semibold">{approachPoints.length}</div>
                        <div>Approaches</div>
                    </div>
                </div>
                <Separator className="my-2" />
                <div className="grid gap-1 text-xs">
                    <div className="flex justify-between">
                        <span>Total Distance:</span>
                        <span className="font-semibold">{formatDistance(sessionStats.totalDistance)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Max Speed:</span>
                        <span className="font-semibold">{sessionStats.maxSpeed.toFixed(1)} km/h</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Avg Speed:</span>
                        <span className="font-semibold">{sessionStats.avgSpeed.toFixed(1)} km/h</span>
                    </div>
                </div>
            </div>
        </div>
    );
} 