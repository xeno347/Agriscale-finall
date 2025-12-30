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
import HarvestOrders from "./pages/HarvestOrders";
import NotFound from "./pages/NotFound";

import Inventory from "./pages/Inventory";

import CultivationMaster from "./pages/CultivationMaster";
import CultivationPlan from "./pages/CultivationPlan";
import CreateCultivationPlan from "./pages/CreateCultivationPlan";

// 1. UPDATED IMPORT: Renamed from HarvestCalendar to CultivationCalendar
import CultivationCalendar from "./pages/CultivationCalendar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/leads"
            element={
              <AppLayout>
                <Leads />
              </AppLayout>
            }
          />
          <Route
            path="/farmers"
            element={
              <AppLayout>
                <Farmers />
              </AppLayout>
            }
          />
          
          {/* 2. UPDATED ROUTE: Changed path and component */}
          <Route
            path="/cultivation-calendar"
            element={
              <AppLayout>
                <CultivationCalendar />
              </AppLayout>
            }
          />

          <Route
            path="/harvest-planning"
            element={
              <AppLayout>
                <HarvestPlanning />
              </AppLayout>
            }
          />
          <Route
            path="/harvest-orders"
            element={
              <AppLayout>
                <HarvestOrders />
              </AppLayout>
            }
          />
          <Route
            path="/inventory"
            element={
              <AppLayout>
                <Inventory />
              </AppLayout>
            }
          />
            <Route
              path="/cultivation-master/*"
              element={
                <AppLayout>
                  <CultivationMaster />
                </AppLayout>
              }
            />
            <Route
              path="/cultivation-plan"
              element={
                <AppLayout>
                  <CultivationPlan />
                </AppLayout>
              }
            />
            <Route
              path="/cultivation-plan/create"
              element={
                <AppLayout>
                  <CreateCultivationPlan />
                </AppLayout>
              }
            />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;