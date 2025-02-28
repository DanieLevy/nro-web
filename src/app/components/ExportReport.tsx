import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SessionData, ObjectMarker } from '../types/session';

interface ExportReportProps {
    sessions: SessionData[];
    objectMarkers: ObjectMarker[];
    mapRef: React.RefObject<HTMLDivElement>;
}

export default function ExportReport({ sessions, objectMarkers, mapRef }: ExportReportProps) {
    const generateReport = async () => {
        if (!mapRef.current) return;

        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;

        // Add title
        pdf.setFontSize(20);
        pdf.text('Session Analysis Report', margin, margin + 10);
        pdf.setFontSize(12);
        
        let yPosition = margin + 20;

        // Add timestamp
        const timestamp = new Date().toLocaleString();
        pdf.text(`Generated: ${timestamp}`, margin, yPosition);
        yPosition += 10;

        // Add sessions information
        pdf.setFontSize(16);
        pdf.text('Sessions', margin, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(12);
        sessions.forEach(session => {
            if (session.isVisible) {
                pdf.text(`• ${session.name}`, margin + 5, yPosition);
                yPosition += 7;
            }
        });
        yPosition += 5;

        // Add object markers information
        if (objectMarkers.length > 0) {
            pdf.setFontSize(16);
            pdf.text('Object Markers', margin, yPosition);
            yPosition += 10;
            
            pdf.setFontSize(12);
            for (const marker of objectMarkers) {
                pdf.text(`Object at Frame ${marker.frameId}:`, margin + 5, yPosition);
                yPosition += 7;
                pdf.text(`Session: ${marker.sessionName}`, margin + 10, yPosition);
                yPosition += 7;
                pdf.text(`Timestamp: ${marker.datetime_timestamp}`, margin + 10, yPosition);
                yPosition += 7;
                pdf.text(`Coordinates: ${marker.lat.toFixed(6)}, ${marker.long.toFixed(6)}`, margin + 10, yPosition);
                yPosition += 10;

                if (marker.approachPoints && marker.approachPoints.length > 0) {
                    pdf.text('Approach Points:', margin + 10, yPosition);
                    yPosition += 7;

                    marker.approachPoints.forEach(point => {
                        pdf.text(`${point.targetDistance}m:`, margin + 15, yPosition);
                        yPosition += 7;
                        pdf.text(`Frame: ${point.frameId}`, margin + 20, yPosition);
                        yPosition += 7;
                        pdf.text(`Time Before Object: ${point.timeDifference.toFixed(1)}s`, margin + 20, yPosition);
                        yPosition += 7;
                        pdf.text(`Distance: ${point.distance.toFixed(1)}m`, margin + 20, yPosition);
                        yPosition += 10;

                        // Check if we need a new page
                        if (yPosition > pageHeight - margin) {
                            pdf.addPage();
                            yPosition = margin + 10;
                        }
                    });
                }

                // Check if we need a new page
                if (yPosition > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin + 10;
                }
            }
        }

        // Capture map
        try {
            const canvas = await html2canvas(mapRef.current, {
                useCORS: true,
                allowTaint: true,
                scrollY: -window.scrollY
            });

            // Add new page for the map
            pdf.addPage();
            
            // Calculate dimensions to fit the map while maintaining aspect ratio
            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Add map title
            pdf.setFontSize(16);
            pdf.text('Map View', margin, margin + 10);
            
            // Add the map image
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', margin, margin + 15, imgWidth, imgHeight);

            // Save the PDF
            pdf.save('session-analysis-report.pdf');
        } catch (error) {
            console.error('Error generating map capture:', error);
        }
    };

    return (
        <Button 
            onClick={generateReport}
            variant="outline"
            className="gap-2"
        >
            <Download className="h-4 w-4" />
            Export Report
        </Button>
    );
} 