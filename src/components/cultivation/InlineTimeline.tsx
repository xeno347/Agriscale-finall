import { Eye, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type CalendarActivityLike = {
  activity: string;
  assignments?: Array<{
    assigned_area?: number;
    status?: string;
  }>;
};

export type CalendarDataLike = Record<string, CalendarActivityLike[]>;

const formatDateKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const normalizeStatus = (raw?: string) => {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'unassigned';
  if (s === 'unaasigned') return 'unassigned';
  return s;
};

export function InlineTimeline({
  activities,
  onViewDetail,
  monthDate,
  onClose,
}: {
  activities: CalendarDataLike;
  onViewDetail?: (week: { start: string; end: string }) => void;
  monthDate?: Date;
  onClose?: () => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const base = monthDate ? new Date(monthDate) : today;
  base.setHours(0, 0, 0, 0);

  const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  monthEnd.setHours(0, 0, 0, 0);

  const startOfFirstWeek = new Date(monthStart);
  startOfFirstWeek.setDate(monthStart.getDate() - monthStart.getDay());

  const weeks = Array.from({ length: 5 })
    .map((_, i) => {
      const start = new Date(startOfFirstWeek);
      start.setDate(startOfFirstWeek.getDate() + i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(0, 0, 0, 0);

      const intersectsMonth = end.getTime() >= monthStart.getTime() && start.getTime() <= monthEnd.getTime();
      if (!intersectsMonth) return null;

      const weekStats = Array.from({ length: 7 }).reduce<{
        visitCount: number;
        totalVisitAcres: number;
        doneVisitAcres: number;
        overdueVisitAcres: number;
      }>((acc, __, dayOffset) => {
        const d = new Date(start);
        d.setDate(start.getDate() + dayOffset);
        const k = formatDateKey(d);
        const dayActs = activities[k] || [];

        const visitActs = dayActs.filter((a) => String(a?.activity || '').toLowerCase().includes('visit'));
        acc.visitCount += visitActs.length;

        for (const act of visitActs) {
          const assignments = Array.isArray(act.assignments) ? act.assignments : [];
          for (const asg of assignments) {
            const acres = Number(asg?.assigned_area) || 0;
            acc.totalVisitAcres += acres;
            const st = normalizeStatus(asg?.status);
            if (st === 'completed') acc.doneVisitAcres += acres;
            if (st === 'overdue') acc.overdueVisitAcres += acres;
          }
        }

        return acc;
      }, {
        visitCount: 0,
        totalVisitAcres: 0,
        doneVisitAcres: 0,
        overdueVisitAcres: 0,
      });

      const isCurrentWeek = today.getTime() >= start.getTime() && today.getTime() <= end.getTime();
      const isPastWeek = end.getTime() < today.getTime();
      const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

      return {
        key: formatDateKey(start),
        start,
        end,
        startKey: formatDateKey(start),
        endKey: formatDateKey(end),
        label,
        visitCount: weekStats.visitCount,
        totalVisitAcres: weekStats.totalVisitAcres,
        doneVisitAcres: weekStats.doneVisitAcres,
        overdueVisitAcres: weekStats.overdueVisitAcres,
        isCurrentWeek,
        isPastWeek,
      };
    })
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <div className="bg-white border border-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold">Weeks</div>
          <div className="text-xs text-muted-foreground">
            {base.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} • showing up to 5 weeks
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="p-2 rounded-md border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {weeks.map((w, idx) => (
          <div
            key={w.key}
            className={cn(
              'border rounded-lg p-3 bg-white shadow-sm',
              w.isCurrentWeek ? 'border-green-200 bg-green-50' : 'border-border'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground">Week {idx + 1}</div>
                <div className="text-[11px] text-muted-foreground truncate">{w.label}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="View detail"
                  aria-label="View detail"
                  onClick={() => onViewDetail?.({ start: w.startKey, end: w.endKey })}
                  className="p-1.5 rounded-md border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {w.isCurrentWeek && (
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200 bg-white text-green-700">
                    Current
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Visits</div>
                <div className="text-sm font-semibold text-foreground">{w.visitCount}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Total acres</div>
                <div className="text-sm font-semibold text-foreground">{w.totalVisitAcres.toFixed(2)}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Done acres</div>
                <div className="text-sm font-semibold text-foreground">{w.doneVisitAcres.toFixed(2)}</div>
              </div>
              {w.isPastWeek && (
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Overdue acres</div>
                  <div className="text-sm font-semibold text-foreground">{w.overdueVisitAcres.toFixed(2)}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
