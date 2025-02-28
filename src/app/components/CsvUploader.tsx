'use client';

import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { SessionData, SESSION_COLORS, DEFAULT_DISTANCE_FILTERS, DistanceFilter, ObjectMarker, findFirstApproachPoint, TimeFilter, TIME_FILTER_OPTIONS } from '../types/session';
import { calculateSpeedBetweenPoints, calculateDistance } from '../utils/calculations';
import dynamic from 'next/dynamic';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import SessionManager from './SessionManager';
import { 
    Upload, 
    MapPin, 
    Table as TableIcon, 
    AlertCircle,
    FileSpreadsheet,
    Gauge,
    Plus,
    Target,
    Settings2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import AnalysisPanel from './AnalysisPanel';
import ExportReport from './ExportReport';

// Dynamically import the SessionMap component
const SessionMap = dynamic(() => import('./SessionMap'), {
    ssr: false,
    loading: () => (
        <Card className="w-full h-[600px] flex items-center justify-center bg-muted">
            <CardContent>
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <MapPin className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading map...</p>
                </div>
            </CardContent>
        </Card>
    )
});

// Add this helper function at the top level
const getValidTime = (timestamp: string | undefined): number | null => {
    if (!timestamp || timestamp === 'N/A') return null;
    try {
        const time = new Date(timestamp).getTime();
        return isNaN(time) ? null : time;
    } catch (e) {
        return null;
    }
};

const getObjectTimes = (markers: ObjectMarker[]): number[] => {
    return markers
        .map(m => getValidTime(m.datetime_timestamp))
        .filter((time): time is number => time !== null);
};

export default function CsvUploader() {
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [fps, setFps] = useState<number>(30);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState('map');
    const [objectMarkers, setObjectMarkers] = useState<ObjectMarker[]>([]);
    const [searchFrameId, setSearchFrameId] = useState<string>('');
    const [distanceFilters, setDistanceFilters] = useState<DistanceFilter[]>(DEFAULT_DISTANCE_FILTERS);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('before');
    const mapContainerRef = useRef<HTMLDivElement>(null) as React.MutableRefObject<HTMLDivElement>;

    const handleFpsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setFps(Number(event.target.value));
    };

    const processClipsWithSpeed = (rawClips: any[]) => {
        const sortedClips = [...rawClips].sort((a, b) => a.frameId - b.frameId);
        return sortedClips.map((clip, index) => {
            if (index === 0) return clip;
            const prevClip = sortedClips[index - 1];
            const speedData = calculateSpeedBetweenPoints(
                prevClip.lat, prevClip.long, clip.lat, clip.long,
                prevClip.frameId, clip.frameId, fps
            );
            return { ...clip, speedData };
        });
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setError('');

        Papa.parse(file, {
            complete: (results) => {
                try {
                    const totalRows = results.data.length;
                    const parsedData = results.data
                        .filter((row: any) => {
                            const hasValidCoords = !isNaN(Number(row.lat)) && 
                                                 !isNaN(Number(row.long)) &&
                                                 row.lat !== '' && 
                                                 row.long !== '';
                            return hasValidCoords;
                        })
                        .map((row: any) => {
                            // Validate timestamp before creating clip
                            const timestamp = row.datetime_timestamp;
                            const isValidTimestamp = timestamp && 
                                                   timestamp !== 'N/A' && 
                                                   !isNaN(new Date(timestamp).getTime());

                            if (!isValidTimestamp) {
                                console.warn(`Skipped frame ${row.frameId} - invalid/missing timestamp`);
                                return null;
                            }

                            return {
                                datetime_timestamp: timestamp,
                                frameId: row.frameId ? Number(row.frameId) : 0,
                                lat: Number(row.lat),
                                long: Number(row.long)
                            };
                        })
                        .filter((item): item is NonNullable<typeof item> => item !== null);

                    if (parsedData.length === 0) {
                        toast.error('No valid data found in the CSV file.');
                        return;
                    }

                    const clipsWithSpeed = processClipsWithSpeed(parsedData);
                    
                    const newSession: SessionData = {
                        id: crypto.randomUUID(),
                        name: file.name.replace('.csv', ''),
                        color: SESSION_COLORS[sessions.length % SESSION_COLORS.length],
                        isVisible: true,
                        clips: clipsWithSpeed
                    };

                    setSessions(prev => [...prev, newSession]);
                    toast.success(
                        `Session "${newSession.name}" loaded with ${clipsWithSpeed.length} valid data points. ` +
                        `${totalRows - clipsWithSpeed.length} invalid rows skipped.`
                    );
                } catch (err) {
                    toast.error('Error parsing CSV file. Please check the format.');
                    console.error('Parsing error:', err);
                }
            },
            header: true,
            skipEmptyLines: true
        });

        event.target.value = '';
    };

    const handleToggleSession = (sessionId: string) => {
        setSessions(prev => prev.map(session => 
            session.id === sessionId 
                ? { ...session, isVisible: !session.isVisible }
                : session
        ));
    };

    const handleDeleteSession = (sessionId: string) => {
        setSessions(prev => {
            const session = prev.find(s => s.id === sessionId);
            if (session) {
                toast.success(`Session "${session.name}" has been removed.`);
            }
            return prev.filter(s => s.id !== sessionId);
        });
    };

    const handleAddObjectMarker = (frameId: string) => {
        const frameIdNum = parseInt(frameId);
        if (isNaN(frameIdNum)) {
            toast.error('Please enter a valid frame ID number.');
            return;
        }

        let found = false;
        sessions.forEach(session => {
            const clip = session.clips.find(c => c.frameId === frameIdNum);
            if (clip) {
                // Validate clip timestamp
                const clipTime = getValidTime(clip.datetime_timestamp);
                if (!clipTime) {
                    toast.error(`Cannot create marker - invalid timestamp in frame ${frameIdNum}`);
                    return;
                }

                found = true;
                
                // Create the object marker
                const newMarker: ObjectMarker = {
                    frameId: clip.frameId,
                    lat: clip.lat,
                    long: clip.long,
                    sessionName: session.name,
                    sessionColor: session.color,
                    datetime_timestamp: clip.datetime_timestamp,
                    approachPoints: []
                };

                // Find approach points
                const approachPoints = findFirstApproachPoint(session.clips, newMarker);
                
                if (approachPoints && approachPoints.length > 0) {
                    newMarker.approachPoints = approachPoints;
                    const firstPoint = approachPoints[0];
                    toast.success(
                        `Added marker at frame ${frameIdNum}. Found ${approachPoints.length} approach points. First point at frame ${firstPoint.frameId} ` +
                        `(${firstPoint.timeDifference.toFixed(1)}s before object, ${firstPoint.distance.toFixed(1)}m away)`
                    );
                } else {
                    toast.success(
                        `Added marker at frame ${frameIdNum} from session "${session.name}". No approach points found.`
                    );
                }
                
                setObjectMarkers(prev => [...prev, newMarker]);
            }
        });

        if (!found) {
            toast.error(`Frame ID ${frameIdNum} not found in any session.`);
        }
    };

    const handleDeleteObjectMarker = (frameId: number) => {
        setObjectMarkers(prev => {
            const marker = prev.find(m => m.frameId === frameId);
            if (marker) {
                toast.success(`Removed marker at frame ${frameId}.`);
            }
            return prev.filter(m => m.frameId !== frameId);
        });
    };

    // Calculate distances from object markers and update filters
    useEffect(() => {
        if (objectMarkers.length === 0) {
            setDistanceFilters(DEFAULT_DISTANCE_FILTERS);
            return;
        }

        // Calculate minimum distance from each clip to any object marker
        const sessionsWithDistances = sessions.map(session => ({
            ...session,
            clips: session.clips.map(clip => {
                const minDistance = Math.min(...objectMarkers.map(marker => 
                    calculateDistance(clip.lat, clip.long, marker.lat, marker.long)
                ));
                return { ...clip, distanceFromObject: minDistance };
            })
        }));

        // Update session data with distances
        setSessions(sessionsWithDistances);

        // Update filter counts
        const newFilters = distanceFilters.map(filter => {
            const count = sessionsWithDistances
                .flatMap(s => s.clips)
                .filter(clip => clip.distanceFromObject <= filter.distance)
                .length;
            return { ...filter, count };
        });

        setDistanceFilters(newFilters);
    }, [objectMarkers]);

    // Handle distance filter change
    const handleDistanceFilterChange = (distance: number) => {
        setDistanceFilters(prev => prev.map(filter => ({
            ...filter,
            isActive: filter.distance === distance ? !filter.isActive : false
        })));
    };

    // Get active distance filter
    const activeFilter = distanceFilters.find(f => f.isActive);

    // Filter sessions based on time and distance
    const filteredSessions = sessions.map(session => {
        // First, apply time filter if there are object markers
        let filteredClips = session.clips;
        
        if (objectMarkers.length > 0) {
            const objectTimes = getObjectTimes(objectMarkers);
            
            // If no valid object times, skip time filtering
            if (objectTimes.length > 0) {
                const earliestObjectTime = Math.min(...objectTimes);

                filteredClips = filteredClips.filter(clip => {
                    const clipTime = getValidTime(clip.datetime_timestamp);
                    
                    // Exclude clips with invalid timestamps
                    if (clipTime === null) return false;
                    
                    switch (timeFilter) {
                        case 'before':
                            return clipTime < earliestObjectTime;
                        case 'after':
                            return clipTime >= earliestObjectTime;
                        case 'all':
                        default:
                            return true;
                    }
                });
            }
        }

        // Then apply distance filter
        if (activeFilter) {
            filteredClips = filteredClips.filter(clip => 
                clip.distanceFromObject !== undefined && 
                clip.distanceFromObject <= activeFilter.distance
            );
        }

        return {
            ...session,
            clips: filteredClips
        };
    });

    // Use the same filtering logic for animation path
    const animationPath = timeFilter === 'before' && objectMarkers.length > 0 ? 
        sessions
            .filter(s => s.isVisible)
            .flatMap(session => {
                const objectTimes = getObjectTimes(objectMarkers);
                
                // If no valid object times, return empty array
                if (objectTimes.length === 0) return [];
                
                const earliestObjectTime = Math.min(...objectTimes);

                return session.clips
                    .map(clip => {
                        const clipTime = getValidTime(clip.datetime_timestamp);
                        return {
                            ...clip,
                            validTime: clipTime
                        };
                    })
                    .filter((clip): clip is typeof clip & { validTime: number } => 
                        clip.validTime !== null && clip.validTime < earliestObjectTime
                    )
                    .sort((a, b) => a.validTime - b.validTime)
                    .map(clip => [clip.lat, clip.long] as [number, number]);
            })
    : [];

    const visibleSessions = sessions.filter(s => s.isVisible);
    const totalClips = sessions.reduce((sum, session) => sum + session.clips.length, 0);

    return (
        <>
            <style jsx global>{`
                .dialog-overlay {
                    background-color: rgba(0, 0, 0, 0.5) !important;
                    backdrop-filter: blur(4px);
                }
                
                .leaflet-container {
                    z-index: 0;
                }
            `}</style>
            
            {sessions.length === 0 ? (
                <div className="min-h-[80vh] flex flex-col items-center justify-center gap-8">
                    <div className="text-center space-y-4">
                        <FileSpreadsheet className="h-16 w-16 mx-auto text-primary" />
                        <h1 className="text-4xl font-bold tracking-tight">Session Data Analyzer</h1>
                        <p className="text-lg text-muted-foreground max-w-md mx-auto">
                            Upload your CSV files to analyze location data, calculate speeds, and visualize movement patterns
                        </p>
                    </div>
                    
                    <div className="flex flex-col items-center gap-4">
                        <Button asChild size="lg" className="w-64">
                            <label className="cursor-pointer">
                                <Upload className="h-5 w-5 mr-2" />
                                Upload CSV File
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setIsSettingsOpen(true)}
                        >
                            <Settings2 className="h-4 w-4 mr-2" />
                            Configure Settings
                        </Button>
                    </div>

                    {error && (
                        <Alert variant="destructive" className="max-w-md">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Session Data Analyzer</h1>
                            <p className="text-muted-foreground">
                                {sessions.length} session{sessions.length > 1 ? 's' : ''} loaded
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <ExportReport 
                                sessions={sessions}
                                objectMarkers={objectMarkers}
                                mapRef={mapContainerRef}
                            />
                            <Button 
                                variant="outline"
                                onClick={() => setIsSettingsOpen(true)}
                            >
                                <Settings2 className="h-4 w-4 mr-2" />
                                Settings
                            </Button>
                            <Button asChild>
                                <label className="cursor-pointer">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Session
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 lg:col-span-3">
                            <AnalysisPanel
                                sessions={sessions}
                                objectMarkers={objectMarkers}
                                distanceFilters={distanceFilters}
                                timeFilter={timeFilter}
                                timeFilterOptions={TIME_FILTER_OPTIONS}
                                onToggleSession={handleToggleSession}
                                onDeleteSession={handleDeleteSession}
                                onAddMarker={handleAddObjectMarker}
                                onDeleteMarker={handleDeleteObjectMarker}
                                onFilterChange={handleDistanceFilterChange}
                                onTimeFilterChange={setTimeFilter}
                            />
                        </div>

                        <div className="col-span-12 lg:col-span-9">
                            <div ref={mapContainerRef}>
                                <SessionMap 
                                    sessions={filteredSessions} 
                                    objectMarkers={objectMarkers} 
                                    animationPath={animationPath}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Settings</SheetTitle>
                        <SheetDescription>
                            Configure analysis parameters
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Frames Per Second (FPS)
                            </label>
                            <select
                                value={fps}
                                onChange={(e) => setFps(Number(e.target.value))}
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                            >
                                <option value={30}>30 FPS</option>
                                <option value={18}>18 FPS</option>
                            </select>
                            <p className="text-sm text-muted-foreground">
                                Used for speed calculations between frames
                            </p>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
} 