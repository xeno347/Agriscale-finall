import { Users, UserCheck, Wheat, Sprout, Package, Calendar } from 'lucide-react';
import { Box } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  notificationStatus?: 'warning' | 'success' | 'none';
}

const NavItem = ({ to, icon: Icon, label, notificationStatus = 'none' }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      )}
    >
      <Icon className={cn('w-5 h-5 transition-transform group-hover:scale-110', isActive && 'text-sidebar-primary')} />
      <span className="font-medium">{label}</span>
      {notificationStatus !== 'none' && (
        <span
          className={cn(
            'absolute right-3 w-2.5 h-2.5 rounded-full animate-pulse-subtle',
            notificationStatus === 'warning' && 'bg-warning',
            notificationStatus === 'success' && 'bg-success'
          )}
        />
      )}
    </NavLink>
  );
};

interface AppSidebarProps {
  leadsComplete: boolean;
}

const AppSidebar = ({ leadsComplete }: AppSidebarProps) => {
  return (
    <aside className="w-64 sticky top-0 h-screen bg-sidebar flex flex-col border-r border-sidebar-border overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Wheat className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-sidebar-foreground">SBR</h1>
            <p className="text-xs text-sidebar-foreground/60">Agro Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-4 mb-3">
          Farm Management
        </p>
        
        <NavItem
          to="/leads"
          icon={Users}
          label="Leads"
          notificationStatus={leadsComplete ? 'success' : 'warning'}
        />
        
        <NavItem
          to="/farmers"
          icon={UserCheck}
          label="Farmers"
        />

        {/* HARVEST SECTION */}
        <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-4 mb-3 mt-6">
          Harvest Management
        </p>

        {/* New Link Added Here */}
        <NavItem
          to="/harvest-calendar"
          icon={Calendar}
          label="Harvest Calendar"
        />

        <NavItem
          to="/harvest-planning"
          icon={Sprout}
          label="Harvest Planning"
        />

        <NavItem
          to="/harvest-orders"
          icon={Package}
          label="Harvest Orders"
        />
        
        <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-4 mb-3 mt-6">
          Management
        </p>
        <NavItem
          to="/inventory"
          icon={Box}
          label="Inventory"
        />

        {/* Operation Group */}
        <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-4 mb-3 mt-6">
          Operation
        </p>

        <NavItem
          to="/cultivation-master"
          icon={Sprout}
          label="Cultivation Master"
        />
        <NavItem
          to="/cultivation-plan"
          icon={Package}
          label="Cultivation Plan"
        />
       
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-semibold text-sidebar-foreground">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">Admin User</p>
            <p className="text-xs text-sidebar-foreground/60">Field Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;