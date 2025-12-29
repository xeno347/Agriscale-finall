import { useState, useEffect } from 'react';
import { Search, Filter, Users, Plus, Trash2, Map, CheckCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import FarmerCard from '@/components/farmers/FarmerCard';
import { useToast } from '@/hooks/use-toast';

// --- Types for the Block System ---
interface LandRow {
  id: number;
  landName: string;
  farmerId: string;
  fetchedDetails: string | null; // This stores the "fetched" info
}

const Farmers = () => {
  // --- Existing State ---
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // --- New State for Blocks ---
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [landRows, setLandRows] = useState<LandRow[]>([
    { id: 1, landName: '', farmerId: '', fetchedDetails: null }
  ]);

  useEffect(() => {
    loadFarmers();
  }, []);

  const loadFarmers = async () => {
    try {
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/get_farmers`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

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
          kyc: kyc ? { verified: true } : undefined, // Simplified for this view
          landMapping: fd.estimated_land_area != null
            ? { totalArea: fd.estimated_land_area, coordinates: fd.land_coordinates || [] }
            : undefined,
          agreements: item.agreement_data || [],
          createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        } as Farmer;
      });

      setFarmers(transformed);
    } catch (error) {
      console.error('Failed to load farmers:', error);
      toast({ title: 'Error', description: 'Failed to load farmers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // --- Block Logic ---

  const addLandRow = () => {
    setLandRows([
      ...landRows,
      { id: Date.now(), landName: '', farmerId: '', fetchedDetails: null }
    ]);
  };

  const removeLandRow = (id: number) => {
    setLandRows(landRows.filter(row => row.id !== id));
  };

  const handleLandChange = (id: number, field: keyof LandRow, value: string) => {
    setLandRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        // AUTO-FETCH LOGIC: If farmer changes, find details immediately
        if (field === 'farmerId') {
          const selectedFarmer = farmers.find(f => f.id.toString() === value);
          if (selectedFarmer) {
            // Fetch logic: creating a summary string of their land/location
            const area = selectedFarmer.landMapping?.totalArea || '0';
            updatedRow.fetchedDetails = `${area} Acres in ${selectedFarmer.village}`;
          } else {
            updatedRow.fetchedDetails = null;
          }
        }
        return updatedRow;
      }
      return row;
    }));
  };

  const handleCreateBlock = () => {
    console.log("Creating Block:", { blockName, lands: landRows });
    toast({ title: "Success", description: "Block created successfully!" });
    setIsBlockModalOpen(false);
    // Reset form
    setBlockName('');
    setLandRows([{ id: 1, landName: '', farmerId: '', fetchedDetails: null }]);
  };

  // --- Filtering & Stats ---
  const filteredFarmers = farmers.filter(farmer =>
    farmer.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    farmer.village.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalArea = farmers.reduce((acc, f) => acc + (f.landMapping?.totalArea || 0), 0);
  const verifiedKYC = farmers.filter(f => f.kyc?.verified).length;
  const totalAgreements = farmers.reduce((acc, f) => acc + f.agreements.length, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Farmers & Blocks</h1>
          <p className="text-muted-foreground mt-1">Manage registered farmers and land blocks</p>
        </div>
      </div>

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="directory" className="px-6">Farmers Directory</TabsTrigger>
          <TabsTrigger value="blocks" className="px-6">Block Distribution</TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: FARMERS DIRECTORY ================= */}
        <TabsContent value="directory">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Farmers', value: farmers.length, icon: Users, color: 'text-primary' },
              { label: 'Total Land Area', value: `${totalArea} acres`, icon: null, color: 'text-info' },
              { label: 'KYC Verified', value: verifiedKYC, icon: null, color: 'text-success' },
              { label: 'Agreements', value: totalAgreements, icon: null, color: 'text-accent' },
            ].map(stat => (
              <div key={stat.label} className="bg-card rounded-xl p-5 shadow-card border border-border">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Search & Filter */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, village, or district..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {filteredFarmers.map((farmer, index) => (
                <div key={farmer.id} style={{ animationDelay: `${index * 100}ms` }}>
                  <FarmerCard farmer={farmer} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ================= TAB 2: BLOCK DISTRIBUTION ================= */}
        <TabsContent value="blocks">
          
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
            
            <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Block Name</label>
                    <Input 
                      placeholder="e.g. North Sector Alpha" 
                      value={blockName}
                      onChange={(e) => setBlockName(e.target.value)}
                    />
                  </div>

                  {/* Add Land Repeater Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Add Land</h3>
                      <Button onClick={addLandRow} size="sm" variant="outline" className="gap-2 text-green-700 border-green-700 hover:bg-green-50">
                        <Plus className="w-4 h-4" /> Add Row
                      </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden bg-white/50">
                      {/* Header */}
                      <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
                        <div className="col-span-1 text-center">S.No</div>
                        <div className="col-span-3">Land Name</div>
                        <div className="col-span-4">Farmer Name</div>
                        <div className="col-span-3">Fetched Details</div>
                        <div className="col-span-1 text-center">Action</div>
                      </div>

                      {/* Rows */}
                      <div className="divide-y">
                        {landRows.map((row, index) => (
                          <div key={row.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/20 transition-colors">
                            <div className="col-span-1 text-center text-muted-foreground">
                              {index + 1}
                            </div>
                            
                            <div className="col-span-3">
                              <Input 
                                placeholder="Plot name" 
                                value={row.landName}
                                onChange={(e) => handleLandChange(row.id, 'landName', e.target.value)}
                                className="h-9"
                              />
                            </div>

                            <div className="col-span-4">
                              {/* Using standard select for reliability, can be replaced with shadcn Select */}
                              <select 
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={row.farmerId}
                                onChange={(e) => handleLandChange(row.id, 'farmerId', e.target.value)}
                              >
                                <option value="">Select Farmer</option>
                                {farmers.map(f => (
                                  <option key={f.id} value={f.id}>{f.fullName}</option>
                                ))}
                              </select>
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

                            <div className="col-span-1 text-center">
                              {landRows.length > 1 && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => removeLandRow(row.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
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
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBlockModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateBlock} className="bg-green-700 hover:bg-green-800">Save Block</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Placeholder for Block List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {/* This is where you would map through your blocks in the future */}
             <div className="border border-dashed border-muted-foreground/30 rounded-xl p-8 flex flex-col items-center justify-center text-center h-64 bg-muted/5">
                <Map className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="font-semibold text-lg text-muted-foreground">No Blocks Created</h3>
                <p className="text-sm text-muted-foreground/80 mt-1 max-w-xs">
                  Get started by clicking the "Create Block" button above to group farmers into manageable blocks.
                </p>
             </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Farmers;