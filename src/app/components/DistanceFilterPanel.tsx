import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ruler } from 'lucide-react';
import { DistanceFilter } from "../types/session";

interface DistanceFilterPanelProps {
    filters: DistanceFilter[];
    onFilterChange: (distance: number) => void;
}

export default function DistanceFilterPanel({ filters, onFilterChange }: DistanceFilterPanelProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Distance Filter
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-2">
                    {filters.map((filter) => (
                        <Button
                            key={filter.distance}
                            variant={filter.isActive ? "default" : "outline"}
                            className="w-full justify-between"
                            onClick={() => onFilterChange(filter.distance)}
                        >
                            <span>Within {filter.distance}m</span>
                            <span className="bg-primary-foreground text-primary px-2 py-0.5 rounded-full text-xs">
                                {filter.count}
                            </span>
                        </Button>
                    ))}
                    {filters.every(f => !f.isActive) && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                            No distance filter applied
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
} 