import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Target, Trash2, Layers, Ruler, Plus } from 'lucide-react';
import { SessionData, ObjectMarker, DistanceFilter, TimeFilter, TimeFilterOption } from "../types/session";
import { useState } from "react";

interface AnalysisPanelProps {
    sessions: SessionData[];
    objectMarkers: ObjectMarker[];
    distanceFilters: DistanceFilter[];
    timeFilter: TimeFilter;
    timeFilterOptions: TimeFilterOption[];
    onToggleSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string) => void;
    onAddMarker: (frameId: string) => void;
    onDeleteMarker: (frameId: number) => void;
    onFilterChange: (distance: number) => void;
    onTimeFilterChange: (filter: TimeFilter) => void;
}

export default function AnalysisPanel({
    sessions,
    objectMarkers,
    distanceFilters,
    timeFilter,
    timeFilterOptions,
    onToggleSession,
    onDeleteSession,
    onAddMarker,
    onDeleteMarker,
    onFilterChange,
    onTimeFilterChange
}: AnalysisPanelProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [frameId, setFrameId] = useState("");
    const [activeTab, setActiveTab] = useState("sessions");

    const handleSubmit = () => {
        onAddMarker(frameId);
        setFrameId("");
        setIsDialogOpen(false);
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Analysis Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="px-4">
                        <TabsList className="w-full grid grid-cols-3">
                            <TabsTrigger value="sessions" className="flex items-center gap-2">
                                <Layers className="h-4 w-4" />
                                Sessions
                            </TabsTrigger>
                            <TabsTrigger value="objects" className="flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Objects
                            </TabsTrigger>
                            <TabsTrigger value="filters" className="flex items-center gap-2">
                                <Ruler className="h-4 w-4" />
                                Filters
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="sessions" className="m-0">
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-1 p-4">
                                {sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="flex items-center justify-between space-x-2 rounded-md px-3 py-2 hover:bg-accent group"
                                    >
                                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                                            <Checkbox 
                                                checked={session.isVisible}
                                                onCheckedChange={() => onToggleSession(session.id)}
                                                style={{ 
                                                    backgroundColor: session.isVisible ? session.color : undefined,
                                                    borderColor: session.color 
                                                }}
                                            />
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="truncate text-[13px] leading-tight">
                                                        {session.name}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-[300px]">
                                                    <p className="text-sm break-all">{session.name}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                            onClick={() => onDeleteSession(session.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {sessions.length === 0 && (
                                    <div className="text-sm text-muted-foreground text-center py-4">
                                        No sessions loaded
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="objects" className="m-0">
                        <div className="p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                    {objectMarkers.length} object{objectMarkers.length !== 1 ? 's' : ''} marked
                                </span>
                                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Object
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add Object Marker</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">
                                                    Enter Frame ID
                                                </label>
                                                <Input
                                                    type="number"
                                                    placeholder="Frame ID"
                                                    value={frameId}
                                                    onChange={(e) => setFrameId(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleSubmit();
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <Button 
                                                onClick={handleSubmit}
                                                className="w-full"
                                            >
                                                Add Marker
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <Separator />
                            <ScrollArea className="h-[300px]">
                                <div className="space-y-2">
                                    {objectMarkers.map((marker) => (
                                        <div
                                            key={marker.frameId}
                                            className="flex items-center justify-between space-x-2 rounded-md px-3 py-2 hover:bg-accent group"
                                        >
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <div 
                                                    className="w-2 h-2 rounded-full" 
                                                    style={{ backgroundColor: marker.sessionColor }}
                                                />
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <div className="text-sm">Frame: {marker.frameId}</div>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="text-xs text-muted-foreground truncate">
                                                                {marker.sessionName}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="max-w-[300px]">
                                                            <p className="text-sm break-all">{marker.sessionName}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                                onClick={() => onDeleteMarker(marker.frameId)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {objectMarkers.length === 0 && (
                                        <div className="text-sm text-muted-foreground text-center py-4">
                                            No object markers added
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </TabsContent>

                    <TabsContent value="filters" className="m-0">
                        <div className="p-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-medium mb-2">Time Filter</h3>
                                <div className="space-y-2">
                                    {timeFilterOptions.map((option) => (
                                        <Button
                                            key={option.value}
                                            variant={timeFilter === option.value ? "default" : "outline"}
                                            className="w-full justify-between"
                                            onClick={() => onTimeFilterChange(option.value)}
                                            disabled={objectMarkers.length === 0}
                                        >
                                            <span>{option.label}</span>
                                        </Button>
                                    ))}
                                </div>
                                {objectMarkers.length === 0 && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Add object markers to enable time filtering
                                    </p>
                                )}
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-sm font-medium mb-2">Distance Filter</h3>
                                <div className="space-y-2">
                                    {distanceFilters.map((filter) => (
                                        <Button
                                            key={filter.distance}
                                            variant={filter.isActive ? "default" : "outline"}
                                            className="w-full justify-between"
                                            onClick={() => onFilterChange(filter.distance)}
                                            disabled={objectMarkers.length === 0}
                                        >
                                            <span>Within {filter.distance}m</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                filter.isActive 
                                                    ? "bg-primary-foreground text-primary" 
                                                    : "bg-muted text-muted-foreground"
                                            }`}>
                                                {filter.count}
                                            </span>
                                        </Button>
                                    ))}
                                </div>
                                {objectMarkers.length === 0 && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Add object markers to enable filtering
                                    </p>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
} 