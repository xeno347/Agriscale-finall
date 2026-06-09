import { useState } from 'react';
import {
  X, Flag, AlertTriangle, Bug, ShieldAlert,
  Flower2, TrendingUp, User, Calendar,
  CheckCircle2, ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// TYPES  (mirror the parent — keep in sync or extract to shared)
// ─────────────────────────────────────────────────────────────
interface IssueDetail { present: boolean; type?: string }

export interface FlaggedEntry {
  id:             string;
  plot_name:      string;
  farm_name:      string;
  farm_id:        string;
  block_name:     string;
  date:           string;
  crop_height_cm: number;
  weeds:          IssueDetail;
  insects:        IssueDetail;
  disease:        IssueDetail;
  fruiting:       boolean;
  field_manager:  string;
  flagged:        boolean;
}

interface FlaggedVisitsModalProps {
  entries:   FlaggedEntry[];
  onUnflag:  (id: string) => void;
  onClose:   () => void;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
type Severity = 'critical' | 'high' | 'medium' | 'healthy';

const getSeverity = (e: FlaggedEntry): Severity => {
  if (e.disease.present) return 'critical';
  if (e.insects.present) return 'high';
  if (e.weeds.present)   return 'medium';
  return 'healthy';
};

const SEV_CONFIG: Record<Severity, { label: string; dot: string; bar: string; badge: string }> = {
  critical: { label: 'Disease',  dot: 'bg-red-500',    bar: 'bg-red-400',    badge: 'bg-red-100 text-red-700 border-red-200'       },
  high:     { label: 'Insects',  dot: 'bg-orange-500', bar: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium:   { label: 'Weeds',    dot: 'bg-yellow-500', bar: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  healthy:  { label: 'Healthy',  dot: 'bg-emerald-500',bar: 'bg-emerald-400',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

type SortKey = 'date' | 'severity' | 'height';

const SEV_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, healthy: 3 };

// ─────────────────────────────────────────────────────────────
// ISSUE BADGE
// ─────────────────────────────────────────────────────────────
const IssueBadge = ({ issue, label, icon: Icon, colorClass }: {
  issue: IssueDetail; label: string;
  icon: React.ElementType; colorClass: string;
}) => {
  if (!issue.present) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', colorClass)}>
      <Icon className="w-2.5 h-2.5" />
      {label}{issue.type ? `: ${issue.type}` : ''}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function FlaggedVisitsModal({ entries, onUnflag, onClose }: FlaggedVisitsModalProps) {
  const [sort, setSort] = useState<SortKey>('severity');

  const sorted = [...entries].sort((a, b) => {
    if (sort === 'date')     return b.date.localeCompare(a.date);
    if (sort === 'height')   return b.crop_height_cm - a.crop_height_cm;
    return SEV_ORDER[getSeverity(a)] - SEV_ORDER[getSeverity(b)];
  });

  const criticalCount = entries.filter(e => getSeverity(e) === 'critical').length;
  const highCount     = entries.filter(e => getSeverity(e) === 'high').length;
  const mediumCount   = entries.filter(e => getSeverity(e) === 'medium').length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-widest mb-0.5">Attention Required</p>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-rose-500" />
                Flagged Visits
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {entries.length}
                </span>
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Plots marked for immediate attention</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Severity breakdown */}
          {entries.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {[
                { label: 'Disease',  count: criticalCount, cls: 'bg-red-100 text-red-700 border-red-200',       icon: ShieldAlert  },
                { label: 'Insects',  count: highCount,     cls: 'bg-orange-100 text-orange-700 border-orange-200', icon: Bug       },
                { label: 'Weeds',    count: mediumCount,   cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertTriangle },
              ].map(({ label, count, cls, icon: Icon }) => count > 0 && (
                <span key={label} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold', cls)}>
                  <Icon className="w-3 h-3" />
                  {count} {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Sort bar ── */}
        {entries.length > 0 && (
          <div className="px-6 py-2.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2 shrink-0">
            <ArrowUpDown className="w-3 h-3 text-gray-400" />
            <span className="text-[11px] text-gray-400 font-medium mr-1">Sort:</span>
            {(['severity', 'date', 'height'] as SortKey[]).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
                  sort === s
                    ? 'border-gray-800 bg-gray-800 text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                )}
              >
                {s === 'severity' ? 'Severity' : s === 'date' ? 'Latest First' : 'Height'}
              </button>
            ))}
          </div>
        )}

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-300">
              <CheckCircle2 className="w-12 h-12 text-emerald-300" />
              <p className="text-sm text-gray-400 font-medium">No flagged visits — all clear!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sorted.map(entry => {
                const sev = getSeverity(entry);
                const cfg = SEV_CONFIG[sev];
                const issueCount = [entry.disease.present, entry.insects.present, entry.weeds.present].filter(Boolean).length;

                return (
                  <div key={entry.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start gap-3">

                      {/* Severity bar */}
                      <div className={cn('w-1 self-stretch rounded-full shrink-0', cfg.bar)} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[13px] font-bold text-gray-900">{entry.plot_name}</span>
                              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', cfg.badge)}>
                                <div className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                                {cfg.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-2 flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />{entry.farm_name}
                              </span>
                              <span className="text-gray-300">·</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-gray-300">·</span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                <span className="font-mono">{entry.crop_height_cm} cm</span>
                              </span>
                              <span className="text-gray-300">·</span>
                              <span>{entry.field_manager}</span>
                            </div>

                            {/* Issue badges */}
                            <div className="flex flex-wrap gap-1.5">
                              {issueCount === 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> No Issues
                                </span>
                              ) : (
                                <>
                                  <IssueBadge issue={entry.disease} label="Disease" icon={ShieldAlert}   colorClass="bg-red-100 text-red-700 border-red-200" />
                                  <IssueBadge issue={entry.insects} label="Insects" icon={Bug}           colorClass="bg-orange-100 text-orange-700 border-orange-200" />
                                  <IssueBadge issue={entry.weeds}   label="Weeds"   icon={AlertTriangle} colorClass="bg-yellow-100 text-yellow-700 border-yellow-200" />
                                </>
                              )}
                              {entry.fruiting && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-purple-100 text-purple-700 border-purple-200">
                                  <Flower2 className="w-2.5 h-2.5" /> Fruiting
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Unflag button */}
                          <button
                            onClick={() => onUnflag(entry.id)}
                            title="Remove flag"
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 text-[11px] font-semibold hover:bg-rose-100 transition-colors"
                          >
                            <Flag className="w-3 h-3" />
                            Unflag
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-gray-400">
            {entries.length} flagged visit{entries.length !== 1 ? 's' : ''} · API integration coming soon
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
