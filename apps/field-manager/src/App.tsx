import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom"; // Removed Navigate

// Import using relative paths and .tsx extension
import AppLayout from "./components/AppLayout.tsx"; // AppLayout should contain <Outlet />
import Index from "./pages/Index.tsx";
import FieldMonitoring from "./pages/FieldMonitoring.tsx";
import Supervisors from "./pages/Supervisors.tsx";
import Settings from "./pages/Settings.tsx";
import TasksAndStock from "./pages/TasksAndStock.tsx";
import NotFound from "./pages/NotFound.tsx";
import LoginPage from "./pages/Login.tsx";

const queryClient = new QueryClient();

// Removed AuthCheck / ProtectedRoutes component

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Route for the Login Page */}
          <Route path="/login" element={<LoginPage />} />

          {/* --- FIX: Pass AppLayout directly to element prop --- */}
          {/* AppLayout itself renders an <Outlet /> for its children routes */}
          <Route element={<AppLayout />}>
            <Route index element={<Index />} /> {/* Dashboard at "/" */}
            <Route path="field-monitoring" element={<FieldMonitoring />} />
            <Route path="supervisors" element={<Supervisors />} />
            <Route path="settings" element={<Settings />} />
            <Route path="tasks-stock" element={<TasksAndStock />} />
            {/* Add other layout routes here */}
          </Route>
          {/* --------------------------------------------------- */}

          {/* Catch-all Not Found Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;