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
  Map,
  AlertCircle,
  User,
  MoreHorizontal,
  ClipboardCheck,
  Activity,
  CreditCard,
  Settings,
  FolderKanban,
  Landmark,
  IndianRupee,
  Wallet,
  PieChart,
  TrendingUp,
  HandCoins,
  Scale as BalanceScale,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { fetchLatestProjectFile } from "@/services/projectData";

/* ---------------- NAV ITEM COMPONENT ---------------- */

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  notificationStatus?: "warning" | "success" | "none";
  isSidebarCollapsed: boolean;
  budgetCard?: boolean;
}

const NavItem = ({
  to,
  icon: Icon,
  label,
  notificationStatus = "none",
  isSidebarCollapsed,
  budgetCard = false,
}: NavItemProps) => {
  return (
    <NavLink
      to={to}
      title={isSidebarCollapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm relative",
          budgetCard && "rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm hover:border-slate-300 hover:bg-slate-50",
          isActive
            ? budgetCard
              ? "border-slate-300 bg-slate-50 text-[#1e293b] font-semibold"
              : "bg-gray-100 text-[#1e293b] font-semibold"
            : "text-gray-500 hover:bg-gray-50 hover:text-[#1e293b] font-medium",
          isSidebarCollapsed && "justify-center px-2"
        )
      }
      end
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              "shrink-0 transition-transform group-hover:scale-105",
              isSidebarCollapsed ? "w-6 h-6" : budgetCard ? "w-5 h-5" : "w-5 h-5",
              isActive
                ? "text-[#1e293b]"
                : "text-gray-400 group-hover:text-[#1e293b]"
            )}
          />

          {!isSidebarCollapsed && <span className="truncate">{label}</span>}
          {!isSidebarCollapsed && <span className="ml-auto" />}

          {/* Updated notification logic to render AlertCircle icon for warnings */}
          {notificationStatus === "warning" ? (
            <AlertCircle
              className={cn(
                "text-orange-500 fill-orange-50 shrink-0",
                isSidebarCollapsed
                  ? "absolute top-1 right-1 w-3 h-3"
                  : "w-4 h-4"
              )}
            />
          ) : notificationStatus === "success" ? (
            <span
              className={cn(
                "w-2 h-2 rounded-full bg-green-500 ring-1 ring-white shrink-0",
                isSidebarCollapsed
                  ? "absolute top-2 right-2"
                  : ""
              )}
            />
          ) : null}
        </>
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
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-[0.08em] hover:text-[#1e293b]"
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
          "space-y-1 pl-1 overflow-hidden transition-all duration-300 ease-in-out",
          isOpen
            ? "max-h-[2000px] opacity-100"
            : "max-h-0 opacity-0"
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
  const [budgetState, setBudgetState] = useState({
    hasCapex: false,
    hasOpex: false,
    hasAmortization: false,
  });
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "SBR | Farm-connect";
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadBudgetState = async () => {
      try {
        const { data } = await fetchLatestProjectFile();
        if (!isMounted) return;

        setBudgetState({
          hasCapex: Boolean(data.step3_capex?.lineItems?.length),
          hasOpex: Boolean((data as any).step4_opex?.lineItems?.length),
          hasAmortization: Boolean(data.step6_amortizationAndViability?.amortizationBalanceSheet?.length),
        });
      } catch {
        if (!isMounted) return;
        setBudgetState({
          hasCapex: false,
          hasOpex: false,
          hasAmortization: false,
        });
      }
    };

    void loadBudgetState();

    return () => {
      isMounted = false;
    };
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
          "h-16 shrink-0 border-b border-slate-200 bg-gradient-to-b from-white via-slate-50/70 to-white px-4",
          isCollapsed ? "flex items-center justify-center" : "flex items-center justify-between gap-2"
        )}
      >
        <div className={cn("flex gap-3", isCollapsed ? "items-center" : "min-w-0 flex-1 items-start")}>
          {/* Logo Container */}
          <div className="h-11 w-11 rounded-2xl bg-white/95 flex items-center justify-center shadow-[0_8px_24px_rgba(15,23,42,0.09)] border border-slate-200 overflow-hidden relative ring-1 ring-white">
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
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-semibold text-[20px] tracking-[-0.01em] text-slate-900 leading-none">
                SaiBioresources
              </h1>
              <p className="mt-0.5 truncate text-[12px] text-slate-500 font-medium leading-tight">
                Private Limited
              </p>

            </div>
          )}
        </div>

        {/* Collapse Button */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="mt-0.5 shrink-0 p-1.5 rounded-md text-gray-400 hover:bg-gray-100 transition-colors"
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
      <nav className="min-h-0 flex-1 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
        {/* Super Set: ADMIN */}
        <div className={cn("space-y-2 py-1", !isCollapsed && "border-t border-gray-100 mt-2 pt-3")}>
          {!isCollapsed && (
            <div className="mx-1 mb-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-slate-700" />
                <span className="text-[12px] font-extrabold text-slate-800 uppercase tracking-[0.1em]">
                  ADMIN
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-600">
                Admin controls and farmer operations
              </p>
            </div>
          )}

          <NavGroup label="Indents and Request" isSidebarCollapsed={isCollapsed}>
            <NavItem to="/admin-request" icon={ClipboardCheck} label="Admin Ops Request" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/admin-ops-indents" icon={FileText} label="Admin Ops Indents" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/on-demand-task" icon={ClipboardCheck} label="On Demand Task" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/admin-mrf-approvals" icon={FileText} label="Admin MRF Approvals" isSidebarCollapsed={isCollapsed} />
          </NavGroup>

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
            <NavItem to="/blocks" icon={Layers} label="Land Hierarchy" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/land-acquisition" icon={Map} label="Land Acquisition" isSidebarCollapsed={isCollapsed} />
          </NavGroup>
        </div>

        {/* Super Set: PURCHASE */}
        <div className={cn("space-y-2 py-1", !isCollapsed && "border-t border-gray-100 mt-2 pt-3")}>
          {!isCollapsed && (
            <div className="mx-1 mb-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-slate-700" />
                <span className="text-[12px] font-extrabold text-slate-800 uppercase tracking-[0.1em]">
                  PURCHASE
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-600">
                Inventory and procurement modules
              </p>
            </div>
          )}

          {/* Group 2: Inventory Management */}
          <NavGroup label="Inventory Management" isSidebarCollapsed={isCollapsed}>
            <NavItem to="/inventory" icon={Box} label="Inventory" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/inventory-indents" icon={FileText} label="Inventory Indents" isSidebarCollapsed={isCollapsed} />
          </NavGroup>

          {/* Group 3: Purchase And Procurement */}
          <NavGroup label="Purchase And Procurement" isSidebarCollapsed={isCollapsed}>
            <NavItem to="/finance-admin-ops-indents" icon={FileText} label="Finance Admin Ops" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/purchase-requisition" icon={FileText} label="Purchase Requisition" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/vendor-directory" icon={FileText} label="Vendor Directory" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/ho" icon={FileText} label="HO Module" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/purchase-flow" icon={FileText} label="Purchase Flow" isSidebarCollapsed={isCollapsed} />
          </NavGroup>
        </div>

        {/* Super Set: Payroll & Attendance */}
        <div className={cn("space-y-2 py-1", !isCollapsed && "border-t border-gray-100 mt-2 pt-3")}>
          {!isCollapsed && (
            <div className="mx-1 mb-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700" />
                <span className="text-[12px] font-extrabold text-slate-800 uppercase tracking-[0.1em]">
                  PAYROLL & ATTENDANCE
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-600">
                People and workforce modules
              </p>
            </div>
          )}

          {/* Group 5: Human Resource */}
          <NavGroup label="Human Resource" isSidebarCollapsed={isCollapsed}>
            <NavItem to="/hrms" icon={Landmark} label="Payroll & Attendance" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/staff-onboarding" icon={UserPlus} label="Staff Onboarding" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/man-power-requisition" icon={FileText} label="Man Power Requisition" isSidebarCollapsed={isCollapsed} />
          </NavGroup>
        </div>

        {/* Super Set: OPERATIONS */}
        <div className={cn("space-y-2 py-1", !isCollapsed && "border-t border-gray-100 mt-2 pt-3")}>
          {!isCollapsed && (
            <div className="mx-1 mb-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-slate-700" />
                <span className="text-[12px] font-extrabold text-slate-800 uppercase tracking-[0.1em]">
                  OPERATIONS
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-600">
                Daily execution modules
              </p>
            </div>
          )}

          {/* Group 6: Harvest Management */}
          <NavGroup label="Harvest Management" isSidebarCollapsed={isCollapsed}>
            <NavItem to="/harvest-planning" icon={Sprout} label="Harvest Planning" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/harvest-orders" icon={Package} label="Harvest Orders" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/harvest-cards" icon={CreditCard} label="Harvest Cards" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/weighment" icon={Scale} label="Weighment & QC" isSidebarCollapsed={isCollapsed} />
          </NavGroup>

          {/* Group 6: Logistics */}
          <NavGroup label="Logistics" isSidebarCollapsed={isCollapsed}>
            <NavItem 
              to="/logistics" 
              icon={Truck} 
              label="Logistics Request" 
              isSidebarCollapsed={isCollapsed} 
              notificationStatus="warning"
            />
            <NavItem to="/vehicle-management" icon={Car} label="Vehicle List" isSidebarCollapsed={isCollapsed} />
            <NavItem 
              to="/fleet-chart" 
              icon={Map} 
              label="Fleet Chart" 
              isSidebarCollapsed={isCollapsed} 
              notificationStatus="warning"
            />
          </NavGroup>

          {/* Group 7: Lease & Asset Management */}
          <NavGroup label="Lease & Asset Management" isSidebarCollapsed={isCollapsed}>
            <NavItem to="/rental-rate-card" icon={Tractor} label="Rental Rate Card" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/service-requests" icon={FileText} label="Service Request" isSidebarCollapsed={isCollapsed} />
          </NavGroup>

          {/* Group 8: Operation */}
          <NavGroup label="Operation" isSidebarCollapsed={isCollapsed}>
            <NavItem to="/cultivation-calendar" icon={Calendar} label="Cultivation Calendar" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/cultivation-master" icon={Sprout} label="Cultivation Master" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/cultivation-plan" icon={Layers} label="Cultivation Plan" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/field-monitoring" icon={Activity} label="Field Monitoring" isSidebarCollapsed={isCollapsed} />
          </NavGroup>
        </div>

        {/* Super Set: DIRECTOR */}
        <div className={cn("space-y-2 py-1", !isCollapsed && "border-t border-gray-100 mt-2 pt-3")}>
          {!isCollapsed && (
            <div className="mx-1 mb-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-slate-700" />
                <span className="text-[12px] font-extrabold text-slate-800 uppercase tracking-[0.1em]">
                  DIRECTOR
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-600">
                Strategic finance and oversight modules
              </p>
            </div>
          )}

          <NavGroup label="Budgets" isSidebarCollapsed={isCollapsed}>
            <div className={cn(!isCollapsed && "mx-1") }>
              {!isCollapsed && (
                <div className="mb-2 flex items-center gap-2 px-2">
                  <div className="h-px flex-1 border-t border-dashed border-slate-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">CAPEX to Cash Flow</span>
                  <div className="h-px flex-1 border-t border-dashed border-slate-300" />
                </div>
              )}

              <div className="relative space-y-0.5">
                <div
                  className={cn(
                    "absolute left-[22px] top-[22px] bottom-[22px] border-l border-dashed",
                    budgetState.hasCapex && budgetState.hasOpex ? "border-emerald-300" : "border-slate-300",
                  )}
                />

                <NavItem to="/director/capex" icon={IndianRupee} label="CAPEX" isSidebarCollapsed={isCollapsed} budgetCard />
                <div className={cn("ml-5 h-3 border-l border-dashed", budgetState.hasCapex ? "border-emerald-300" : "border-slate-300")} />

                <NavItem to="/director/opex" icon={Wallet} label="OPEX" isSidebarCollapsed={isCollapsed} budgetCard />
                <div className={cn("ml-5 h-3 border-l border-dashed", budgetState.hasCapex && budgetState.hasOpex ? "border-emerald-300" : "border-slate-300")} />

                <NavItem to="/director/cash-flow" icon={TrendingUp} label="Cash Flow" isSidebarCollapsed={isCollapsed} budgetCard />
                <div className={cn("ml-5 h-3 border-l border-dashed", budgetState.hasAmortization ? "border-emerald-300" : "border-slate-300")} />

                <NavItem to="/director/amortization" icon={PieChart} label="AMMORTIZATION" isSidebarCollapsed={isCollapsed} budgetCard />
              </div>
            </div>

            <NavItem to="/project-config" icon={Settings} label="Project Config" isSidebarCollapsed={isCollapsed} />
          </NavGroup>

          <NavGroup label="Analytics" isSidebarCollapsed={isCollapsed}>
            <NavItem to="/director/cost-monitoring" icon={TrendingUp} label="Cost Monitoring" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/director/emis-investments" icon={HandCoins} label="EMIs and Investments" isSidebarCollapsed={isCollapsed} />
            <NavItem to="/director/assets-liabilities" icon={BalanceScale} label="Assets and Liabilities" isSidebarCollapsed={isCollapsed} />
          </NavGroup>
        </div>

      </nav>

      {/* Footer (User Details + More button) */}
      <div
        className={cn(
          "shrink-0 border-t border-gray-100",
          isCollapsed ? "p-2" : "p-3"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>

          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                SBR User
              </p>
              <p className="text-xs text-gray-500 truncate">
                Logistics Manager
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("/tools/khasra_records")}
          title={isCollapsed ? "More" : undefined}
          className={cn(
            "mt-3 w-full rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors",
            isCollapsed
              ? "mx-auto flex h-10 w-10 items-center justify-center p-0"
              : "flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold"
          )}
        >
          <MoreHorizontal className={cn(isCollapsed ? "w-5 h-5" : "w-4 h-4")} />
          {!isCollapsed && <span>More</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
