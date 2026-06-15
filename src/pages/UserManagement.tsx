import { useState, useEffect } from 'react';
import { getBaseUrl } from '@/lib/config';
import { toast } from 'sonner';
import { Search, Shield, ChevronDown, ChevronRight, Check, Minus } from 'lucide-react';
import modulesConfig from '@/config/modules.json';

interface StaffMember {
  staff_id: string;
  check_in: boolean;
  created_at: string;
  staff_information: {
    staff_name: string;
    staff_designation: string;
    staff_department: string;
    staff_phone: string;
    employment_type: string | { type: string; vendor?: string; order_number?: string };
    profile_image_url?: string;
  };
  credentials?: {
    user_name: string;
    role: string;
  };
}

type CheckState = 'all' | 'some' | 'none';

const TriCheckbox = ({ state, onChange }: { state: CheckState; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
      state === 'all'
        ? 'bg-green-600 border-green-600'
        : state === 'some'
        ? 'bg-green-100 border-green-500'
        : 'border-gray-300 bg-white hover:border-green-400'
    }`}
  >
    {state === 'all' && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
    {state === 'some' && <Minus className="w-2.5 h-2.5 text-green-700" strokeWidth={3} />}
  </button>
);

const UserManagement = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [expandedSupersets, setExpandedSupersets] = useState<Set<string>>(
    new Set(modulesConfig.supersets.map(s => s.key))
  );
  const [saving, setSaving] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  const BASE_URL = getBaseUrl().replace(/\/$/, '');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch(`${BASE_URL}/admin_staff/get_all_staff`);
        const data = await res.json();
        setStaff(Array.isArray(data) ? data : data.staff ?? []);
      } catch {
        toast.error('Failed to load staff list');
      } finally {
        setLoadingStaff(false);
      }
    };
    fetchStaff();
  }, [BASE_URL]);

  useEffect(() => {
    if (!selectedStaff) return;
    const fetchPermissions = async () => {
      setLoadingPermissions(true);
      try {
        const res = await fetch(
          `${BASE_URL}/admin_staff/get_module_permissions?user_id=${selectedStaff.staff_id}`
        );
        const data = await res.json();
        setSelectedModules(new Set(data.enabled_modules ?? []));
      } catch {
        setSelectedModules(new Set());
      } finally {
        setLoadingPermissions(false);
      }
    };
    fetchPermissions();
  }, [selectedStaff, BASE_URL]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getSupersetKeys = (supersetKey: string) =>
    modulesConfig.supersets
      .find(s => s.key === supersetKey)
      ?.groups.flatMap(g => g.items.map(i => i.key)) ?? [];

  const getGroupKeys = (supersetKey: string, groupKey: string) =>
    modulesConfig.supersets
      .find(s => s.key === supersetKey)
      ?.groups.find(g => g.key === groupKey)
      ?.items.map(i => i.key) ?? [];

  const checkState = (keys: string[]): CheckState => {
    const count = keys.filter(k => selectedModules.has(k)).length;
    if (count === 0) return 'none';
    if (count === keys.length) return 'all';
    return 'some';
  };

  const toggle = (keys: string[], state: CheckState) => {
    const next = new Set(selectedModules);
    if (state === 'all') keys.forEach(k => next.delete(k));
    else keys.forEach(k => next.add(k));
    setSelectedModules(next);
  };

  const toggleItem = (key: string) => {
    const next = new Set(selectedModules);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelectedModules(next);
  };

  const toggleExpand = (key: string) => {
    const next = new Set(expandedSupersets);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedSupersets(next);
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedStaff) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/admin_staff/add_accessable_modules_for_staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff.staff_id,
          modules: Array.from(selectedModules),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();
      toast.success(`Permissions updated for ${selectedStaff.staff_information.staff_name}`);
    } catch {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredStaff = staff.filter(s => {
    const q = searchQuery.toLowerCase();
    const info = s.staff_information;
    return (
      info.staff_name.toLowerCase().includes(q) ||
      info.staff_designation.toLowerCase().includes(q) ||
      info.staff_department.toLowerCase().includes(q) ||
      (s.credentials?.role ?? '').toLowerCase().includes(q)
    );
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full p-6 gap-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure which modules each staff member can access
        </p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* ── Staff list ─────────────────────────────── */}
        <div className="w-72 flex flex-col border rounded-xl bg-white shadow-sm">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingStaff ? (
              <div className="p-6 text-center text-sm text-gray-400">Loading...</div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No staff found</div>
            ) : (
              filteredStaff.map(member => {
                const info = member.staff_information;
                const isSelected = selectedStaff?.staff_id === member.staff_id;
                return (
                  <button
                    key={member.staff_id}
                    onClick={() => setSelectedStaff(member)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors ${
                      isSelected ? 'bg-green-50 border-l-[3px] border-l-green-600' : ''
                    }`}
                  >
                    {info.profile_image_url ? (
                      <img
                        src={info.profile_image_url}
                        alt={info.staff_name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                        {info.staff_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{info.staff_name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {info.staff_designation} · {info.staff_department}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2 border-t text-xs text-gray-400 text-center">
            {filteredStaff.length} member{filteredStaff.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── Permissions panel ──────────────────────── */}
        {!selectedStaff ? (
          <div className="flex-1 border rounded-xl bg-white shadow-sm flex flex-col items-center justify-center text-center p-8 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <Shield className="w-7 h-7 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700">Select a staff member</p>
            <p className="text-sm text-gray-400 max-w-xs">
              Choose someone from the list to configure their module access permissions
            </p>
          </div>
        ) : (
          <div className="flex-1 border rounded-xl bg-white shadow-sm flex flex-col min-h-0">
            {/* Panel header */}
            <div className="px-5 py-4 border-b flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {selectedStaff.staff_information.profile_image_url ? (
                  <img
                    src={selectedStaff.staff_information.profile_image_url}
                    alt={selectedStaff.staff_information.staff_name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold flex-shrink-0">
                    {selectedStaff.staff_information.staff_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {selectedStaff.staff_information.staff_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedStaff.staff_information.staff_designation} ·{' '}
                    {selectedStaff.staff_information.staff_department}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-400">
                  {selectedModules.size} module{selectedModules.size !== 1 ? 's' : ''} enabled
                </span>
                <button
                  onClick={handleSave}
                  disabled={saving || loadingPermissions}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Module tree */}
            {loadingPermissions ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                Loading permissions…
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {modulesConfig.supersets.map(superset => {
                  const supersetKeys = getSupersetKeys(superset.key);
                  const supersetState = checkState(supersetKeys);
                  const isExpanded = expandedSupersets.has(superset.key);
                  const enabledCount = supersetKeys.filter(k => selectedModules.has(k)).length;

                  return (
                    <div key={superset.key} className="border rounded-lg overflow-hidden">
                      {/* Superset row */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b select-none">
                        <TriCheckbox
                          state={supersetState}
                          onChange={() => toggle(supersetKeys, supersetState)}
                        />
                        <span className="font-bold text-sm text-slate-800 flex-1 tracking-wide">
                          {superset.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {enabledCount}/{supersetKeys.length}
                        </span>
                        <button
                          onClick={() => toggleExpand(superset.key)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {isExpanded
                            ? <ChevronDown className="w-4 h-4" />
                            : <ChevronRight className="w-4 h-4" />
                          }
                        </button>
                      </div>

                      {/* Groups + items */}
                      {isExpanded && (
                        <div className="divide-y">
                          {superset.groups.map(group => {
                            const groupKeys = getGroupKeys(superset.key, group.key);
                            const groupState = checkState(groupKeys);

                            return (
                              <div key={group.key} className="px-4 py-3 space-y-2">
                                {/* Group header */}
                                <div className="flex items-center gap-3">
                                  <TriCheckbox
                                    state={groupState}
                                    onChange={() => toggle(groupKeys, groupState)}
                                  />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    {group.label}
                                  </span>
                                </div>

                                {/* Items */}
                                <div className="ml-7 grid grid-cols-2 gap-x-6 gap-y-1.5">
                                  {group.items.map(item => (
                                    <label
                                      key={item.key}
                                      className="flex items-center gap-2 cursor-pointer group"
                                    >
                                      <TriCheckbox
                                        state={selectedModules.has(item.key) ? 'all' : 'none'}
                                        onChange={() => toggleItem(item.key)}
                                      />
                                      <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                                        {item.label}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
