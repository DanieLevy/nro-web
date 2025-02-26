'use client';

import { SessionData } from '../types/session';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SessionManagerProps {
    sessions: SessionData[];
    onToggleSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string) => void;
}

export default function SessionManager({ 
    sessions, 
    onToggleSession,
    onDeleteSession 
}: SessionManagerProps) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-sm">Loaded Sessions ({sessions.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-16rem)]">
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
                                            <span className="text-sm truncate">
                                                {session.name}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{session.name}</p>
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
            </CardContent>
        </Card>
    );
} 