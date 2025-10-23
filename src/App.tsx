import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// Use aliased paths without file extensions
import AppLayout from "@/components/AppLayout";

// Import all your pages using aliased paths without file extensions
import Index from "@/pages/Index";
import FieldMonitoring from "@/pages/FieldMonitoring";
import Supervisors from "@/pages/Supervisors";
import Inventory from "@/pages/Inventory";
import Settings from "@/pages/Settings";
import Analytics from "@/pages/Analytics"; // <-- IMPORTED
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/field-monitoring" element={<FieldMonitoring />} />
            <Route path="/supervisors" element={<Supervisors />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* --- ADDED ROUTE --- */}
            <Route path="/analytics" element={<Analytics />} />

            {/* CATCH-ALL "*" ROUTE MUST BE LAST */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;