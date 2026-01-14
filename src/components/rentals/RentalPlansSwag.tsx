import { useMemo, useState } from 'react';
import { Eye, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RentalService } from './AddRentalPlugin';

type Props = {
  rentals: RentalService[];
  onBlinkDates: (dates: string[]) => void;
  className?: string;
};

const uniq = (items: string[]) => Array.from(new Set(items));

export default function RentalPlansSwag({ rentals, onBlinkDates, className }: Props) {
  const [expandedRentalId, setExpandedRentalId] = useState<string | null>(null);

  const rentalsWithDates = useMemo(() => {
    return rentals.map((r) => {
      const allDates = uniq(r.fields.flatMap((f) => f.dates)).sort();
      return { rental: r, allDates };
    });
  }, [rentals]);

  if (rentals.length === 0) return null;

  const expandedRental = expandedRentalId ? rentals.find((r) => r.id === expandedRentalId) || null : null;

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      <div className="flex items-stretch gap-2 overflow-x-auto max-w-full pb-1">
        {rentalsWithDates.map(({ rental, allDates }) => {
          return (
            <div key={rental.id} className="relative shrink-0">
              <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm w-60">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{rental.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {rental.fields.length} field{rental.fields.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setExpandedRentalId(rental.id)}
                      className={cn(
                        'p-2 rounded-lg transition-colors border bg-white hover:bg-gray-100 text-slate-700 border-gray-200'
                      )}
                      aria-label="View rental fields"
                      title="View"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onBlinkDates(allDates)}
                      className="p-2 rounded-lg border bg-white hover:bg-gray-100 transition-colors border-gray-200 text-slate-700"
                      aria-label="Blink rental dates"
                      title="Blink dates"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {expandedRental && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setExpandedRentalId(null);
          }}
        >
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="bg-white p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5 text-slate-700" />
                  <h3 className="font-bold text-xl text-slate-900">{expandedRental.name}</h3>
                </div>
                <p className="text-sm text-slate-500">Rental fields</p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedRentalId(null)}
                className="text-gray-400 hover:text-slate-900 p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close rental details"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {expandedRental.fields.map((f, idx) => {
                const fieldDates = uniq(f.dates).sort();
                return (
                  <div
                    key={`${expandedRental.id}__${f.block_id}__${f.farm_id}__${idx}`}
                    className="border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          Block {f.block_id} • Farm {f.farm_id}
                        </div>
                        <div className="text-sm text-slate-500">{f.activity}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onBlinkDates(fieldDates)}
                        className="p-2 rounded-lg border bg-white hover:bg-gray-100 transition-colors border-gray-200 text-slate-700"
                        aria-label="Blink this field's dates"
                        title="Blink"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {fieldDates.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-white text-slate-700 border-gray-200"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
