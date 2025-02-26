import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Trash2 } from 'lucide-react';
import { ObjectMarker } from "../types/session";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface ObjectMarkerManagerProps {
    objectMarkers: ObjectMarker[];
    onAddMarker: (frameId: string) => void;
    onDeleteMarker: (frameId: number) => void;
}

export default function ObjectMarkerManager({ 
    objectMarkers, 
    onAddMarker,
    onDeleteMarker 
}: ObjectMarkerManagerProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [frameId, setFrameId] = useState("");

    const handleSubmit = () => {
        onAddMarker(frameId);
        setFrameId("");
        setIsDialogOpen(false);
    };

    return (
        <>
            <style jsx global>{`
                .dialog-overlay {
                    background-color: rgba(0, 0, 0, 0.5) !important;
                    backdrop-filter: blur(4px);
                }
                
                [data-radix-popper-content-wrapper] {
                    z-index: 500 !important;
                }
            `}</style>
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Object Markers ({objectMarkers.length})
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
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
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[200px]">
                        <div className="space-y-1 p-4">
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
                                        <div className="space-y-1">
                                            <div className="text-sm">Frame: {marker.frameId}</div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {marker.sessionName}
                                            </div>
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
                </CardContent>
            </Card>
        </>
    );
} 