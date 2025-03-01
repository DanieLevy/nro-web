import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseTimestamp, getTimeInMs } from '../utils/timeUtils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TimestampDebug() {
    const [timestamp, setTimestamp] = useState('1737886091800000');
    const [result, setResult] = useState<{ date: Date | null; ms: number | null }>({ date: null, ms: null });
    const [error, setError] = useState<string | null>(null);

    const testTimestamp = () => {
        try {
            const date = parseTimestamp(timestamp);
            const ms = getTimeInMs(timestamp);
            
            setResult({ date, ms });
            setError(null);
        } catch (e) {
            setError(`Error parsing timestamp: ${e}`);
        }
    };

    const testExamples = () => {
        const examples = [
            '1737886091800000',  // Microseconds - Jan 26, 2025
            '1737886091800',     // Milliseconds - Jan 26, 2025
            '1737886091',        // Seconds - Jan 26, 2025
            '2023-01-01T12:30:00',  // ISO format
            'invalid',           // Invalid string
        ];

        examples.forEach(example => {
            try {
                const date = parseTimestamp(example);
                console.log(`Example: ${example} → ${date.toISOString()} (${date.toLocaleString()})`);
            } catch (e) {
                console.error(`Error parsing ${example}: ${e}`);
            }
        });
    };

    return (
        <Card className="max-w-md mx-auto my-6">
            <CardHeader>
                <CardTitle>Timestamp Debug Tool</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Input 
                            value={timestamp} 
                            onChange={(e) => setTimestamp(e.target.value)}
                            placeholder="Enter timestamp" 
                        />
                        <Button onClick={testTimestamp}>Test</Button>
                    </div>
                    
                    <Button variant="outline" onClick={testExamples}>Test Examples</Button>
                    
                    {error && (
                        <div className="text-red-500 text-sm mt-2">{error}</div>
                    )}
                    
                    {result.date && (
                        <div className="border rounded p-4 space-y-2">
                            <div className="grid grid-cols-2">
                                <span className="font-medium">Date (ISO):</span>
                                <span>{result.date.toISOString()}</span>
                            </div>
                            <div className="grid grid-cols-2">
                                <span className="font-medium">Date (Local):</span>
                                <span>{result.date.toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-2">
                                <span className="font-medium">Time (ms):</span>
                                <span>{result.ms}</span>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
} 