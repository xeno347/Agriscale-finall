import React from 'react';
import { HarvestPlan } from '@/types/farm';

interface Props {
  plans: HarvestPlan[];
  onDateClick: (dateIso: string, plansForDate: HarvestPlan[]) => void;
  year?: number;
  month?: number; // 0-11
}

const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const HarvestCalendar: React.FC<Props> = ({ plans, onDateClick, year, month }) => {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();

  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const daysInMonth = last.getDate();
  const startOffset = first.getDay();

  const grid: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);

  const plansByDate = (d: number) => {
    const iso = new Date(y, m, d).toISOString().slice(0,10);
    return plans.filter(p => {
      if (!p.planningDate) return false;
      return p.planningDate.slice(0,10) === iso;
    });
  };

  return (
    <div className="bg-card rounded-lg p-4">
      <div className="text-sm text-muted-foreground mb-2">Click a date to view / create plans</div>
      <div className="grid grid-cols-7 gap-2 text-xs">
        {weekDays.map(w => <div key={w} className="text-center font-medium">{w}</div>)}
        {grid.map((d, i) => {
          if (d === null) return <div key={i} className="h-20 rounded border border-border bg-muted" />;
          const dayPlans = plansByDate(d);
          const counts = dayPlans.reduce((acc:any, p) => {
            const pr = (p as any).priority ?? (p.status ?? 'low');
            acc[pr] = (acc[pr] || 0) + 1; return acc;
          }, {});
          return (
            <button
              key={i}
              onClick={() => onDateClick(new Date(y,m,d).toISOString().slice(0,10), dayPlans)}
              className="h-20 p-2 rounded border border-border text-left hover:shadow-sm bg-white flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium">{d}</span>
              </div>
              <div className="flex flex-col gap-1">
                {Object.entries(counts).slice(0,3).map(([prio, c]) => (
                  <span key={prio} className="text-[11px] inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {c} {prio}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HarvestCalendar;
