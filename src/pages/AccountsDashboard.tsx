import { LayoutDashboard } from "lucide-react";

const AccountsDashboard = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <LayoutDashboard className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Accounts Dashboard</h1>
          <p className="text-sm text-slate-500">Financial overview and key metrics</p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center py-24 text-center gap-2">
        <LayoutDashboard className="h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-400">Dashboard coming soon</p>
      </div>
    </div>
  );
};

export default AccountsDashboard;
