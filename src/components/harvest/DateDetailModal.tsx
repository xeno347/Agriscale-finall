import React from 'react';
import { Button } from '@/components/ui/button';
import { HarvestPlan } from '@/types/farm';

interface Props {
  open: boolean;
  dateIso: string | null;
  plans: HarvestPlan[];
  onClose: () => void;
  onCreate: () => void;
}

const DateDetailModal: React.FC<Props> = ({ open, dateIso, plans, onClose, onCreate }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-lg shadow-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Plans for {dateIso}</h3>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button onClick={onCreate}>Create Plan</Button>
          </div>
        </div>

        <div className="space-y-3 max-h-72 overflow-auto">
          {plans.length === 0 && <div className="text-sm text-muted-foreground">No plans for this date.</div>}
          {plans.map(p => (
            <div key={p.id} className="p-3 border rounded-md bg-muted/30">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{p.farmerName}</div>
                  <div className="text-xs text-muted-foreground">{p.cropType} • {p.estimatedYield ?? 'N/A'} {p.yieldUnit ?? ''}</div>
                </div>
                <div className="text-xs">
                  <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] bg-primary/10 text-primary">{(p as any).priority ?? p.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DateDetailModal;
