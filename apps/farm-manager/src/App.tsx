import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Corrected import paths to use the '@/' alias
import { Sidebar } from "@/components/dashboard/Sidebar";
import Index from "@/pages/Index";
import FieldMonitoring from "@/pages/FieldMonitoring";
import TaskManagement from "@/pages/TaskManagement";
import EmployeeManagement from "@/pages/EmployeeManagement";
import CropCycleMonitoring from "@/pages/CropCycleMonitoring";
import RegionalAnalytics from "@/pages/RegionalAnalytics";
import PerformanceReview from "@/pages/PerformanceReview";
import InventoryManagement from "@/pages/InventoryManagement";
import LogisticsManagement from "@/pages/LogisticsManagement";
// import ResourcePlanning from "@/pages/ResourcePlanning"; // <-- REMOVED
import AIAnalysis from "@/pages/AIAnalysis";
import Communications from "@/pages/Communications";
import AttendanceManagement from "@/pages/AttendanceManagement";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex h-screen bg-background overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/field-monitoring" element={<FieldMonitoring />} />
              <Route path="/task-management" element={<TaskManagement />} />
              <Route path="/employee-management" element={<EmployeeManagement />} />
              <Route path="/crop-cycle" element={<CropCycleMonitoring />} />
              <Route path="/regional-analytics" element={<RegionalAnalytics />} />
              <Route path="/performance-review" element={<PerformanceReview />} />
              <Route path="/inventory" element={<InventoryManagement />} />
              <Route path="/logistics" element={<LogisticsManagement />} />
              {/* <Route path="/resource-planning" element={<ResourcePlanning />} /> */} {/* <-- REMOVED */}
              <Route path="/ai-analysis" element={<AIAnalysis />} />
              <Route path="/communications" element={<Communications />} />
              <Route path="/attendance" element={<AttendanceManagement />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;