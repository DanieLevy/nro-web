import CsvUploader from './components/CsvUploader';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from 'sonner';

export default function Home() {
  return (
    <TooltipProvider>
      <main className="min-h-screen bg-gradient-to-b from-background to-muted">
        <div className="container mx-auto p-8">
          <CsvUploader />
        </div>
      </main>
      <Toaster richColors closeButton position="top-right" />
    </TooltipProvider>
  );
}
