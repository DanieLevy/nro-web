'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SessionData, ObjectMarker } from '../types/session';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Create a custom marker icon with dynamic color
const createColoredIcon = (color: string) => {
    const svgTemplate = `
        <svg width="24" height="36" viewBox="0 0 24 36" fill="${color}" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.38 0 0 5.38 0 12c0 8.25 12 24 12 24s12-15.75 12-24c0-6.62-5.38-12-12-12zm0 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
        </svg>
    `;

    const svgUrl = `data:image/svg+xml;base64,${btoa(svgTemplate)}`;

    return L.icon({
        iconUrl: svgUrl,
        iconSize: [24, 36],
        iconAnchor: [12, 36],
        popupAnchor: [0, -36]
    });
};

// Create object detection marker icon
const createObjectIcon = () => {
    const svgTemplate = `
        <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FF0000" d="M2 17h1v5h5v1H2zm21 0h-1v5h-5v1h6zM3 3h5V2H2v6h1zm20-1h-6v1h5v5h1z"/>
            <path fill="#FF0000" d="M12 11.25h-1.5a.75.75 0 0 1-.75-.75V9a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-.75.75z"/>
            <path fill="#FF0000" d="M13 12h-1v1h1zm7 0h-5v1h5zm-10 0H5v1h5zm3 8v-5h-1v5zm-1-10h1V5h-1z"/>
        </svg>
    `;

    const svgUrl = `data:image/svg+xml;base64,${btoa(svgTemplate)}`;

    return L.icon({
        iconUrl: svgUrl,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24],
        className: 'object-marker-icon'
    });
};

// Create approach point marker icon
const createApproachIcon = (color: string, isFirstApproach: boolean = false) => {
    const svgTemplate = `
        <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="${isFirstApproach ? '0.4' : '0.2'}" stroke="${color}" stroke-width="${isFirstApproach ? '3' : '2'}"/>
            <circle cx="12" cy="12" r="4" fill="${color}"/>
            ${isFirstApproach ? '<circle cx="12" cy="12" r="12" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2 2"/>' : ''}
        </svg>
    `;

    const svgUrl = `data:image/svg+xml;base64,${btoa(svgTemplate)}`;

    return L.icon({
        iconUrl: svgUrl,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
        className: `approach-marker-icon${isFirstApproach ? ' first-approach' : ''}`
    });
};

interface SessionMapProps {
    sessions: SessionData[];
    objectMarkers: ObjectMarker[];
}

export default function SessionMap({ sessions, objectMarkers = [] }: SessionMapProps) {
    // Calculate center point from all visible clips and object markers
    const visibleClips = sessions
        .filter(s => s.isVisible)
        .flatMap(s => s.clips);

    const allPoints = [
        ...visibleClips,
        ...objectMarkers
    ];

    const center = allPoints.length > 0
        ? [
            allPoints.reduce((sum, point) => sum + point.lat, 0) / allPoints.length,
            allPoints.reduce((sum, point) => sum + point.long, 0) / allPoints.length
        ] as [number, number]
        : [0, 0] as [number, number];

    // Calculate bounds to fit all visible markers
    const bounds = allPoints.length > 0
        ? L.latLngBounds(allPoints.map(point => [point.lat, point.long]))
        : undefined;

    // Calculate optimal zoom level
    const calculateOptimalZoom = () => {
        if (!bounds) return 13;
        
        const PADDING = 0.1;
        const latDiff = Math.abs(bounds.getNorth() - bounds.getSouth());
        const lngDiff = Math.abs(bounds.getEast() - bounds.getWest());
        
        const paddedLatDiff = latDiff * (1 + PADDING);
        const paddedLngDiff = lngDiff * (1 + PADDING);
        
        const maxDiff = Math.max(paddedLatDiff, paddedLngDiff);
        const zoom = Math.floor(Math.log2(360 / maxDiff)) + 1;
        
        return Math.min(Math.max(zoom, 1), 18);
    };

    return (
        <Card className="overflow-hidden">
            <style jsx global>{`
                .pulse-animation {
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.2);
                        opacity: 0.8;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                .object-marker-icon {
                    filter: drop-shadow(0 0 6px rgba(255, 0, 0, 0.5));
                }
                
                .object-marker-icon:hover {
                    filter: drop-shadow(0 0 8px rgba(255, 0, 0, 0.8));
                    transform: scale(1.1);
                    transition: all 0.2s ease;
                }
            `}</style>
            <div className="h-[calc(100vh-12rem)] w-full">
                <MapContainer
                    center={center}
                    zoom={calculateOptimalZoom()}
                    style={{ height: '100%', width: '100%' }}
                    bounds={bounds}
                    maxBounds={bounds?.pad(0.5)}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {sessions.filter(s => s.isVisible).map((session) => (
                        session.clips.map((clip, index) => (
                            <Marker
                                key={`${session.id}-${index}`}
                                position={[clip.lat, clip.long]}
                                icon={createColoredIcon(session.color)}
                            >
                                <Popup>
                                    <div className="space-y-4 min-w-[250px]">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: session.color }}
                                            />
                                            <div className="font-medium truncate flex-1" style={{ fontSize: '0.95rem' }}>
                                                {session.name}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                            <div className="space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground">Frame ID</div>
                                                <div>{clip.frameId}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground">Timestamp</div>
                                                <div>{clip.datetime_timestamp}</div>
                                            </div>
                                            
                                            {clip.speedData && (
                                                <>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-medium text-muted-foreground">Speed</div>
                                                        <div>
                                                            {clip.speedData.speed.toFixed(1)} km/h
                                                            <span className="text-xs text-muted-foreground ml-1">
                                                                ({clip.speedData.speedMS.toFixed(1)} m/s)
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-medium text-muted-foreground">Distance</div>
                                                        <div>{clip.speedData.distance.toFixed(1)} m</div>
                                                    </div>
                                                </>
                                            )}
                                            
                                            <div className="col-span-2 space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground">Coordinates</div>
                                                <div className="font-mono text-xs">
                                                    {clip.lat.toFixed(6)}, {clip.long.toFixed(6)}
                                                </div>
                                            </div>

                                            {clip.distanceFromObject !== undefined && (
                                                <div className="col-span-2 space-y-1 pt-2">
                                                    <div className="text-xs font-medium text-muted-foreground">
                                                        Distance to Nearest Object
                                                    </div>
                                                    <div className="text-sm font-medium" style={{ color: '#ff4444' }}>
                                                        {clip.distanceFromObject.toFixed(1)} m
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))
                    ))}
                    {objectMarkers.map((marker, index) => (
                        <div key={`object-group-${marker.frameId}`}>
                            {marker.approachPoints?.map((ap, apIndex) => (
                                <Marker
                                    key={`approach-${marker.frameId}-${ap.frameId}`}
                                    position={[ap.lat, ap.long]}
                                    icon={createApproachIcon(marker.sessionColor, ap.isFirstApproach)}
                                    zIndexOffset={1000}
                                >
                                    <Popup>
                                        <div className="space-y-4 min-w-[250px]">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full" 
                                                    style={{ backgroundColor: marker.sessionColor }}
                                                />
                                                <div className="font-medium" style={{ fontSize: '0.95rem' }}>
                                                    {ap.isFirstApproach ? 'First Approach Point' : 'Approach Point'}
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                <div className="space-y-1">
                                                    <div className="text-xs font-medium text-muted-foreground">Frame ID</div>
                                                    <div>{ap.frameId}</div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-xs font-medium text-muted-foreground">Distance</div>
                                                    <div>{ap.distance.toFixed(1)} m</div>
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <div className="text-xs font-medium text-muted-foreground">Time Before Object</div>
                                                    <div>{ap.timeDifference.toFixed(1)} seconds</div>
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <div className="text-xs font-medium text-muted-foreground">Timestamp</div>
                                                    <div>{ap.datetime_timestamp}</div>
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <div className="text-xs font-medium text-muted-foreground">Coordinates</div>
                                                    <div className="font-mono text-xs">
                                                        {ap.lat.toFixed(6)}, {ap.long.toFixed(6)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                            <Marker
                                key={`object-${marker.frameId}`}
                                position={[marker.lat, marker.long]}
                                icon={createObjectIcon()}
                                zIndexOffset={2000}
                            >
                                <Popup>
                                    <div className="space-y-4 min-w-[250px]">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: marker.sessionColor }}
                                            />
                                            <div className="font-medium" style={{ fontSize: '0.95rem' }}>
                                                Object Detection
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                            <div className="space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground">Frame ID</div>
                                                <div>{marker.frameId}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground">Session</div>
                                                <div className="truncate">
                                                    {marker.sessionName}
                                                </div>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground">Timestamp</div>
                                                <div>{marker.datetime_timestamp}</div>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground">Coordinates</div>
                                                <div className="font-mono text-xs">
                                                    {marker.lat.toFixed(6)}, {marker.long.toFixed(6)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        </div>
                    ))}
                </MapContainer>
            </div>
        </Card>
    );
} 