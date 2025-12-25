import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Farmer, HarvestPlan } from '@/types/farm';

interface Props {
  open: boolean;
  dateIso: string;
  farmers: Farmer[];
  onClose: () => void;
  onCreatePlan: (plan: HarvestPlan) => void;
}

type Priority = 'critical'|'high'|'moderate'|'low';

const sampleEquipment = [
  { id: 'eq-1', name: 'Tractor', unitPrice: 1200 },
  { id: 'eq-2', name: 'Combine', unitPrice: 2500 },
  { id: 'eq-3', name: 'Trailer', unitPrice: 300 },
];

const sampleTeams = [
  { id: 'team-1', name: 'Team A', size: 8 },
  { id: 'team-2', name: 'Team B', size: 12 },
  { id: 'team-3', name: 'Team C', size: 5 },
];

const HarvestPlanWizard: React.FC<Props> = ({ open, dateIso, farmers, onClose, onCreatePlan }) => {
  const [step, setStep] = useState(1);
  const [selectedFarms, setSelectedFarms] = useState<Farmer[]>([]);
  const [equipmentCart, setEquipmentCart] = useState<{ id:string; name:string; qty:number }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('low');

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedFarms([]);
      setEquipmentCart([]);
      setSelectedTeam(null);
      setPriority('low');
    }
  }, [open]);

  const toggleFarm = (f: Farmer) => {
    setSelectedFarms(prev => prev.find(p => p.id === f.id) ? prev.filter(p=>p.id!==f.id) : [...prev, f]);
  };

  const addEquipment = (e:any) => {
    setEquipmentCart(prev => {
      const ex = prev.find(p=>p.id===e.id);
      if (ex) return prev.map(p=> p.id===e.id ? {...p, qty: p.qty+1} : p);
      return [...prev, { id: e.id, name: e.name, qty: 1}];
    });
  };

  const finalize = () => {
    const plan: HarvestPlan = {
      id: 'local-' + Date.now(),
      farmerId: selectedFarms[0]?.id ?? '',
      farmerName: selectedFarms.map(f=>f.fullName).join(', ') || 'Mixed',
      cropType: 'Mixed Crops',
      planningDate: dateIso,
      expectedHarvestDate: '', estimatedYield: 0, yieldUnit: 'kg',
      notes: '',
      status: 'planned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority,
    } as any;
    onCreatePlan(plan);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Create Harvest Plan</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1">
              <div className={`w-full h-10 rounded-lg flex items-center justify-center text-sm font-medium ${step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                Step {s}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {step === 1 && (
            <div>
              <div className="text-sm mb-2">Select farms (filter by area / days after ploughing - dummy):</div>
              <div className="grid grid-cols-2 gap-3 max-h-56 overflow-auto">
                {farmers.map(f => (
                  <div key={f.id} className={`p-3 border rounded ${selectedFarms.find(s=>s.id===f.id) ? 'bg-primary/5 border-primary' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{f.fullName}</div>
                        <div className="text-xs text-muted-foreground">{f.village} • {f.landMapping?.totalArea ?? 'N/A'} acres</div>
                      </div>
                      <div>
                        <input type="checkbox" checked={!!selectedFarms.find(s=>s.id===f.id)} onChange={()=>toggleFarm(f)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="text-sm mb-2">Choose equipment (dummy list):</div>
              <div className="flex gap-4">
                <div className="flex-1 max-h-48 overflow-auto space-y-2">
                  {sampleEquipment.map(eq => (
                    <div key={eq.id} className="p-2 border rounded flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{eq.name}</div>
                        <div className="text-xs text-muted-foreground">₹{eq.unitPrice}</div>
                      </div>
                      <div>
                        <button className="btn" onClick={()=>addEquipment(eq)}>Add</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="w-40 border p-2 rounded">
                  <div className="text-xs font-medium mb-2">Cart</div>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {equipmentCart.length === 0 && <div className="text-xs text-muted-foreground">No equipment</div>}
                    {equipmentCart.map(it => (
                      <div key={it.id} className="flex justify-between items-center text-sm">
                        <div>{it.name}</div>
                        <div className="flex items-center gap-2">
                          <button onClick={()=> setEquipmentCart(prev=> prev.map(x=> x.id===it.id ? {...x, qty: Math.max(0,x.qty-1)} : x)) }>-</button>
                          <div>{it.qty}</div>
                          <button onClick={()=> setEquipmentCart(prev=> prev.map(x=> x.id===it.id ? {...x, qty: x.qty+1} : x)) }>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="text-sm mb-2">Select field manager team (filter by size - dummy):</div>
              <div className="flex gap-3">
                <div className="flex-1 max-h-48 overflow-auto space-y-2">
                  {sampleTeams.map(t => (
                    <div key={t.id} className={`p-2 border rounded flex justify-between items-center ${selectedTeam===t.id ? 'bg-primary/5 border-primary' : ''}`}>
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.size} people</div>
                      </div>
                      <div>
                        <button onClick={()=> setSelectedTeam(t.id)} className="btn">{selectedTeam===t.id ? 'Selected' : 'Select'}</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="w-48 border p-2 rounded">
                  <div className="text-xs font-medium mb-2">Priority</div>
                  <select value={priority} onChange={e=> setPriority(e.target.value as Priority)} className="w-full p-1 border rounded">
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="moderate">Moderate</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Step navigation buttons */}
        <div className="flex justify-between gap-2 pt-4 border-t mt-6">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : <span />}
          {step < 3 ? (
            <Button type="button" onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={finalize}>
              Save Plan
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HarvestPlanWizard;
