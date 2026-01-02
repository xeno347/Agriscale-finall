import { useEffect, useState } from 'react';
import { Plus, Trash2, Map, CheckCircle, Clock, ArrowUp, ArrowDown, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Farmer } from '@/types/farm';
import getBaseUrl from '@/lib/config';
import { useToast } from '@/hooks/use-toast';

interface LandRow {
  id: number;
  village: string;
  farmerId: string;
  fetchedDetails: string | null;
}

interface Block {
  block_id: string;
  block_name?: string;
  total_area?: number;
}

const Blocks = () => {
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<Block[]>([]);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [landRows, setLandRows] = useState<LandRow[]>([
    { id: 1, village: '', farmerId: '', fetchedDetails: null }
  ]);

  const [viewBlock, setViewBlock] = useState<Block | null>(null);
  const [isViewBlockModalOpen, setIsViewBlockModalOpen] = useState(false);

  const [availableFarms, setAvailableFarms] = useState<Farmer[]>([]);
  const [loadingFarmsForBlock, setLoadingFarmsForBlock] = useState(false);

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    try {
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/get_blocks`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const result = await resp.json();
      setBlocks(result.blocks || []);
    } catch (error) {
      console.error('Failed to load blocks:', error);
      toast({ title: 'Error', description: 'Failed to load blocks', variant: 'destructive' });
    }
  };

  const addLandRow = () => {
    setLandRows([
      ...landRows,
      { id: Date.now(), village: '', farmerId: '', fetchedDetails: null }
    ]);
  };

  const removeLandRow = (id: number) => {
    setLandRows(landRows.filter(row => row.id !== id));
  };

  const moveLandRow = (id: number, direction: 'up' | 'down') => {
    setLandRows(prev => {
      const index = prev.findIndex(r => r.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleLandChange = (id: number, field: keyof LandRow, value: string) => {
    setLandRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        if (field === 'farmerId') {
          const selectedFarmer = availableFarms.find(f => f.id.toString() === value);
          if (selectedFarmer) {
            const area = selectedFarmer.landMapping?.totalArea || '0';
            updatedRow.fetchedDetails = `${area} Acres in ${selectedFarmer.village}`;
            updatedRow.village = selectedFarmer.village || '';
          } else {
            updatedRow.fetchedDetails = null;
            updatedRow.village = '';
          }
        }
        return updatedRow;
      }
      return row;
    }));
  };

  const handleCreateBlock = async () => {
    const farmerArr = landRows
      .filter(row => !!row.farmerId)
      .map((row, idx) => {
        let area = 0;
        if (row.fetchedDetails) {
          const match = row.fetchedDetails.match(/^(\d+(?:\.\d+)?) Acres/);
          if (match) area = parseFloat(match[1]);
        }
        return {
          farmer_id: row.farmerId,
          village: row.village,
          area,
          priority: idx
        };
      });

    const total = farmerArr.reduce((acc, f) => acc + (f.area || 0), 0);
    const base = getBaseUrl();

    try {
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/create_block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_name: blockName,
          farmer: farmerArr,
          total_area: total
        })
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      toast({ title: 'Success', description: 'Block created successfully!' });
      setIsBlockModalOpen(false);

      setBlockName('');
      setLandRows([{ id: 1, village: '', farmerId: '', fetchedDetails: null }]);

      await loadBlocks();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create block', variant: 'destructive' });
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Blocks</h1>
          <p className="text-muted-foreground mt-1">Create and manage land blocks</p>
        </div>
      </div>

      {/* Block Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Blocks', value: '12', icon: Map, color: 'text-blue-600' },
          { label: 'Pending Approval', value: '4', icon: Clock, color: 'text-orange-500' },
          { label: 'Active Blocks', value: '8', icon: CheckCircle, color: 'text-green-600' },
          { label: 'Total Block Area', value: '450 acres', icon: null, color: 'text-purple-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-5 shadow-card border border-border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              {stat.icon && <stat.icon className={`w-4 h-4 ${stat.color}`} />}
            </div>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Header & Action */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Block Management</h2>

        <Dialog
          open={isBlockModalOpen}
          onOpenChange={(open) => {
            setIsBlockModalOpen(open);
            if (open) {
              setLoadingFarmsForBlock(true);
              const base = getBaseUrl();
              fetch(`${base.replace(/\/$/, '')}/farmer_managment/farm_for_block`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
              })
                .then(async resp => {
                  if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
                  const result = await resp.json();
                  const transformed: Farmer[] = (result.farmers || []).map((item: any) => {
                    const fd = item.farmer_data || {};
                    const kyc = item.kyc_data || null;
                    return {
                      id: item.farmer_id,
                      fullName: fd.full_name || 'Unknown',
                      phoneNumber: fd.phone_number || 'N/A',
                      alternatePhone: fd.alternate_phone_number ?? null,
                      village: fd.village || 'N/A',
                      taluka: fd.taluka ?? null,
                      district: fd.district || 'N/A',
                      state: fd.state || 'N/A',
                      profileImageUrl: undefined,
                      kyc: kyc ? { verified: true } : undefined,
                      landMapping: fd.estimated_land_area != null
                        ? { totalArea: fd.estimated_land_area, coordinates: fd.land_coordinates || [] }
                        : undefined,
                      agreements: item.agreement_data || [],
                      createdAt: item.created_at ? new Date(item.created_at) : new Date(),
                    } as Farmer;
                  });
                  setAvailableFarms(transformed);
                })
                .catch(() => {
                  setAvailableFarms([]);
                  toast({ title: 'Error', description: 'Failed to load available farms', variant: 'destructive' });
                })
                .finally(() => setLoadingFarmsForBlock(false));
            } else {
              setAvailableFarms([]);
              setBlockName('');
              setLandRows([{ id: 1, village: '', farmerId: '', fetchedDetails: null }]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 bg-green-700 hover:bg-green-800">
              <Plus className="w-4 h-4" /> Create Block
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Create New Block</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Block Name Input */}
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Block Name</label>
                  <Input
                    placeholder="e.g. North Sector Alpha"
                    value={blockName}
                    onChange={(e) => setBlockName(e.target.value)}
                  />
                </div>
                <div className="mb-1">
                  <div className="bg-muted/50 border border-border rounded-lg px-6 py-3 flex flex-col items-center min-w-[120px]">
                    <span className="text-xs text-muted-foreground mb-1">Total Area</span>
                    <span className="text-xl font-bold">
                      {(() => {
                        let total = 0;
                        landRows.forEach(row => {
                          if (row.fetchedDetails) {
                            const match = row.fetchedDetails.match(/^(\d+(?:\.\d+)?) Acres/);
                            if (match) total += parseFloat(match[1]);
                          }
                        });
                        return total;
                      })()} acres
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Land Repeater */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Add Land</h3>
                  <Button
                    onClick={addLandRow}
                    size="sm"
                    variant="outline"
                    className="gap-2 text-green-700 border-green-700 hover:bg-green-50"
                  >
                    <Plus className="w-4 h-4" /> Add Row
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden bg-white/50">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
                    <div className="col-span-1 text-center">S.No</div>
                    <div className="col-span-1 text-center">Priority</div>
                    <div className="col-span-4">Farmer Name</div>
                    <div className="col-span-3">Fetched Details</div>
                    <div className="col-span-3">Village</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y">
                    {landRows.map((row, index) => (
                      <div key={row.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/20 transition-colors">
                        <div className="col-span-1 text-center text-muted-foreground">{index + 1}</div>

                        <div className="col-span-1 flex items-center justify-center gap-1">
                          <div className="min-w-[28px] h-7 px-2 rounded-md border border-border bg-muted/30 text-xs font-semibold text-muted-foreground flex items-center justify-center">
                            {index}
                          </div>
                          <div className="flex flex-col">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={index === 0}
                              onClick={() => moveLandRow(row.id, 'up')}
                              aria-label="Move up"
                              title="Move up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={index === landRows.length - 1}
                              onClick={() => moveLandRow(row.id, 'down')}
                              aria-label="Move down"
                              title="Move down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="col-span-4">
                          {loadingFarmsForBlock ? (
                            <div className="text-xs text-muted-foreground italic px-2">Loading farmers...</div>
                          ) : (
                            <select
                              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              value={row.farmerId}
                              onChange={(e) => handleLandChange(row.id, 'farmerId', e.target.value)}
                            >
                              <option value="">Select Farmer</option>
                              {availableFarms.map(f => (
                                <option key={f.id} value={f.id}>{f.fullName}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="col-span-3">
                          {row.fetchedDetails ? (
                            <div className="text-sm px-3 py-2 bg-blue-50 text-blue-700 rounded-md border border-blue-100 flex items-center gap-2">
                              <Map className="w-3 h-3" />
                              <span className="truncate">{row.fetchedDetails}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic px-2">Select farmer to fetch</span>
                          )}
                        </div>

                        <div className="col-span-3">
                          <div className="h-9 flex items-center px-3 bg-muted/30 rounded border border-input text-sm text-muted-foreground">
                            {row.village || <span className="italic text-xs">Select farmer</span>}
                          </div>
                        </div>

                        <div className="col-span-1 flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeLandRow(row.id)}
                            aria-label="Delete row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {landRows.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    No lands added yet. Click "Add Row" to start.
                  </div>
                )}
              </div>

              {/* Auto Priority */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  className="gap-2 text-blue-700 border-blue-700 hover:bg-blue-50 rounded-full shadow-md"
                  title="Auto Priority"
                  disabled={landRows.length === 0 || landRows.every(row => !row.farmerId)}
                  onClick={() => {
                    setLandRows(prev => {
                      const sorted = [...prev].sort((a, b) => {
                        const areaA = parseFloat(a.fetchedDetails?.split(' ')[0] || '0');
                        const areaB = parseFloat(b.fetchedDetails?.split(' ')[0] || '0');
                        return areaB - areaA;
                      });
                      return sorted;
                    });
                    toast({ title: 'Priority Set', description: 'Farms have been auto-prioritized by area.' });
                  }}
                >
                  <Bot className="w-5 h-5" />
                  Auto Priority
                </Button>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBlockModalOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleCreateBlock}
                  className="bg-green-700 hover:bg-green-800"
                  disabled={!blockName.trim() || landRows.length === 0 || landRows.every(row => !row.farmerId)}
                >
                  Save Block
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Block List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blocks.length === 0 ? (
          <div className="border border-dashed border-muted-foreground/30 rounded-xl p-8 flex flex-col items-center justify-center text-center h-64 bg-muted/5">
            <Map className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-semibold text-lg text-muted-foreground">No Blocks Created</h3>
            <p className="text-sm text-muted-foreground/80 mt-1 max-w-xs">
              Get started by clicking the "Create Block" button above to group farmers into manageable blocks.
            </p>
          </div>
        ) : (
          blocks.map((block) => (
            <div
              key={block.block_id}
              className="group bg-white border border-green-200 rounded-2xl p-0 shadow-md hover:shadow-xl transition-shadow cursor-pointer relative overflow-hidden flex flex-col min-h-[180px]"
              style={{ boxShadow: '0 4px 24px 0 rgba(16, 185, 129, 0.08)' }}
              onClick={() => {
                setViewBlock(block);
                setIsViewBlockModalOpen(true);
              }}
            >
              <div className="h-2 w-full bg-gradient-to-r from-green-400 via-green-200 to-green-100" />
              <div className="flex-1 flex flex-col justify-between p-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-xl text-green-900 truncate max-w-[70%] group-hover:text-green-700 transition-colors">
                      {block.block_name || block.block_id}
                    </h3>
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-semibold tracking-wide shadow-sm border border-green-200">
                      ID: {block.block_id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-base font-medium text-green-800">Total Area</span>
                    <span className="text-2xl font-extrabold text-green-900 drop-shadow-sm">
                      {block.total_area ?? 0} <span className="text-base font-semibold">acres</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <span className="text-xs text-muted-foreground">Click to view details</span>
                  <span className="inline-flex items-center gap-1 text-green-700 font-medium text-xs bg-green-50 px-2 py-1 rounded-full border border-green-100">
                    <Map className="w-4 h-4 mr-1 text-green-400" /> Block
                  </span>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                <Map className="w-32 h-32 text-green-400" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Block Modal */}
      <Dialog open={isViewBlockModalOpen} onOpenChange={setIsViewBlockModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">View Block</DialogTitle>
          </DialogHeader>

          {viewBlock && (
            <div className="space-y-6 py-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Block Name</label>
                  <Input value={viewBlock.block_name || ''} readOnly className="bg-muted/30" />
                </div>
                <div className="mb-1">
                  <div className="bg-muted/50 border border-border rounded-lg px-6 py-3 flex flex-col items-center min-w-[120px]">
                    <span className="text-xs text-muted-foreground mb-1">Total Area</span>
                    <span className="text-xl font-bold">{viewBlock.total_area ?? 0} acres</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Farmers in Block</label>
                <div className="bg-muted/20 border rounded-lg p-4 min-h-[60px]">
                  <span className="text-muted-foreground">(Farmer list UI goes here)</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewBlockModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Blocks;
