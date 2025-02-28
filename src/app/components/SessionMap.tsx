'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <circle cx="16" cy="16" r="14" fill="#ff4444" fill-opacity="0.2" stroke="#ff4444" stroke-width="2"/>
            <circle cx="16" cy="16" r="6" fill="#ff4444" filter="url(#glow)"/>
            <path d="M16 4 L16 7 M16 25 L16 28 M4 16 L7 16 M25 16 L28 16" 
                  stroke="#ff4444" stroke-width="2" stroke-linecap="round"/>
            <circle cx="16" cy="16" r="2" fill="white"/>
        </svg>
    `;

    const svgUrl = `data:image/svg+xml;base64,${btoa(svgTemplate)}`;

    return L.divIcon({
        html: `
            <div style="position: relative;">
                <img src="${svgUrl}" style="width: 32px; height: 32px;"/>
                <div class="object-marker-pulse"></div>
            </div>
        `,
        className: 'object-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
};

// Create approach point marker icon
const createApproachIcon = (color: string, distance: number) => {
    const svgTemplate = `
        <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>
            <circle cx="12" cy="12" r="4" fill="${color}"/>
        </svg>
    `;

    const svgUrl = `data:image/svg+xml;base64,${btoa(svgTemplate)}`;

    return L.divIcon({
        html: `
            <div style="position: relative;">
                <img src="${svgUrl}" style="width: 16px; height: 16px;"/>
                <div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); 
                     background-color: ${color}; color: white; padding: 2px 4px; border-radius: 4px; 
                     font-size: 10px; white-space: nowrap;">
                    ${distance}m
                </div>
            </div>
        `,
        className: 'approach-marker-icon',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8]
    });
};

interface SessionMapProps {
    sessions: SessionData[];
    objectMarkers: ObjectMarker[];
    animationPath: [number, number][];
}

export default function SessionMap({ sessions, objectMarkers = [], animationPath = [] }: SessionMapProps) {
    const mapRef = useRef<L.Map>(null);
    const animationRef = useRef<number>(0);
    const markerRef = useRef<L.Marker | null>(null);

    useEffect(() => {
        if (!mapRef.current || animationPath.length === 0) return;

        // Create animated marker
        if (!markerRef.current) {
            const animatedMarker = L.marker(animationPath[0], {
                icon: L.divIcon({
                    className: 'animated-vehicle-marker',
                    html: `
                        <div class="w-3 h-3 rounded-full bg-primary border-2 border-white shadow-lg pulse-animation"></div>
                    `,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                })
            }).addTo(mapRef.current);
            markerRef.current = animatedMarker;
        }

        let currentIdx = 0;
        const animateMarker = () => {
            if (currentIdx >= animationPath.length) {
                currentIdx = 0;
            }

            if (currentIdx < animationPath.length - 1) {
                const currentPos = animationPath[currentIdx];
                const nextPos = animationPath[currentIdx + 1];
                
                // Calculate angle for rotation
                const dx = nextPos[1] - currentPos[1];
                const dy = nextPos[0] - currentPos[0];
                const angle = Math.atan2(dx, dy) * 180 / Math.PI;
                
                // Update marker position and rotation
                markerRef.current?.setLatLng(currentPos);
                const markerElement = markerRef.current?.getElement();
                if (markerElement) {
                    markerElement.style.transform += ` rotate(${angle}deg)`;
                }
            }

            currentIdx++;
            animationRef.current = requestAnimationFrame(animateMarker);
        };

        animateMarker();

        return () => {
            cancelAnimationFrame(animationRef.current);
            if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
            }
        };
    }, [animationPath]);

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
                        transform: scale(1.5);
                        opacity: 0.5;
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

                .animated-vehicle-marker {
                    transition: all 0.3s linear;
                }

                .leaflet-polyline {
                    stroke-dasharray: 8, 8;
                    animation: dash 1s linear infinite;
                }

                @keyframes dash {
                    to {
                        stroke-dashoffset: -16;
                    }
                }

                .object-marker-pulse {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 32px;
                    height: 32px;
                    background-color: #ff4444;
                    border-radius: 50%;
                    opacity: 0.4;
                    animation: object-pulse 2s infinite;
                }

                @keyframes object-pulse {
                    0% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0.4;
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.5);
                        opacity: 0;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0.4;
                    }
                }
            `}</style>
            <div className="h-[calc(100vh-12rem)] w-full">
                <MapContainer
                    center={center}
                    zoom={calculateOptimalZoom()}
                    style={{ height: '100%', width: '100%' }}
                    bounds={bounds}
                    maxBounds={bounds?.pad(0.5)}
                    ref={mapRef}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {animationPath.length > 0 && (
                        <Polyline 
                            positions={animationPath}
                            pathOptions={{ 
                                color: 'var(--primary)', 
                                weight: 2,
                                opacity: 0.8,
                                dashArray: '8, 8'
                            }}
                        />
                    )}
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
                                <div key={`approach-${marker.frameId}-${ap.frameId}`}>
                                    <Marker
                                        position={[ap.lat, ap.long]}
                                        icon={createApproachIcon(marker.sessionColor, ap.targetDistance)}
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
                                                        {ap.targetDistance}m Approach Point
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
                                    <div 
                                        className="leaflet-div-icon" 
                                        style={{
                                            position: 'absolute',
                                            left: '0',
                                            top: '0',
                                            zIndex: '1000',
                                            backgroundColor: 'transparent',
                                            border: 'none'
                                        }}
                                    >
                                        <div 
                                            className="bg-background/90 px-2 py-0.5 rounded-md text-xs font-medium shadow-sm border"
                                            style={{ color: marker.sessionColor }}
                                        >
                                            {ap.targetDistance}m
                                        </div>
                                    </div>
                                </div>
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