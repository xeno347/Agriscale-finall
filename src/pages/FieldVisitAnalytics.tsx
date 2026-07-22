import { useState, useMemo } from 'react';
import FlaggedVisitsModal from '@/components/fieldvisit/FlaggedVisitsModal';
import {
  Search, ChevronLeft, ChevronRight,
  Sprout, Bug, AlertTriangle, CheckCircle2,
  Flower2, ImageIcon, X, Flag, Eye,
  TrendingUp, ShieldAlert, Leaf, CalendarDays,
  Telescope,
} from 'lucide-react';
import {
  ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Area, AreaChart,
} from 'recharts';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface IssueDetail { present: boolean; type?: string }

interface FieldVisitEntry {
  id:              string;
  plot_name:       string;
  farm_name:       string;
  farm_id:         string;
  block_name:      string;
  date:            string;
  crop_height_cm:  number;
  weeds:           IssueDetail;
  insects:         IssueDetail;
  disease:         IssueDetail;
  fruiting:        boolean;
  images:          string[];
  field_manager:   string;
  flagged:         boolean;
}

// ─────────────────────────────────────────────────────────────
// MOCK DATA  (replace with API later)
// ─────────────────────────────────────────────────────────────
const MOCK: FieldVisitEntry[] = [
  { id:'fv-01', plot_name:'Plot A-1', farm_name:'Rajesh Farm', farm_id:'farm_001', block_name:'Block A', date:'2026-06-06', crop_height_cm:42, weeds:{present:false}, insects:{present:true,type:'Aphids'}, disease:{present:false}, fruiting:false, images:[], field_manager:'Harry', flagged:false },
  { id:'fv-02', plot_name:'Plot A-2', farm_name:'Rajesh Farm', farm_id:'farm_001', block_name:'Block A', date:'2026-06-06', crop_height_cm:38, weeds:{present:true,type:'Grass Weed'}, insects:{present:false}, disease:{present:true,type:'Leaf Blight'}, fruiting:false, images:[], field_manager:'Harry', flagged:false },
  { id:'fv-03', plot_name:'Plot B-1', farm_name:'Suresh Farm', farm_id:'farm_002', block_name:'Block B', date:'2026-06-06', crop_height_cm:55, weeds:{present:false}, insects:{present:false}, disease:{present:false}, fruiting:true, images:[], field_manager:'Lucas', flagged:false },
  { id:'fv-04', plot_name:'Plot B-2', farm_name:'Suresh Farm', farm_id:'farm_002', block_name:'Block B', date:'2026-06-07', crop_height_cm:49, weeds:{present:true,type:'Broadleaf Weed'}, insects:{present:false}, disease:{present:false}, fruiting:false, images:[], field_manager:'Lucas', flagged:false },
  { id:'fv-05', plot_name:'Plot C-1', farm_name:'Priya Farm', farm_id:'farm_003', block_name:'Block C', date:'2026-06-07', crop_height_cm:61, weeds:{present:false}, insects:{present:true,type:'Whitefly'}, disease:{present:true,type:'Powdery Mildew'}, fruiting:false, images:[], field_manager:'Harry', flagged:false },
  { id:'fv-06', plot_name:'Plot C-2', farm_name:'Priya Farm', farm_id:'farm_003', block_name:'Block C', date:'2026-06-07', crop_height_cm:44, weeds:{present:false}, insects:{present:false}, disease:{present:false}, fruiting:true, images:[], field_manager:'Neha', flagged:false },
  { id:'fv-07', plot_name:'Plot D-1', farm_name:'Mohan Farm', farm_id:'farm_004', block_name:'Block D', date:'2026-06-07', crop_height_cm:33, weeds:{present:true,type:'Sedge Weed'}, insects:{present:true,type:'Thrips'}, disease:{present:false}, fruiting:false, images:[], field_manager:'Neha', flagged:false },
  { id:'fv-08', plot_name:'Plot D-2', farm_name:'Mohan Farm', farm_id:'farm_004', block_name:'Block D', date:'2026-06-08', crop_height_cm:57, weeds:{present:false}, insects:{present:false}, disease:{present:false}, fruiting:false, images:[], field_manager:'Lucas', flagged:false },
  { id:'fv-09', plot_name:'Plot E-1', farm_name:'Anita Farm', farm_id:'farm_005', block_name:'Block E', date:'2026-06-08', crop_height_cm:70, weeds:{present:false}, insects:{present:false}, disease:{present:true,type:'Rust Disease'}, fruiting:true, images:[], field_manager:'Harry', flagged:false },
  { id:'fv-10', plot_name:'Plot E-2', farm_name:'Anita Farm', farm_id:'farm_005', block_name:'Block E', date:'2026-06-08', crop_height_cm:46, weeds:{present:true,type:'Grass Weed'}, insects:{present:false}, disease:{present:false}, fruiting:false, images:[], field_manager:'Neha', flagged:false },
  { id:'fv-11', plot_name:'Plot F-1', farm_name:'Vikram Farm', farm_id:'farm_006', block_name:'Block F', date:'2026-06-08', crop_height_cm:52, weeds:{present:false}, insects:{present:false}, disease:{present:false}, fruiting:true, images:[], field_manager:'Lucas', flagged:false },
  { id:'fv-12', plot_name:'Plot F-2', farm_name:'Vikram Farm', farm_id:'farm_006', block_name:'Block F', date:'2026-06-08', crop_height_cm:39, weeds:{present:true,type:'Broadleaf Weed'}, insects:{present:true,type:'Aphids'}, disease:{present:true,type:'Leaf Blight'}, fruiting:false, images:[], field_manager:'Harry', flagged:false },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
type Severity = 'critical' | 'high' | 'medium' | 'healthy';

const getSeverity = (e: FieldVisitEntry): Severity => {
  if (e.disease.present)  return 'critical';
  if (e.insects.present)  return 'high';
  if (e.weeds.present)    return 'medium';
  return 'healthy';
};

const severityConfig: Record<Severity, { label: string; dot: string; row: string; badge: string }> = {
  critical: { label:'Critical',  dot:'bg-red-500',    row:'border-l-4 border-l-red-400 bg-red-50/40',    badge:'bg-red-100 text-red-700 border-red-200'    },
  high:     { label:'High',      dot:'bg-orange-500', row:'border-l-4 border-l-orange-400 bg-orange-50/30', badge:'bg-orange-100 text-orange-700 border-orange-200' },
  medium:   { label:'Medium',    dot:'bg-yellow-500', row:'border-l-4 border-l-yellow-400 bg-yellow-50/30', badge:'bg-yellow-100 text-yellow-700 border-yellow-200' },
  healthy:  { label:'Healthy',   dot:'bg-emerald-500',row:'border-l-4 border-l-emerald-400 bg-white',     badge:'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

type FilterType = 'all' | 'critical' | 'high' | 'medium' | 'healthy' | 'fruiting' | 'flagged';
type DatePreset = 'today' | 'week' | 'month' | 'custom';

const PAGE_SIZE = 15;

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

const getPresetRange = (preset: Exclude<DatePreset, 'custom'>): { from: string; to: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = toDateStr(today);
  if (preset === 'today') return { from: to, to };
  if (preset === 'week') {
    const from = new Date(today); from.setDate(from.getDate() - 6);
    return { from: toDateStr(from), to };
  }
  const from = new Date(today); from.setMonth(from.getMonth() - 1);
  return { from: toDateStr(from), to };
};

// ─────────────────────────────────────────────────────────────
// IMAGE LIGHTBOX
// ─────────────────────────────────────────────────────────────
const ImageLightbox = ({ entry, onClose }: { entry: FieldVisitEntry; onClose: () => void }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Field Visit Images</p>
          <h3 className="text-sm font-bold text-gray-900">{entry.plot_name} · {entry.farm_name}</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5">
        {entry.images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-300">
            <ImageIcon className="w-12 h-12 mb-3" />
            <p className="text-sm text-gray-400">No images uploaded for this visit</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {entry.images.map((src, i) => (
              <img key={i} src={src} alt={`Visit ${i + 1}`} className="rounded-xl object-cover w-full h-44 border border-gray-100" />
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
const StatCard = ({
  label, value, icon: Icon, color, active, onClick,
}: {
  label: string; value: number; icon: React.ElementType;
  color: string; active: boolean; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex-1 min-w-[120px] rounded-2xl border px-4 py-3.5 text-left transition-all',
      active
        ? `${color} ring-2 ring-offset-1 ring-current shadow-sm`
        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm',
    )}
  >
    <div className={cn('inline-flex p-2 rounded-xl mb-2', active ? 'bg-white/30' : 'bg-gray-100')}>
      <Icon className={cn('w-4 h-4', active ? 'text-current' : 'text-gray-500')} />
    </div>
    <p className={cn('text-2xl font-bold', active ? 'text-current' : 'text-gray-900')}>{value}</p>
    <p className={cn('text-[11px] font-semibold mt-0.5', active ? 'text-current/80' : 'text-gray-500')}>{label}</p>
  </button>
);

// ─────────────────────────────────────────────────────────────
// ISSUE BADGE
// ─────────────────────────────────────────────────────────────
const IssueBadge = ({ issue, label, colorClass }: { issue: IssueDetail; label: string; colorClass: string }) => {
  if (!issue.present) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', colorClass)}>
      {label}{issue.type ? `: ${issue.type}` : ''}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function FieldVisitAnalytics() {
  const [data, setData]             = useState<FieldVisitEntry[]>(MOCK);
  const [search, setSearch]         = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [page, setPage]             = useState(1);
  const [lightboxEntry, setLightboxEntry] = useState<FieldVisitEntry | null>(null);
  const [scopeOpen, setScopeOpen]       = useState(false);
  const [flagsOpen, setFlagsOpen]       = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');

  // Summary counts
  const counts = useMemo(() => ({
    total:    data.length,
    critical: data.filter(e => getSeverity(e) === 'critical').length,
    high:     data.filter(e => getSeverity(e) === 'high').length,
    medium:   data.filter(e => getSeverity(e) === 'medium').length,
    healthy:  data.filter(e => getSeverity(e) === 'healthy').length,
    fruiting: data.filter(e => e.fruiting).length,
    flagged:  data.filter(e => e.flagged).length,
  }), [data]);

  // Active date range
  const dateRange = useMemo(() => {
    if (datePreset === 'custom') return { from: customFrom, to: customTo };
    return getPresetRange(datePreset as Exclude<DatePreset, 'custom'>);
  }, [datePreset, customFrom, customTo]);

  // Filtered + searched
  const filtered = useMemo(() => {
    let list = data;
    // Date filter
    if (dateRange.from) list = list.filter(e => e.date >= dateRange.from);
    if (dateRange.to)   list = list.filter(e => e.date <= dateRange.to);
    // Issue filter
    if (activeFilter === 'critical') list = list.filter(e => getSeverity(e) === 'critical');
    else if (activeFilter === 'high')     list = list.filter(e => getSeverity(e) === 'high');
    else if (activeFilter === 'medium')   list = list.filter(e => getSeverity(e) === 'medium');
    else if (activeFilter === 'healthy')  list = list.filter(e => getSeverity(e) === 'healthy');
    else if (activeFilter === 'fruiting') list = list.filter(e => e.fruiting);
    else if (activeFilter === 'flagged')  list = list.filter(e => e.flagged);
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.plot_name.toLowerCase().includes(q) ||
        e.farm_name.toLowerCase().includes(q) ||
        e.block_name.toLowerCase().includes(q) ||
        e.field_manager.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, activeFilter, search, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleFilter = (f: FilterType) => {
    setActiveFilter(prev => prev === f ? 'all' : f);
    setPage(1);
  };

  const toggleFlag = (id: string) => {
    setData(prev => prev.map(e => e.id === id ? { ...e, flagged: !e.flagged } : e));
  };

  // Group the current page of visits by date for the day-log view
  const groupedByDate = useMemo(() => {
    const map = new Map<string, FieldVisitEntry[]>();
    for (const e of paginated) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [paginated]);

  return (
    <div className="flex flex-col h-full bg-gray-50/50 overflow-hidden">

      {/* ── Page header ── */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Operations</p>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-600" />
              Field Visit Analytics
            </h1>
            <p className="text-[12px] text-gray-500 mt-0.5">Monitor crop health and flag issues across all assigned plots</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Flags button */}
            <button
              onClick={() => setFlagsOpen(true)}
              className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 text-[12px] font-semibold hover:bg-rose-100 transition-colors shadow-sm"
            >
              <Flag className="w-3.5 h-3.5" />
              Flag
              {counts.flagged > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {counts.flagged}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Sprout className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold text-gray-700">{data.length}</span> total visits ·
              <span className="font-semibold text-gray-700">Last 7 days</span>
            </div>
          </div>
        </div>

        {/* ── Summary stat cards ── */}
        <div className="flex gap-3 mt-5 flex-wrap">
          <StatCard label="Total Visits"  value={counts.total}    icon={Leaf}        color="bg-gray-100 text-gray-700 border-gray-300"          active={activeFilter==='all'}      onClick={() => toggleFilter('all')}      />
          <StatCard label="Disease"       value={counts.critical} icon={ShieldAlert}  color="bg-red-100 text-red-700 border-red-300"             active={activeFilter==='critical'} onClick={() => toggleFilter('critical')} />
          <StatCard label="Insects"       value={counts.high}     icon={Bug}          color="bg-orange-100 text-orange-700 border-orange-300"    active={activeFilter==='high'}     onClick={() => toggleFilter('high')}     />
          <StatCard label="Weeds"         value={counts.medium}   icon={AlertTriangle} color="bg-yellow-100 text-yellow-700 border-yellow-300"  active={activeFilter==='medium'}   onClick={() => toggleFilter('medium')}   />
          <StatCard label="Healthy"       value={counts.healthy}  icon={CheckCircle2} color="bg-emerald-100 text-emerald-700 border-emerald-300" active={activeFilter==='healthy'}  onClick={() => toggleFilter('healthy')}  />
          <StatCard label="Fruiting"      value={counts.fruiting} icon={Flower2}      color="bg-purple-100 text-purple-700 border-purple-300"    active={activeFilter==='fruiting'} onClick={() => toggleFilter('fruiting')} />
          <StatCard label="Flagged"       value={counts.flagged}  icon={Flag}         color="bg-rose-100 text-rose-700 border-rose-300"          active={activeFilter==='flagged'}  onClick={() => toggleFilter('flagged')}  />
        </div>
      </div>

      {/* ── Search + date filter bar ── */}
      <div className="px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search plot, farm, manager…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-56 pl-8 pr-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-gray-50"
            />
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200" />

          {/* Date preset tags */}
          {(['today', 'week', 'month', 'custom'] as DatePreset[]).map((preset) => {
            const labels: Record<DatePreset, string> = {
              today:  'Today',
              week:   'Past 1 Week',
              month:  'Past 1 Month',
              custom: 'Custom Range',
            };
            const active = datePreset === preset;
            return (
              <button
                key={preset}
                onClick={() => { setDatePreset(preset); setPage(1); }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors',
                  active
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700',
                )}
              >
                <CalendarDays className="w-3 h-3" />
                {labels[preset]}
              </button>
            );
          })}

          {/* Custom date inputs — only shown when preset is 'custom' */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => { setCustomFrom(e.target.value); setPage(1); }}
                className="px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-gray-50"
              />
              <span className="text-[11px] text-gray-400 font-medium">to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => { setCustomTo(e.target.value); setPage(1); }}
                className="px-2 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-gray-50"
              />
            </div>
          )}

          {/* Open Scope button */}
          <button
            onClick={() => setScopeOpen(true)}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-700 text-[12px] font-semibold hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Telescope className="w-3.5 h-3.5" />
            Open Scope
          </button>
        </div>
      </div>

      {/* ── Day-grouped visit log ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <Leaf className="w-10 h-10 mb-3" />
              <p className="text-sm text-gray-400">No visits match the current filter</p>
            </div>
          ) : (
            groupedByDate.map(([date, entries]) => (
              <div key={date}>
                {/* Day header */}
                <div className="flex items-center gap-2 px-5 py-2 bg-gray-50 border-b border-gray-100">
                  <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-[11px] font-bold text-gray-700">
                    {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-[10px] text-gray-400">· {entries.length} visit{entries.length !== 1 ? 's' : ''}</span>
                </div>

                {entries.map((entry) => {
                  const sev = getSeverity(entry);
                  const cfg = severityConfig[sev];
                  const issueCount = [entry.disease.present, entry.insects.present, entry.weeds.present].filter(Boolean).length;

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        'flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3 border-b border-gray-50 hover:bg-gray-50/60 transition-colors',
                        cfg.row,
                        entry.flagged && 'ring-1 ring-inset ring-rose-300',
                      )}
                    >
                      {/* Severity dot */}
                      <div className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />

                      {/* Plot */}
                      <div className="w-36 shrink-0">
                        <p className="text-[12px] font-semibold text-gray-900 truncate">{entry.plot_name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{entry.block_name}</p>
                      </div>

                      {/* Farm */}
                      <div className="w-32 shrink-0 text-[12px] text-gray-600 truncate">{entry.farm_name}</div>

                      {/* Manager */}
                      <div className="w-24 shrink-0 text-[12px] text-gray-600 truncate">{entry.field_manager}</div>

                      {/* Height */}
                      <div className="w-20 shrink-0 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="text-[12px] font-mono text-gray-700">{entry.crop_height_cm} cm</span>
                      </div>

                      {/* Issues */}
                      <div className="flex flex-1 min-w-[180px] flex-wrap gap-1">
                        {issueCount === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" /> No Issues
                          </span>
                        ) : (
                          <>
                            <IssueBadge issue={entry.disease} label="Disease" colorClass="bg-red-100 text-red-700 border-red-200" />
                            <IssueBadge issue={entry.insects} label="Insects" colorClass="bg-orange-100 text-orange-700 border-orange-200" />
                            <IssueBadge issue={entry.weeds}   label="Weeds"   colorClass="bg-yellow-100 text-yellow-700 border-yellow-200" />
                          </>
                        )}
                        {entry.fruiting && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-purple-100 text-purple-700 border-purple-200">
                            <Flower2 className="w-2.5 h-2.5" /> Fruiting
                          </span>
                        )}
                      </div>

                      {/* Images */}
                      <button
                        onClick={() => setLightboxEntry(entry)}
                        className={cn(
                          'shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-colors',
                          entry.images.length > 0
                            ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                            : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100',
                        )}
                      >
                        <ImageIcon className="w-3 h-3" />
                        {entry.images.length || 0}
                      </button>

                      {/* Flag */}
                      <button
                        onClick={() => toggleFlag(entry.id)}
                        title={entry.flagged ? 'Remove flag' : 'Flag for attention'}
                        className={cn(
                          'shrink-0 p-1.5 rounded-lg border transition-colors',
                          entry.flagged
                            ? 'border-rose-300 bg-rose-100 text-rose-600 hover:bg-rose-200'
                            : 'border-gray-200 bg-white text-gray-400 hover:border-rose-200 hover:text-rose-500',
                        )}
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-[12px] text-gray-500">
            <span>
              Showing <span className="font-semibold text-gray-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-gray-700">{filtered.length}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | '…')[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === '…' ? (
                    <span key={`e${i}`} className="px-1 text-gray-400">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={cn(
                        'w-8 h-8 rounded-lg border text-[12px] font-semibold transition-colors',
                        page === n
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600',
                      )}
                    >
                      {n}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {lightboxEntry && <ImageLightbox entry={lightboxEntry} onClose={() => setLightboxEntry(null)} />}

      {/* Scope modal */}
      {scopeOpen && <ScopeModal data={data} onClose={() => setScopeOpen(false)} />}

      {/* Flagged visits modal */}
      {flagsOpen && (
        <FlaggedVisitsModal
          entries={data.filter(e => e.flagged)}
          onUnflag={(id) => toggleFlag(id)}
          onClose={() => setFlagsOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCOPE MODAL
// ─────────────────────────────────────────────────────────────
const SEV_COLORS: Record<Severity, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  healthy:  '#10b981',
};

const CustomChartDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload) return null;
  const sev = getSeverity(payload.entry as FieldVisitEntry);
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={SEV_COLORS[sev]} stroke="#fff" strokeWidth={2} />
      {(payload.entry as FieldVisitEntry).flagged && (
        <text x={cx} y={cy - 14} textAnchor="middle" fontSize={13}>🚩</text>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const entry: FieldVisitEntry = d.entry;
  const sev = getSeverity(entry);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-[11px] min-w-[160px]">
      <p className="font-bold text-gray-900 mb-1">{entry.plot_name}</p>
      <p className="text-gray-500 mb-1">{new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      <p className="font-mono text-gray-700 mb-1.5">Height: <span className="font-bold">{entry.crop_height_cm} cm</span></p>
      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border', severityConfig[sev].badge)}>
        {severityConfig[sev].label}
      </span>
      {entry.flagged && <span className="ml-1 text-rose-600 font-bold">🚩 Flagged</span>}
      {entry.disease.present  && <p className="text-red-600 mt-1">Disease: {entry.disease.type}</p>}
      {entry.insects.present  && <p className="text-orange-600">Insects: {entry.insects.type}</p>}
      {entry.weeds.present    && <p className="text-yellow-600">Weeds: {entry.weeds.type}</p>}
      {entry.fruiting         && <p className="text-purple-600">🌸 Fruiting</p>}
    </div>
  );
};

function ScopeModal({ data, onClose }: { data: FieldVisitEntry[]; onClose: () => void }) {
  const [selectedFarmId, setSelectedFarmId] = useState('');

  const farms = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of data) if (!seen.has(e.farm_id)) seen.set(e.farm_id, e.farm_name);
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const farmEntries = useMemo(() =>
    data
      .filter(e => e.farm_id === selectedFarmId)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [data, selectedFarmId],
  );

  // Build chart data: one point per visit sorted by date
  const chartData = farmEntries.map(e => ({
    label: new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    height: e.crop_height_cm,
    entry: e,
  }));

  const avgHeight = farmEntries.length
    ? Math.round(farmEntries.reduce((s, e) => s + e.crop_height_cm, 0) / farmEntries.length)
    : 0;
  const issueCount  = farmEntries.filter(e => getSeverity(e) !== 'healthy').length;
  const flagCount   = farmEntries.filter(e => e.flagged).length;
  const maxHeight   = farmEntries.length ? Math.max(...farmEntries.map(e => e.crop_height_cm)) : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest mb-0.5">Farm Scope</p>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Telescope className="w-4 h-4 text-indigo-600" />
              Cumulative Crop Study
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Height progression &amp; issue timeline per farm</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Farm selector */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <select
            value={selectedFarmId}
            onChange={e => setSelectedFarmId(e.target.value)}
            className="w-full max-w-xs px-3 py-2 text-[13px] font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
          >
            <option value="">— Select a farm —</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!selectedFarmId ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
              <Telescope className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm text-gray-400">Select a farm to view its crop scope</p>
            </div>
          ) : farmEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
              <Leaf className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm text-gray-400">No visits recorded for this farm</p>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-5">

              {/* Summary chips */}
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Total Visits',  val: farmEntries.length, cls: 'bg-gray-100 text-gray-700 border-gray-200' },
                  { label: 'Avg Height',    val: `${avgHeight} cm`,  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { label: 'Max Height',    val: `${maxHeight} cm`,  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { label: 'With Issues',   val: issueCount,         cls: 'bg-orange-50 text-orange-700 border-orange-200' },
                  { label: 'Flagged',       val: flagCount,          cls: 'bg-rose-50 text-rose-700 border-rose-200' },
                ].map(c => (
                  <div key={c.label} className={cn('px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5', c.cls)}>
                    <span className="text-current/60">{c.label}:</span>
                    <span className="font-bold">{c.val}</span>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">
                  Crop Height Progression
                  <span className="ml-2 font-normal text-gray-400 normal-case">· dots coloured by severity · 🚩 = flagged visit</span>
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 24, right: 20, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="heightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit=" cm" width={42} />
                    <ReTooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="height"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#heightGrad)"
                      dot={<CustomChartDot />}
                      activeDot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Timeline strip */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Visit Timeline</p>
                <div className="space-y-2">
                  {farmEntries.map((e) => {
                    const sev = getSeverity(e);
                    const cfg = severityConfig[sev];
                    return (
                      <div key={e.id} className={cn('flex items-start gap-3 px-4 py-3 rounded-xl border', cfg.row, e.flagged && 'ring-1 ring-inset ring-rose-300')}>
                        <div className={cn('w-2.5 h-2.5 rounded-full mt-1 shrink-0', cfg.dot)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] font-semibold text-gray-800">{e.plot_name}</span>
                            {e.flagged && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">🚩 Flagged</span>}
                            <IssueBadge issue={e.disease} label="Disease" colorClass="bg-red-100 text-red-700 border-red-200" />
                            <IssueBadge issue={e.insects} label="Insects" colorClass="bg-orange-100 text-orange-700 border-orange-200" />
                            <IssueBadge issue={e.weeds}   label="Weeds"   colorClass="bg-yellow-100 text-yellow-700 border-yellow-200" />
                            {e.fruiting && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-purple-100 text-purple-700 border-purple-200"><Flower2 className="w-2.5 h-2.5" />Fruiting</span>}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            &nbsp;·&nbsp;{e.field_manager}&nbsp;·&nbsp;
                            <span className="font-mono">{e.crop_height_cm} cm</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60 flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
