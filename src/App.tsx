import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import AuthLanding from "./pages/AuthLanding";
import Login from "./pages/Login";
import Index from "./pages/Index";
import LandOverview from "./pages/LandOverview";
import NotFound from "./pages/NotFound";
import Inventory from "./pages/Inventory";
import CultivationMaster from "./pages/CultivationMaster";
import CultivationPlan from "./pages/CultivationPlan";
import CreateCultivationPlan from "./pages/CreateCultivationPlan";
import CultivationCalendar from "./pages/CultivationCalendar";
import FieldVisitAnalytics from "./pages/FieldVisitAnalytics";
import HarvestOrders from "./pages/HarvestOrders";
import StaffOnboarding from "./pages/StaffOnboarding";
import VehicleManagement from "./pages/VehicleManagement";
import WeighmentQC from "./pages/WeighmentQC";
import KhasraFinder from "./pages/khasra_finder";
import VendorDirectory from "./pages/VendorDirectory";
import PurchaseFlow from "@/pages/PurchaseFlow";
import ProjectConfig from "@/pages/ProjectConfig";
import FuelsAndConsumables from "./pages/FuelsAndConsumables";
import WorkOrder from "./pages/WorkOrder";
import ScopeOfWork from "./pages/ScopeOfWork";
import WebApp from "./pages/webapp/WebApp";
import Inbox from "./pages/Inbox";
import LabourManagement from "./pages/LabourManagement";
import AccountsDashboard from "./pages/AccountsDashboard";
import AccountsLedger from "./pages/AccountsLedger";
import AccountsPayments from "./pages/AccountsPayments";
import Budget from "./pages/Budget";
import BudgetDashboard from "./pages/BudgetDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AuthLanding />} />
          <Route path="/index" element={<Index />} />

          <Route path="/land-overview" element={<AppLayout><LandOverview /></AppLayout>} />

          {/* Operations */}
          <Route path="/cultivation-calendar" element={<AppLayout><CultivationCalendar /></AppLayout>} />
          <Route path="/cultivation-master/*" element={<AppLayout><CultivationMaster /></AppLayout>} />
          <Route path="/cultivation-plan" element={<AppLayout><CultivationPlan /></AppLayout>} />
          <Route path="/cultivation-plan/create" element={<AppLayout><CreateCultivationPlan /></AppLayout>} />
          <Route path="/labour-management" element={<AppLayout><LabourManagement /></AppLayout>} />
          <Route path="/field-visit-analytics" element={<AppLayout><FieldVisitAnalytics /></AppLayout>} />

          {/* Harvest & Weighment */}
          <Route path="/harvest-orders" element={<AppLayout><HarvestOrders /></AppLayout>} />
          <Route path="/weighment" element={<AppLayout><WeighmentQC /></AppLayout>} />

          {/* Management */}
          <Route path="/work-order" element={<AppLayout><WorkOrder /></AppLayout>} />
          <Route path="/scope-of-work" element={<AppLayout><ScopeOfWork /></AppLayout>} />
          <Route path="/inventory" element={<AppLayout><Inventory /></AppLayout>} />
          <Route path="/fuels-and-consumables" element={<AppLayout><FuelsAndConsumables /></AppLayout>} />
          <Route
            path="/vendor-directory"
            element={
              <AppLayout>
                <VendorDirectory />
              </AppLayout>
            }
          />
          <Route path="/vehicle-management" element={<AppLayout><VehicleManagement /></AppLayout>} />
          <Route path="/staff-onboarding" element={<AppLayout><StaffOnboarding /></AppLayout>} />

          {/* Tools (not in sidebar nav) */}
          <Route path="/tools/khasra_records" element={<KhasraFinder />} />
          <Route path="/khasra-finder" element={<Navigate to="/tools/khasra_records" replace />} />

          <Route
            path="/purchase-flow"
            element={
              <AppLayout>
                <PurchaseFlow />
              </AppLayout>
            }
          />
          <Route
            path="/project-config"
            element={
              <AppLayout>
                <ProjectConfig />
              </AppLayout>
            }
          />

          {/* Inbox — per department */}
          <Route path="/inventory/inbox" element={<AppLayout><Inbox department="Inventory" /></AppLayout>} />
          <Route path="/purchase/inbox"  element={<AppLayout><Inbox department="Purchase" /></AppLayout>} />
          <Route path="/hrms/inbox"      element={<AppLayout><Inbox department="HRMS" /></AppLayout>} />

          {/* Accounts */}
          <Route path="/accounts/dashboard"    element={<AppLayout><AccountsDashboard /></AppLayout>} />
          <Route path="/accounts/ledger"       element={<AppLayout><AccountsLedger /></AppLayout>} />
          <Route path="/accounts/payments"     element={<AppLayout><AccountsPayments /></AppLayout>} />
          <Route path="/budget"                element={<AppLayout><BudgetDashboard /></AppLayout>} />
          <Route path="/budget/:budgetId"      element={<AppLayout><Budget /></AppLayout>} />

          {/* Standalone Webapp — no ERP sidebar */}
          <Route path="/approval/webapp/*" element={<WebApp />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
