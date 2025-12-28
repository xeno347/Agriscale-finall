import React from 'react';
import { Button } from '@/components/ui/button';
import { HarvestPlan } from '@/types/farm';
import { Calendar, User, MapPin, Package, Tag, Phone, Send, Sprout } from 'lucide-react';

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
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Plans for <span className="text-primary">{dateIso}</span></h3>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={onCreate} className="bg-primary text-white">Create Plan</Button>
          </div>
        </div>

        <div className="space-y-4 max-h-96 overflow-auto">
          {plans.length === 0 && <div className="text-sm text-muted-foreground">No plans for this date.</div>}
          {plans.map(p => (
            <div key={p.id} className="p-4 border rounded-xl bg-gray-50 shadow flex flex-col gap-2">
              <div className="flex items-center gap-3 mb-1">
                <Tag className={`w-4 h-4 ${
                  (p as any).tag === 'critical' ? 'text-red-500' :
                  (p as any).tag === 'high' ? 'text-orange-500' :
                  (p as any).tag === 'moderate' ? 'text-yellow-500' :
                  (p as any).tag === 'low' ? 'text-green-500' :
                  'text-gray-400'
                }`} />
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold mr-2 border ${
                  (p as any).tag === 'critical' ? 'bg-red-100 text-red-700 border-red-300' :
                  (p as any).tag === 'high' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                  (p as any).tag === 'moderate' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                  (p as any).tag === 'low' ? 'bg-green-100 text-green-700 border-green-300' :
                  'bg-gray-100 text-gray-700 border-gray-300'
                }`}>
                  {((p as any).tag || 'No Tag').charAt(0).toUpperCase() + ((p as any).tag || 'No Tag').slice(1)}
                </span>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-primary/10 text-primary font-semibold">{(p as any).priority ?? p.status}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-primary" /><span className="font-semibold">Manager:</span> {(p as any).feild_manager_team?.[0]?.feild_manager_name} <span className="text-xs text-gray-500">({(p as any).feild_manager_team?.[0]?.contact_number})</span></div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /><span className="font-semibold">Contact:</span> {(p as any).feild_manager_team?.[0]?.contact_number}</div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /><span className="font-semibold">Deadline:</span> {p.planningDate}</div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /><span className="font-semibold">Farms:</span> {(p as any).farm?.map((f: any) => `${f.village} (${f.area_in_acres} acres)`).join(', ')}</div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2"><Package className="w-4 h-4 text-primary" /><span className="font-semibold">Equipments:</span> {(p as any).equipments?.map((e: any) => `${e.equipment_name} x${e.quantity}`).join(', ')}</div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2"><Sprout className="w-4 h-4 text-primary" /><span className="font-semibold">Status:</span> {p.status}</div>
                <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /><span className="font-semibold">Notes:</span> {p.notes || 'N/A'}</div>
              </div>
              <div className="flex justify-end mt-2">
                <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 px-5 py-2 rounded-lg font-semibold shadow" onClick={() => alert('Order sent!')}>
                  <Send className="w-4 h-4" /> Send Order
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DateDetailModal;
