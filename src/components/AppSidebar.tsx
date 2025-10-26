import {
  Home,
  Users,
  Activity,
  TrendingUp,
  Settings,
  LogOut,
  Sprout,
  ListTodo,// Icon for Tasks & Stock
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Updated menu items
const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Employee Management", url: "/supervisors", icon: Users },
  { title: "Field Monitoring", url: "/field-monitoring", icon: Activity },
  { title: "Tasks & Stock", url: "/tasks-stock", icon: ListTodo },
  { title: "System Settings", url: "/settings", icon: Settings },

];

export function AppSidebar() {
  return (
    <Sidebar>
      {/* Header: AGRISCALE LOGO */}
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Sprout className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-foreground">AgriScale</h2>
        </div>
      </SidebarHeader>

      {/* Main navigation content */}
      <SidebarContent>
        <SidebarMenu className="p-4 space-y-2">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-all
                    ${
                      isActive
                        ? "bg-green-600 text-white" // Active state
                        : "text-foreground hover:bg-muted" // Inactive state
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer Section */}
      <SidebarFooter>
        {/* Profile & Logout */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback>SM</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Sharaj
              </p>
              <p className="text-xs text-muted-foreground">
                ID: AG-1023
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
        
        {/* "Made by Zenithra" footer */}
        <div className="p-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Made by Zenithra
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

