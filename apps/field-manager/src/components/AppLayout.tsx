// src/components/AppLayout.tsx
import { Outlet } from "react-router-dom"; // <-- Outlet ko import karein
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
// AppLayoutProps interface ki zaroorat nahi hai
// interface AppLayoutProps {
//   children: React.ReactNode;
// }

// children prop ko hata dein
const AppLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col"> {/* Added flex flex-col */}
          <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex h-14 items-center gap-4 px-6">
              <SidebarTrigger />
              {/* Aap yahan header ke dusre elements (jaise user menu) add kar sakte hain */}
            </div>
          </header>
          {/* Main content area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6"> {/* Added padding */}
            {/* --- FIX: Use Outlet instead of children --- */}
            <Outlet />
            {/* ------------------------------------------ */}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;