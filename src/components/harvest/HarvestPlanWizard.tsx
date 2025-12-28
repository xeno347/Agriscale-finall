import React, { useState, useEffect } from 'react';
import getBaseUrl from '@/lib/config';
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
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productQty, setProductQty] = useState<number>(1);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  // Field managers for step 3
  const [fieldManagers, setFieldManagers] = useState<any[]>([]);
  const [fieldManagersLoading, setFieldManagersLoading] = useState(false);
  const [fieldManagersError, setFieldManagersError] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('low');
  // Inventory products for step 2
  const [inventoryProducts, setInventoryProducts] = useState<string[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // Fetch inventory items when step 2 is entered
  useEffect(() => {
    if (step === 2) {
      setInventoryLoading(true);
      setInventoryError(null);
      fetch(`${getBaseUrl()}/inventory_management/get_inventory_items`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch inventory items');
          return res.json();
        })
        .then(data => {
          const names = (data.inventory_items || []).map((item: any) => item.item);
          setInventoryProducts(names);
          setInventoryLoading(false);
        })
        .catch(err => {
          setInventoryError('Could not load inventory items.');
          setInventoryLoading(false);
        });
    }
  }, [step]);
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedFarms([]);
      setEquipmentCart([]);
      setSelectedTeam(null);
      setPriority('low');
    }
  }, [open]);

  // Fetch field managers when step 3 is entered
  useEffect(() => {
    if (step === 3) {
      setFieldManagersLoading(true);
      setFieldManagersError(null);
      fetch(`${getBaseUrl()}/feild_manager/get_feild_managers`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch field managers');
          return res.json();
        })
        .then(data => {
          setFieldManagers(data.feild_managers || []);
          setFieldManagersLoading(false);
        })
        .catch(err => {
          setFieldManagersError('Could not load field managers.');
          setFieldManagersLoading(false);
        });
    }
  }, [step]);

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

  const finalize = async () => {
    // Prepare farm array
    const farm = selectedFarms.map(f => ({
      farm_id: f.id,
      village: f.village,
      dictrict: f.district || '',
      area_in_acres: f.landMapping?.totalArea || 0,
      farm_type: f.farmType || ''
    }));

    // Prepare equipments array
    const equipments = equipmentCart.map(eq => ({
      equipment_id: eq.id,
      equipment_name: eq.name,
      quantity: eq.qty
    }));

    // Prepare field manager team array
    const selectedManager = fieldManagers.find(fm => fm.id === selectedTeam);
    const feild_manager_team = selectedManager ? [{
      feild_manager_id: selectedManager.id,
      feild_manager_name: selectedManager.name,
      contact_number: selectedManager.phone
    }] : [];

    // Use the plan date as the harvest deadline
    const harvest_deadline = dateIso;

    const payload = {
      farm,
      equipments,
      harvest_deadline,
      feild_manager_team,
      tag: priority
    };

    try {
      const res = await fetch(`${getBaseUrl()}/Harvest_management/save_farm_planer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save plan');
      // Optionally handle response data
      onCreatePlan(payload); // Pass payload or response as needed
      onClose();
    } catch (err) {
      alert('Failed to save plan. Please try again.');
    }
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
            <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
              <h3 className="text-xl font-bold mb-2 text-primary">Step 2: Select Equipment from Inventory</h3>
              <p className="text-gray-600 mb-2">Total Farms: <span className="font-semibold text-primary">{selectedFarms.length}</span> farm{selectedFarms.length !== 1 ? 's' : ''} .</p>
              <div className="mb-4 text-gray-700 text-sm">
                <span className="font-medium">Total Area:</span> <span className="text-primary font-bold">{selectedFarms.reduce((acc, farm) => acc + (farm.landMapping?.totalArea || 0), 0)}</span> acres
              </div>
              {inventoryLoading ? (
                <div className="text-muted-foreground text-center py-8">Loading inventory...</div>
              ) : inventoryError ? (
                <div className="text-red-500 text-center py-8">{inventoryError}</div>
              ) : (
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Product selection */}
                  <div className="flex-1">
                    <div className="mb-2 font-medium text-gray-700">Select Product</div>
                    <select
                      className="input input-bordered rounded px-3 py-2 border w-full mb-4"
                      value={selectedProduct}
                      onChange={e => setSelectedProduct(e.target.value)}
                    >
                      <option value="">-- Choose a product --</option>
                      {inventoryProducts.map((name, idx) => (
                        <option key={idx} value={name}>{name}</option>
                      ))}
                    </select>
                    <div className="mb-2 font-medium text-gray-700">Quantity</div>
                    <input
                      type="number"
                      min={1}
                      className="input input-bordered rounded px-3 py-2 border w-full mb-4"
                      value={productQty}
                      onChange={e => setProductQty(Number(e.target.value))}
                      placeholder="Enter quantity"
                    />
                    <button
                      className="btn bg-primary text-white px-6 py-2 rounded w-full font-semibold shadow hover:bg-primary-dark transition"
                      disabled={!selectedProduct || productQty < 1}
                      onClick={() => {
                        if (!selectedProduct || productQty < 1) return;
                        setEquipmentCart(prev => {
                          const ex = prev.find(p => p.name === selectedProduct);
                          if (ex) return prev.map(p => p.name === selectedProduct ? { ...p, qty: p.qty + productQty } : p);
                          return [...prev, { id: selectedProduct, name: selectedProduct, qty: productQty }];
                        });
                        setSelectedProduct('');
                        setProductQty(1);
                      }}
                    >Add to Cart</button>
                  </div>
                  {/* Cart display */}
                  <div className="flex-1">
                    <div className="mb-2 font-medium text-gray-700">Your Equipment List</div>
                    <div className="bg-gray-50 rounded-lg border p-4">
                      {equipmentCart.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-6">No equipment added yet.</div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 border-b">
                              <th className="py-2">Product</th>
                              <th className="py-2">Quantity</th>
                              <th className="py-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {equipmentCart.map(it => (
                              <tr key={it.id} className="border-b last:border-b-0">
                                <td className="py-2 font-medium">{it.name}</td>
                                <td className="py-2">
                                  <div className="flex items-center gap-2">
                                    <button
                                      className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                                      onClick={() => setEquipmentCart(prev => prev.map(x => x.id === it.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}
                                    >-</button>
                                    <span>{it.qty}</span>
                                    <button
                                      className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                                      onClick={() => setEquipmentCart(prev => prev.map(x => x.id === it.id ? { ...x, qty: x.qty + 1 } : x))}
                                    >+</button>
                                  </div>
                                </td>
                                <td className="py-2">
                                  <button
                                    className="text-red-500 hover:underline text-xs"
                                    onClick={() => setEquipmentCart(prev => prev.filter(x => x.id !== it.id))}
                                  >Remove</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
              <h3 className="text-xl font-bold mb-2 text-primary">Step 3: Select Field Manager Team</h3>
              <p className="text-gray-600 mb-6">Choose a field manager team to supervise the harvest. Each manager's supervisor count is shown for reference.</p>
              {fieldManagersLoading ? (
                <div className="text-muted-foreground text-center py-8">Loading field managers...</div>
              ) : fieldManagersError ? (
                <div className="text-red-500 text-center py-8">{fieldManagersError}</div>
              ) : (
                <div className="flex gap-3 flex-wrap">
                  {fieldManagers.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-6">No field managers found.</div>
                  ) : fieldManagers.map(fm => (
                    <div
                      key={fm.id}
                      className={`p-4 border rounded flex flex-col items-start min-w-[220px] max-w-xs mb-2 cursor-pointer transition ${selectedTeam===fm.id ? 'bg-primary/5 border-primary shadow' : 'bg-white border-gray-200'}`}
                      onClick={() => setSelectedTeam(fm.id)}
                    >
                      <div className="font-semibold text-lg mb-1 text-primary">{fm.name}</div>
                      <div className="text-xs text-gray-600 mb-1">Zone: {fm.zone}</div>
                      <div className="text-xs text-gray-700 mb-2">Supervisors: <span className="font-bold text-green-700">{fm.supervisor_count}</span></div>
                      <div className="text-xs text-gray-500">{fm.email} | {fm.phone}</div>
                      <div className="mt-2">
                        <button className={`btn px-4 py-1 rounded ${selectedTeam===fm.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}>{selectedTeam===fm.id ? 'Selected' : 'Select'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="w-48 border p-2 rounded mt-6">
                <div className="text-xs font-medium mb-2">Priority</div>
                <select value={priority} onChange={e=> setPriority(e.target.value as Priority)} className="w-full p-1 border rounded">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="moderate">Moderate</option>
                  <option value="low">Low</option>
                </select>
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
