import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRight, ArrowLeft, Trash2, Plus } from 'lucide-react';
import { Farmer, HarvestPlan } from '@/types/farm';
import { useToast } from '@/hooks/use-toast';
import getBaseUrl from '@/lib/config';

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

interface CartItem extends EquipmentItem {
  cartQuantity: number;
}

interface AddHarvestPlanModalProps {
  open: boolean;
  onClose: () => void;
  farmers: Farmer[];
  onPlanCreated: (plan: HarvestPlan) => void;
}

const AddHarvestPlanModal = ({ open, onClose, farmers, onPlanCreated }: AddHarvestPlanModalProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const { toast } = useToast();

  // Step 1 - Timeline
  const [timeline, setTimeline] = useState({
    harvestDeadline: '',
    duration: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // Step 3 - Human Resources
  const [humanResources, setHumanResources] = useState({
    laborers: 0,
  });

  const loadEquipmentList = async () => {
    setEquipmentLoading(true);
    try {
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/harvest/get_equipment_list`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      const result = await resp.json();
      const items = (result.equipment || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        unitPrice: item.unit_price || 0,
        quantity: item.quantity || 0,
      }));
      setEquipmentList(items);
    } catch (error) {
      console.error('Failed to load equipment:', error);
      // Mock data for now
      setEquipmentList([
        { id: '1', name: 'Harvester Machine', category: 'Machinery', unitPrice: 50000, quantity: 1 },
        { id: '2', name: 'Tractor', category: 'Machinery', unitPrice: 100000, quantity: 1 },
        { id: '3', name: 'Thresher', category: 'Machinery', unitPrice: 30000, quantity: 1 },
        { id: '4', name: 'Combines', category: 'Machinery', unitPrice: 150000, quantity: 1 },
        { id: '5', name: 'Hand Sickle', category: 'Hand Tools', unitPrice: 500, quantity: 50 },
        { id: '6', name: 'Ropes', category: 'Materials', unitPrice: 100, quantity: 100 },
        { id: '7', name: 'Bags', category: 'Materials', unitPrice: 50, quantity: 500 },
        { id: '8', name: 'Protective Gear', category: 'Safety', unitPrice: 1000, quantity: 100 },
      ]);
    } finally {
      setEquipmentLoading(false);
    }
  };

  useEffect(() => {
    if (open && step === 2) {
      loadEquipmentList();
    }
  }, [step, open]);

  const isStep1Valid = () => {
    return selectedFarmer && timeline.harvestDeadline && timeline.duration && timeline.priority;
  };

  const isStep2Valid = () => {
    return cart.length > 0;
  };

  const isStep3Valid = () => {
    return humanResources.laborers > 0;
  };

  const handleAddToCart = (equipment: EquipmentItem) => {
    const existing = cart.find(item => item.id === equipment.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === equipment.id
          ? { ...item, cartQuantity: item.cartQuantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...equipment, cartQuantity: 1 }]);
    }
    toast({
      title: 'Added to cart',
      description: `${equipment.name} added to cart`,
    });
  };

  const handleUpdateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      setCart(cart.map(item =>
        item.id === id ? { ...item, cartQuantity: quantity } : item
      ));
    }
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleCreatePlan = async () => {
    if (!selectedFarmer) return;

    setLoading(true);
    try {
      const base = getBaseUrl();
      
      const payload = {
        farmer_id: selectedFarmer.id,
        farmer_name: selectedFarmer.fullName,
        crop_type: 'Mixed Crops', // Default, can be enhanced
        harvest_deadline: timeline.harvestDeadline,
        duration_days: parseInt(timeline.duration),
        priority: timeline.priority,
        equipment: cart.map(item => ({
          equipment_id: item.id,
          quantity: item.cartQuantity,
        })),
        laborers: humanResources.laborers,
      };

      const resp = await fetch(`${base.replace(/\/$/, '')}/harvest/create_plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      const result = await resp.json();

      if (result.success || result.plan) {
        const newPlan: HarvestPlan = {
          id: result.plan?.id || Date.now().toString(),
          farmerId: selectedFarmer.id,
          farmerName: selectedFarmer.fullName,
          cropType: 'Mixed Crops',
          planningDate: new Date(),
          expectedHarvestDate: timeline.harvestDeadline,
          estimatedYield: 0,
          yieldUnit: 'kg',
          status: 'planned',
          createdAt: new Date(),
        };

        onPlanCreated(newPlan);
        toast({
          title: 'Success',
          description: 'Harvest plan created successfully',
        });
        onClose();
      } else {
        throw new Error('Failed to create plan');
      }
    } catch (error) {
      console.error('Plan creation error:', error);
      toast({
        title: 'Error',
        description: `Failed to create plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-5">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-display">Create Harvest Plan</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className={`h-1 w-8 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1: Timeline */}
        {step === 1 && (
          <div className="space-y-3 py-2">
            <div>
              <h3 className="text-base font-semibold mb-2">Step 1: Timeline</h3>
              
              <div className="space-y-2 mb-3 p-3 bg-secondary/50 rounded-lg">
                <h4 className="text-sm font-medium">Farmer Information</h4>
                {selectedFarmer ? (
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">Name:</span> {selectedFarmer.fullName}</p>
                    <p><span className="text-muted-foreground">Contact:</span> {selectedFarmer.phoneNumber}</p>
                    <p><span className="text-muted-foreground">Location:</span> {selectedFarmer.village}, {selectedFarmer.district}</p>
                    <p><span className="text-muted-foreground">Plot Size:</span> {selectedFarmer.landMapping?.totalArea || 'N/A'} acres</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">Select a farmer first</p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="farmer">Select Farmer *</Label>
                  <select
                    id="farmer"
                    required
                    value={selectedFarmer?.id || ''}
                    onChange={e => {
                      const farmer = farmers.find(f => f.id === e.target.value);
                      setSelectedFarmer(farmer || null);
                    }}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  >
                    <option value="">Choose a farmer...</option>
                    {farmers.map(farmer => (
                      <option key={farmer.id} value={farmer.id}>
                        {farmer.fullName} - {farmer.village}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="deadline">Harvest Deadline *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={timeline.harvestDeadline}
                    onChange={e => setTimeline({ ...timeline, harvestDeadline: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration (days) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={timeline.duration}
                    onChange={e => setTimeline({ ...timeline, duration: e.target.value })}
                    placeholder="e.g., 7"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority *</Label>
                  <select
                    id="priority"
                    value={timeline.priority}
                    onChange={e => setTimeline({ ...timeline, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose} size="sm">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid()}
                className="gap-2"
                size="sm"
              >
                Next: Resources
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Equipment Resources */}
        {step === 2 && (
          <div className="space-y-3 py-2">
            <h3 className="text-base font-semibold">Step 2: Equipment Resources</h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Equipment List */}
              <div>
                <h4 className="text-sm font-medium mb-2">Available Equipment</h4>
                {equipmentLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <div className="border border-input rounded-lg p-2 space-y-1 max-h-60 overflow-y-auto">
                    {equipmentList.map(equipment => (
                      <div
                        key={equipment.id}
                        className="flex items-center justify-between p-1.5 bg-secondary/50 rounded hover:bg-secondary transition"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{equipment.name}</p>
                          <p className="text-xs text-muted-foreground">{equipment.category} • ₹{equipment.unitPrice}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddToCart(equipment)}
                          className="ml-1 h-7 w-7"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart */}
              <div>
                <h4 className="text-sm font-medium mb-2">Cart ({cart.length} items)</h4>
                <div className="border border-input rounded-lg p-2 space-y-1 max-h-60 overflow-y-auto">
                  {cart.length > 0 ? (
                    cart.map(item => (
                      <div key={item.id} className="p-1.5 bg-secondary/50 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium truncate flex-1">{item.name}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="h-5 w-5"
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Qty:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.cartQuantity}
                            onChange={e =>
                              handleUpdateCartQuantity(item.id, parseInt(e.target.value) || 0)
                            }
                            className="w-12 h-6 text-xs"
                          />
                          <p className="text-xs text-muted-foreground">
                            ₹{(item.unitPrice * item.cartQuantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Cart is empty. Add items to continue.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-2"
                size="sm"
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(3)}
                disabled={!isStep2Valid()}
                className="gap-2"
                size="sm"
              >
                Next: Resources
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Human Resources */}
        {step === 3 && (
          <div className="space-y-3 py-2">
            <h3 className="text-base font-semibold">Step 3: Human Resources</h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Map and Land Info */}
              <div>
                <h4 className="text-sm font-medium mb-2">Land Information</h4>
                <div className="border border-input rounded-lg p-3 space-y-2">
                  {selectedFarmer?.landMapping ? (
                    <>
                      <div className="bg-muted rounded p-2 aspect-video flex items-center justify-center">
                        {selectedFarmer.landMapping.satelliteImageUrl ? (
                          <img
                            src={selectedFarmer.landMapping.satelliteImageUrl}
                            alt="Land mapping"
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="text-muted-foreground text-xs">Map preview</div>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <p><span className="text-muted-foreground">Area:</span> {selectedFarmer.landMapping.totalArea} acres</p>
                        <p><span className="text-muted-foreground">Soil:</span> {selectedFarmer.landMapping.soilType || 'N/A'}</p>
                        <p><span className="text-muted-foreground">Irrigation:</span> {selectedFarmer.landMapping.irrigationType || 'N/A'}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-xs text-center py-6">
                      No land mapping available
                    </p>
                  )}
                </div>
              </div>

              {/* Human Resources Input */}
              <div>
                <h4 className="text-sm font-medium mb-2">Required Labor</h4>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="laborers" className="text-xs">Number of Laborers *</Label>
                    <Input
                      id="laborers"
                      type="number"
                      min="1"
                      value={humanResources.laborers}
                      onChange={e =>
                        setHumanResources({
                          ...humanResources,
                          laborers: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="e.g., 10"
                      required
                      className="h-8 text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Based on {selectedFarmer?.landMapping?.totalArea} acres
                    </p>
                  </div>

                  <div className="p-2 bg-secondary/50 rounded space-y-1">
                    <h5 className="text-xs font-medium">Summary</h5>
                    <div className="text-xs space-y-0.5">
                      <p><span className="text-muted-foreground">Farmer:</span> {selectedFarmer?.fullName}</p>
                      <p><span className="text-muted-foreground">Deadline:</span> {timeline.harvestDeadline}</p>
                      <p><span className="text-muted-foreground">Equipment:</span> {cart.length} items</p>
                      <p><span className="text-muted-foreground">Laborers:</span> {humanResources.laborers} people</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="gap-2"
                size="sm"
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleCreatePlan}
                disabled={!isStep3Valid() || loading}
                className="gap-2"
                size="sm"
              >
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                Execute Plan
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddHarvestPlanModal;
