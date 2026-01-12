import { useState, useEffect } from 'react';
import { Search, Filter, Users, MapPin, Phone, MoreHorizontal, Tractor, X, Check, FileText, ShieldCheck, Map as MapIcon, ChevronDown, ChevronUp, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Farmer } from '@/types/farm';
import getBaseUrl from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

// --- MOCK RENTAL HISTORY (To be replaced by API data) ---
const MOCK_RENTAL_HISTORY = [
  { id: 'r1', activity: 'Ploughing', date: '10 Jan 2026', cost: 5000, status: 'Completed' },
  { id: 'r2', activity: 'Irrigation', date: '15 Dec 2025', cost: 1200, status: 'Completed' },
];

const Farmers = () => {
  // --- Existing State & Logic ---
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // --- New Rental Feature State ---
  const [isRentalModalOpen, setRentalModalOpen] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [rentalForm, setRentalForm] = useState({
    activity: 'Inter-weeding',
    rentalSet: 'Rental Set 1',
    cost: ''
  });

  // --- UI State for Card Expansion ---
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const toggleHistory = (id: string) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };

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
          kyc: kyc ? { verified: true } : undefined,
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

  // --- Rental Actions ---
  const openRentalModal = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setRentalForm({ activity: 'Inter-weeding', rentalSet: 'Rental Set 1', cost: '' });
    setRentalModalOpen(true);
  };

  const handleRentalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!rentalForm.cost) {
      sonnerToast.error("Please enter estimated cost");
      return;
    }
    // API Call would go here
    console.log("Saving Rental:", { ...rentalForm, farmerId: selectedFarmer?.id });
    sonnerToast.success(`Rental added for ${selectedFarmer?.fullName}`);
    setRentalModalOpen(false);
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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Farmers</h1>
          <p className="text-muted-foreground mt-1">Manage registered farmers</p>
        </div>
      </div>

      {/* Stats - Exact Layout Preserved */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Farmers', value: farmers.length, icon: Users, color: 'text-primary' },
          { label: 'Total Land Area', value: `${totalArea} acres`, icon: null, color: 'text-blue-600' }, 
          { label: 'KYC Verified', value: verifiedKYC, icon: null, color: 'text-green-600' }, 
          { label: 'Agreements', value: totalAgreements, icon: null, color: 'text-orange-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-5 shadow-sm border border-border bg-white">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter - Exact Layout Preserved */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFarmers.map((farmer, index) => (
            // Replicating FarmerCard UI Structure exactly to inject button
            <div 
              key={farmer.id} 
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-lg">
                    {farmer.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{farmer.fullName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Phone className="w-3 h-3" /> {farmer.phoneNumber}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" /> {farmer.village}, {farmer.district}
                    </div>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 pt-2">
                {/* Land Mapping Row */}
                <div className="flex justify-between items-center py-2 border-t border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><MapIcon className="w-4 h-4"/></div>
                    <span className="text-sm font-medium text-gray-700">Land Mapping</span>
                  </div>
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">
                    {farmer.landMapping?.totalArea || 0} acres
                  </span>
                </div>

                {/* KYC Row */}
                <div className="flex justify-between items-center py-2 border-t border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600"><ShieldCheck className="w-4 h-4"/></div>
                    <span className="text-sm font-medium text-gray-700">KYC</span>
                  </div>
                  {farmer.kyc?.verified ? (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Verified</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs font-bold">Pending</span>
                  )}
                </div>

                {/* Agreements Row */}
                <div className="flex justify-between items-center py-2 border-t border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg text-gray-600"><FileText className="w-4 h-4"/></div>
                    <span className="text-sm font-medium text-gray-700">Agreements</span>
                  </div>
                  <span className="bg-gray-100 text-gray-500 w-8 h-4 rounded block"></span>
                </div>
              </div>

              {/* RENTAL HISTORY SECTION (COLLAPSIBLE) */}
              <div className="mt-2 border-t border-gray-100">
                <button 
                  onClick={() => toggleHistory(farmer.id)}
                  className="w-full flex items-center justify-between py-3 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4" /> Rental History
                  </div>
                  {expandedCardId === farmer.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedCardId === farmer.id && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm space-y-2 animate-in slide-in-from-top-2">
                    {MOCK_RENTAL_HISTORY.length > 0 ? (
                      MOCK_RENTAL_HISTORY.map((rental) => (
                        <div key={rental.id} className="flex justify-between items-center border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                          <div>
                            <p className="font-bold text-gray-800">{rental.activity}</p>
                            <p className="text-xs text-gray-500">{rental.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-800">₹{rental.cost}</p>
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">{rental.status}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-400 py-2">No history found.</p>
                    )}
                  </div>
                )}
              </div>

              {/* NEW ADDITION: Rental Button */}
              <Button 
                onClick={() => openRentalModal(farmer)}
                className="w-full bg-slate-900 text-white hover:bg-slate-800"
              >
                <Tractor className="w-4 h-4 mr-2" /> Add Rental
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD RENTAL MODAL --- */}
      {isRentalModalOpen && selectedFarmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold text-lg">Add Rental Activity</h3>
                <p className="text-slate-400 text-xs mt-0.5">For {selectedFarmer.fullName} ({selectedFarmer.id})</p>
              </div>
              <button onClick={() => setRentalModalOpen(false)} className="bg-white/10 p-1.5 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <form onSubmit={handleRentalSubmit} className="p-6 space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Activity Type</label>
                <select 
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-shadow"
                  value={rentalForm.activity}
                  onChange={e => setRentalForm({...rentalForm, activity: e.target.value})}
                >
                  <option>Inter-weeding</option>
                  <option>Mulching</option>
                  <option>Irrigation</option>
                  <option>Ploughing</option>
                  <option>Harvesting</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Rental Set</label>
                <select 
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-shadow"
                  value={rentalForm.rentalSet}
                  onChange={e => setRentalForm({...rentalForm, rentalSet: e.target.value})}
                >
                  <option>Rental Set 1</option>
                  <option>Rental Set 2</option>
                  <option>Rental Set 3</option>
                  <option>Rental Set 4</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Estimated Cost (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                  <input 
                    type="number" 
                    placeholder="e.g. 5000"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-shadow font-mono"
                    value={rentalForm.cost}
                    onChange={e => setRentalForm({...rentalForm, cost: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Save Rental Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Farmers;