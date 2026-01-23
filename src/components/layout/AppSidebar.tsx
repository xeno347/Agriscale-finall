import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Sprout,
  Package,
  Calendar,
  UserPlus,
  Truck,
  Car,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  CheckSquare,
  Box,
  Scale,
  Tractor,
  FileText,
  Map 
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

/* ---------------- NAV ITEM COMPONENT ---------------- */

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  notificationStatus?: "warning" | "success" | "none";
  isSidebarCollapsed: boolean;
}

const NavItem = ({
  to,
  icon: Icon,
  label,
  notificationStatus = "none",
  isSidebarCollapsed,
}: NavItemProps) => {
  const location = useLocation();
  const isActive =
    location.pathname === to ||
    location.pathname.startsWith(to + "/");

  return (
    <NavLink
      to={to}
      title={isSidebarCollapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative text-sm",
        isActive
          ? "bg-gray-100 text-[#1e293b] font-semibold"
          : "text-gray-500 hover:bg-gray-50 hover:text-[#1e293b] font-medium",
        isSidebarCollapsed && "justify-center px-2"
      )}
    >
      <Icon
        className={cn(
          "shrink-0 transition-transform group-hover:scale-105",
          isSidebarCollapsed ? "w-6 h-6" : "w-5 h-5",
          isActive
            ? "text-[#1e293b]"
            : "text-gray-400 group-hover:text-[#1e293b]"
        )}
      />

      {!isSidebarCollapsed && <span className="truncate">{label}</span>}

      {notificationStatus !== "none" && (
        <span
          className={cn(
            "absolute w-2 h-2 rounded-full ring-1 ring-white",
            isSidebarCollapsed
              ? "top-2 right-2"
              : "right-3 top-1/2 -translate-y-1/2",
            notificationStatus === "warning" && "bg-orange-500",
            notificationStatus === "success" && "bg-green-500"
          )}
        />
      )}
    </NavLink>
  );
};

/* ---------------- NAV GROUP COMPONENT ---------------- */

interface NavGroupProps {
  label: string;
  children: React.ReactNode;
  isSidebarCollapsed: boolean;
}

const NavGroup = ({
  label,
  children,
  isSidebarCollapsed,
}: NavGroupProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (isSidebarCollapsed) {
    return (
      <div className="space-y-1 py-1 border-t border-gray-100 first:border-0">
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-1 py-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-[#1e293b]"
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "space-y-1 pl-2 border-l border-gray-100 ml-2 transition-all",
          isOpen
            ? "max-h-[500px] opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        )}
      >
        {children}
      </div>
    </div>
  );
};

/* ---------------- MAIN SIDEBAR COMPONENT ---------------- */

interface AppSidebarProps {
  leadsComplete: boolean;
}

const AppSidebar = ({ leadsComplete }: AppSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    document.title = "SBR | Farm-connect";
  }, []);

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen bg-white flex flex-col border-r border-gray-200 transition-all z-50",
        isCollapsed ? "w-[80px]" : "w-72"
      )}
    >
      {/* Header with Logo */}
      <div
        className={cn(
          "h-20 flex items-center border-b border-gray-100 px-5",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Logo Container */}
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100 overflow-hidden relative">
            <img
              src="/3f-logo.png" 
              alt="Logo"
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if(e.currentTarget.parentElement) {
                    const fallbackSpan = document.createElement('span');
                    fallbackSpan.innerText = 'FC';
                    fallbackSpan.className = 'text-green-700 font-bold text-sm';
                    e.currentTarget.parentElement.appendChild(fallbackSpan);
                }
              }}
            />
          </div>

          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-lg text-[#1e293b] leading-tight">
                SaiBioresources
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Farm Connect
              </p>
            </div>
          )}
        </div>

        {/* Collapse Button */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Expand Button */}
      {isCollapsed && (
        <div className="flex justify-center py-3 border-b border-gray-50">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
        
        {/* Group 1: Farm Management */}
        <NavGroup label="Farm Management" isSidebarCollapsed={isCollapsed}>
          <NavItem to="/tasks-beta" icon={CheckSquare} label="Tasks (Beta)" isSidebarCollapsed={isCollapsed} />
          <NavItem 
            to="/leads" 
            icon={Users} 
            label="Leads" 
            isSidebarCollapsed={isCollapsed} 
            notificationStatus={leadsComplete ? "success" : "warning"} 
          />
          <NavItem to="/farmers" icon={UserCheck} label="Farmers" isSidebarCollapsed={isCollapsed} />
          <NavItem to="/blocks" icon={Layers} label="Blocks" isSidebarCollapsed={isCollapsed} />
        </NavGroup>

        {/* Group 2: Harvest Management */}
        <NavGroup label="Harvest Management" isSidebarCollapsed={isCollapsed}>
          <NavItem to="/harvest-planning" icon={Sprout} label="Harvest Planning" isSidebarCollapsed={isCollapsed} />
          <NavItem to="/harvest-orders" icon={Package} label="Harvest Orders" isSidebarCollapsed={isCollapsed} />
          <NavItem to="/weighment" icon={Scale} label="Weighment & QC" isSidebarCollapsed={isCollapsed} />
        </NavGroup>

        {/* Group 3: Management */}
        <NavGroup label="Management" isSidebarCollapsed={isCollapsed}>
          <NavItem to="/inventory" icon={Box} label="Inventory" isSidebarCollapsed={isCollapsed} />
          <NavItem to="/logistics" icon={Truck} label="Logistics" isSidebarCollapsed={isCollapsed} />
          {/* Resource Management removed here */}
          <NavItem to="/vehicle-management" icon={Car} label="Vehicle List" isSidebarCollapsed={isCollapsed} />
          <NavItem to="/fleet-chart" icon={Map} label="Fleet Chart" isSidebarCollapsed={isCollapsed} />
          <NavItem to="/staff-onboarding" icon={UserPlus} label="Staff Onboarding" isSidebarCollapsed={isCollapsed} />
        </NavGroup>

        {/* Group 4: Lease & Asset Management */}
        <NavGroup label="Lease & Asset Management" isSidebarCollapsed={isCollapsed}>
          <NavItem to="/rental-rate-card" icon={Tractor} label="Rental Rate Card" isSidebarCollapsed={isCollapsed} />
          <NavItem to="/service-requests" icon={FileText} label="Service Request" isSidebarCollapsed={isCollapsed} />
        </NavGroup>

        {/* Group 5: Operations */}
        <NavGroup label="Operation" isSidebarCollapsed={isCollapsed}>
          <NavItem to="/cultivation-calendar" icon={Calendar} label="Cultivation Calendar" isSidebarCollapsed={isCollapsed} />
          <NavItem to="/cultivation-master" icon={Sprout} label="Cultivation Master" isSidebarCollapsed={isCollapsed} />
          <NavItem to="/cultivation-plan" icon={Layers} label="Cultivation Plan" isSidebarCollapsed={isCollapsed} />
        </NavGroup>

      </nav>
    </aside>
  );
};

export default AppSidebar;