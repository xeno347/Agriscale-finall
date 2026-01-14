import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RentalField = {
  block_id: string;
  farm_id: string;
  activity: string;
  dates: string[];
};

export type RentalService = {
  id: string;
  name: string;
  fields: RentalField[];
};

type Props = {
  rentals: RentalService[];
  onPlugRentalPlan: (rental: RentalService) => void;
};

export default function AddRentalPlugin({ rentals, onPlugRentalPlan }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRentalId, setSelectedRentalId] = useState('');

  const selectedRental = useMemo(
    () => rentals.find((r) => r.id === selectedRentalId) || null,
    [rentals, selectedRentalId]
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm hover:shadow-md whitespace-nowrap"
      >
        <Plus className="w-5 h-5" /> + Add Rental
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <div>
                <div className="font-bold text-lg">Add Rental Plugin</div>
                <div className="text-xs text-white/70">Select a rental service, then plug the rental plan.</div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="bg-white/10 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Close rental plugin"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Rental Service</label>
                <select
                  value={selectedRentalId}
                  onChange={(e) => setSelectedRentalId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none bg-white"
                >
                  <option value="">Select service…</option>
                  {rentals.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRental && (
                <div className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{selectedRental.name}</div>
                    <div className="text-xs text-slate-500">
                      Fields: <span className="font-bold text-slate-900">{selectedRental.fields.length}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onPlugRentalPlan(selectedRental);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap',
                      'bg-slate-900 hover:bg-slate-800 text-white'
                    )}
                  >
                    Plug Rental Plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
