import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import using relative paths (./) and .tsx extension
import AppLayout from "./components/AppLayout.tsx";
import Index from "@/pages/Index.tsx";
import FieldMonitoring from "@/pages/FieldMonitoring.tsx";
import Supervisors from "@/pages/Supervisors.tsx";
import Settings from "@/pages/Settings.tsx"; // <-- FIX: Corrected typo "pagesimg" to "pages"
import TasksAndStock from "@/pages/TasksAndStock.tsx"; // <-- IMPORTED
import NotFound from "@/pages/NotFound.tsx";
import SupervisorTaskDetails from "@/pages/SupervisorTaskDetails.tsx";
// Analytics and Inventory have been removed

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
            <Route path="/settings" element={<Settings />} />
            <Route path="/tasks-stock" element={<TasksAndStock />} /> {/* <-- ADDED */}
            <Route
      path="supervisors/:supervisorId/tasks"
      element={<SupervisorTaskDetails />}
    />
            {/* CATCH-ALL "*" ROUTE MUST BE LAST */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;