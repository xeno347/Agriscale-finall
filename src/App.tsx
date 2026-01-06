import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Index from "./pages/Index";
import Leads from "./pages/Leads";
import Farmers from "./pages/Farmers";
import HarvestPlanning from "./pages/HarvestPlanning";
import NotFound from "./pages/NotFound";
import Inventory from "./pages/Inventory";
import CultivationMaster from "./pages/CultivationMaster";
import CultivationPlan from "./pages/CultivationPlan";
import CreateCultivationPlan from "./pages/CreateCultivationPlan";
import CultivationCalendar from "./pages/CultivationCalendar";
import HarvestOrders from "./pages/HarvestOrders";
import StaffOnboarding from "./pages/StaffOnboarding";
import LogisticsManagement from "./pages/LogisticsManagement";
import Blocks from "./pages/Blocks";
import TasksBeta from "./pages/TasksBeta";

// New Import
import VehicleManagement from "./pages/VehicleManagement";

// Field Visit page (new route)
// FieldVisit page removed until ./pages/FieldVisit is added

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          <Route path="/leads" element={<AppLayout><Leads /></AppLayout>} />
          <Route path="/tasks-beta" element={<AppLayout><TasksBeta /></AppLayout>} />
          <Route path="/farmers" element={<AppLayout><Farmers /></AppLayout>} />
          
          {/* Operations */}
          <Route path="/cultivation-calendar" element={<AppLayout><CultivationCalendar /></AppLayout>} />
          <Route path="/cultivation-master/*" element={<AppLayout><CultivationMaster /></AppLayout>} />
          <Route path="/cultivation-plan" element={<AppLayout><CultivationPlan /></AppLayout>} />
          <Route path="/cultivation-plan/create" element={<AppLayout><CreateCultivationPlan /></AppLayout>} />

          {/* Field Visit (not in sidenav) */}
          {/* Route removed until ./pages/FieldVisit exists */}

          {/* Harvest Management */}
          <Route path="/harvest-planning" element={<AppLayout><HarvestPlanning /></AppLayout>} />
          <Route path="/harvest-orders" element={<AppLayout><HarvestOrders /></AppLayout>} />

          {/* Management */}
          <Route path="/inventory" element={<AppLayout><Inventory /></AppLayout>} />
          <Route path="/logistics" element={<AppLayout><LogisticsManagement /></AppLayout>} />
          <Route path="/vehicle-management" element={<AppLayout><VehicleManagement /></AppLayout>} />
          <Route path="/staff-onboarding" element={<AppLayout><StaffOnboarding /></AppLayout>} />
          <Route path="/blocks" element={<AppLayout><Blocks /></AppLayout>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;