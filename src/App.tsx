import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import AdminRequestPage from "./pages/AdminRequestPage";
import Blocks from "./pages/Blocks";
import TasksBeta from "./pages/TasksBeta";
import VehicleManagement from "./pages/VehicleManagement";
import WeighmentQC from "./pages/WeighmentQC";
import RentalRateCard from "./pages/RentalRateCard";
import ServiceRequest from "./pages/ServiceRequest";
import FleetChart from "./pages/FleetChart";
import KhasraFinder from "./pages/khasra_finder";
import FieldMonitoring from "./pages/FieldMonitoring";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
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
          <Route path="/field-monitoring" element={<AppLayout><FieldMonitoring /></AppLayout>} />

          {/* Harvest & Weighment */}
          <Route path="/harvest-planning" element={<AppLayout><HarvestPlanning /></AppLayout>} />
          <Route path="/harvest-orders" element={<AppLayout><HarvestOrders /></AppLayout>} />
          <Route path="/weighment" element={<AppLayout><WeighmentQC /></AppLayout>} />

          {/* Management */}
          <Route path="/inventory" element={<AppLayout><Inventory /></AppLayout>} />
          <Route path="/logistics" element={<AppLayout><LogisticsManagement /></AppLayout>} />
          <Route path="/admin-request" element={<AppLayout><AdminRequestPage /></AppLayout>} /> {/* [NEW ROUTE] */}
          <Route path="/resource-management" element={<AppLayout><FleetChart /></AppLayout>} />
          <Route path="/vehicle-management" element={<AppLayout><VehicleManagement /></AppLayout>} />
          <Route path="/fleet-chart" element={<AppLayout><FleetChart /></AppLayout>} />
          <Route path="/staff-onboarding" element={<AppLayout><StaffOnboarding /></AppLayout>} />
          
          {/* Blocks */}
          <Route path="/blocks" element={<AppLayout><Blocks /></AppLayout>} />

          {/* Lease & Asset Management */}
          <Route path="/rental-rate-card" element={<AppLayout><RentalRateCard /></AppLayout>} />
          <Route path="/service-requests" element={<AppLayout><ServiceRequest /></AppLayout>} />

          {/* Tools (not in sidebar nav) */}
          <Route path="/tools/khasra_records" element={<KhasraFinder />} />
          <Route path="/khasra-finder" element={<Navigate to="/tools/khasra_records" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;