import { useState } from "react";
import { 
  Home, Activity, ListChecks, Users, Leaf, TrendingUp, Star, 
  Package, Truck, Calendar, Brain, MessageSquare, Clock, 
  LogOut, ChevronLeft, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NavLink } from "@/components/NavLink";

const menuItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: Activity, label: "Field Monitoring", path: "/field-monitoring" },
  { icon: ListChecks, label: "Task Management", path: "/task-management" },
  { icon: Users, label: "Employee Management", path: "/employee-management" },
  { icon: Leaf, label: "Crop Cycle Monitoring", path: "/crop-cycle" },
  { icon: TrendingUp, label: "Regional Analytics", path: "/regional-analytics" },
  { icon: Star, label: "Performance Review", path: "/performance-review" },
  { icon: Package, label: "Inventory Management", path: "/inventory" },
  { icon: Truck, label: "Logistics Management", path: "/logistics" },
  { icon: Calendar, label: "Resource Planning", path: "/resource-planning" },
  { icon: Brain, label: "AI Analysis", path: "/ai-analysis" },
  { icon: MessageSquare, label: "Communications", path: "/communications" },
  { icon: Clock, label: "Attendance Management", path: "/attendance" },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "bg-sidebar border-r border-sidebar-border h-screen flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold text-sidebar-primary">AgriScale</h1>
            <p className="text-xs text-muted-foreground">Farm Manager</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            collapsed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-muted">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-primary truncate">
                Vikram Reddy
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Bharat Agriculture Ltd
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item, index) => (
            <li key={index}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                activeClassName="bg-accent text-accent-foreground font-medium"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
};
