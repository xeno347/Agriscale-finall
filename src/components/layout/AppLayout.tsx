import { useState, useEffect } from "react";
import {
  Users, UserCheck, Sprout, Calendar, UserPlus, Fuel,
  ChevronDown, X, Wheat, LogOut,
  Layers, Box, FileText, Map, AlertCircle, User,
  ClipboardCheck, Activity, FolderKanban, Landmark,
  Link2, LayoutDashboard, BookOpen, CreditCard, Receipt,
  Car, Mail, Package, Scale, Truck, CheckSquare, PieChart,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import modulesConfig from "@/config/modules.json";

// Map JSON icon name strings → Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  Users, UserCheck, Sprout, Calendar, UserPlus, Fuel,
  Layers, Box, FileText, Map, AlertCircle, User,
  ClipboardCheck, Activity, FolderKanban, Landmark,
  Link2, LayoutDashboard, BookOpen, CreditCard, Receipt,
  Car, Mail, Package, Scale, Truck, CheckSquare, PieChart,
};

/* ---------------- NAV ITEM COMPONENT ---------------- */

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  notificationStatus?: "warning" | "success" | "none";
}

const NavItem = ({
  to,
  icon: Icon,
  label,
  notificationStatus = "none",
}: NavItemProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm relative",
          isActive
            ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-semibold"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
        )
      }
      end
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              "w-5 h-5 shrink-0 transition-transform group-hover:scale-105",
              isActive
                ? "text-[var(--brand-primary)]"
                : "text-slate-400 group-hover:text-slate-700"
            )}
          />

          <span className="truncate">{label}</span>
          <span className="ml-auto" />

          {notificationStatus === "warning" ? (
            <AlertCircle className="w-4 h-4 text-orange-500 fill-orange-50 shrink-0" />
          ) : notificationStatus === "success" ? (
            <span className="w-2 h-2 rounded-full bg-green-500 ring-1 ring-white shrink-0" />
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
}

const NavGroup = ({ label, children }: NavGroupProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-1 py-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em] hover:text-slate-900"
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

/* ---------------- FLOATING TRIGGER BUTTON ---------------- */

interface FloatingNavTriggerProps {
  isOpen: boolean;
  onClick: () => void;
}

const FloatingNavTrigger = ({ isOpen, onClick }: FloatingNavTriggerProps) => {
  return (
    <button
      onClick={onClick}
      title={isOpen ? "Close navigation" : "Open navigation"}
      className={cn(
        "fixed bottom-6 left-6 z-[110] flex h-14 w-14 items-center justify-center rounded-full",
        "bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)]",
        "shadow-lg shadow-black/30 ring-1 ring-white/10",
        "transition-all duration-200 hover:shadow-xl hover:shadow-black/40 hover:scale-105 active:scale-95"
      )}
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <Wheat
          className={cn(
            "absolute h-6 w-6 text-white transition-all duration-200",
            isOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          )}
        />
        <X
          className={cn(
            "absolute h-6 w-6 text-white transition-all duration-200",
            isOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          )}
        />
      </span>
    </button>
  );
};

/* ---------------- NAV PANEL (floating overlay) ---------------- */

interface NavPanelProps {
  isOpen: boolean;
  onClose: () => void;
  leadsComplete: boolean;
}

const NavPanel = ({ isOpen, onClose, leadsComplete }: NavPanelProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.id === 'sbr-admin';

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[105] bg-black/40 transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed bottom-24 left-6 z-[108] flex w-80 max-h-[80vh] flex-col overflow-hidden rounded-2xl",
          "bg-white shadow-2xl shadow-black/20 ring-1 ring-slate-200",
          "origin-bottom-left transition-all duration-200",
          isOpen
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        )}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold text-[20px] tracking-[-0.01em] text-slate-900 leading-none">
              Agriscale
            </h1>
            <p className="mt-0.5 truncate text-[12px] text-slate-500 font-medium leading-tight">
              AmritAgrotech Private Limited
            </p>
          </div>

          <button
            onClick={onClose}
            className="mt-0.5 shrink-0 p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links — fully driven by src/config/modules.json */}
        <nav className="min-h-0 flex-1 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
          {modulesConfig.supersets.filter(s => isSuperAdmin || s.enabled).map(superset => {
            const allowedModules = user?.module_access ?? [];

            // Pre-compute which groups have at least one accessible item
            const visibleGroups = superset.groups
              .filter(g => isSuperAdmin || g.enabled)
              .map(g => ({
                ...g,
                visibleItems: g.items.filter(item =>
                  item.enabled && (isSuperAdmin || allowedModules.includes(item.key))
                ),
              }))
              .filter(g => g.visibleItems.length > 0);

            // Hide the entire superset if nothing is accessible
            if (visibleGroups.length === 0) return null;

            const SupersetIcon = ICON_MAP[superset.icon] ?? FileText;

            return (
              <div key={superset.key} className="space-y-2 border-t border-slate-200 mt-2 pt-3 py-1 first:mt-0 first:border-0 first:pt-1">
                <div className="mx-1 mb-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <SupersetIcon className="h-4 w-4 text-slate-500" />
                    <span className="text-[12px] font-extrabold text-slate-900 uppercase tracking-[0.1em]">
                      {superset.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    {superset.description}
                  </p>
                </div>

                {visibleGroups.map(group => (
                  <NavGroup key={group.key} label={group.label}>
                    {group.visibleItems.map(item => {
                      const ItemIcon = ICON_MAP[item.icon] ?? FileText;
                      const notif = item.key === 'leads'
                        ? (leadsComplete ? 'success' : 'warning')
                        : ((item as any).notificationStatus ?? 'none');
                      return (
                        <NavItem
                          key={item.key}
                          to={item.path}
                          icon={ItemIcon}
                          label={item.label}
                          notificationStatus={notif as 'warning' | 'success' | 'none'}
                        />
                      );
                    })}
                  </NavGroup>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 p-3">
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

/* ---------------- LAYOUT WRAPPER ---------------- */

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [leadsComplete] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.title = "SBR | Farm-connect";
  }, []);

  // Auto-close the nav panel whenever the route changes
  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="h-screen overflow-hidden bg-[#f8f9fb]">
      <main className="h-full w-full overflow-y-auto">
        {children}
      </main>

      <FloatingNavTrigger isOpen={isNavOpen} onClick={() => setIsNavOpen(o => !o)} />
      <NavPanel isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} leadsComplete={leadsComplete} />
    </div>
  );
};

export default AppLayout;
