import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, AlertCircle, Ban, MapPin, Notebook as Journal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/types/farm';
import getBaseUrl from '@/lib/config';
import LeadsTable from '@/components/leads/LeadsTable';
import AddLeadModal from '@/components/leads/AddLeadModal';
import KYCModal from '@/components/leads/KYCModal'; 
import { useToast } from '@/hooks/use-toast';

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadLeads(); }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/get_leads`);
      const result = await resp.json();
      setLeads(result.leads || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to sync with AgriScale server', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const name = lead.fullName || '';
      const village = lead.village || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            village.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === 'active') return matchesSearch && (lead.status === 'contacted' || lead.status === 'verified');
      if (activeTab === 'follow_up') return matchesSearch && lead.status === 'follow_up';
      if (activeTab === 'rejected') return matchesSearch && lead.status === 'rejected';
      return matchesSearch;
    });
  }, [leads, searchQuery, activeTab]);

  const handleRegisterFarmer = async (kycData: {
    aadhaarNumber: string;
    panNumber: string;
    address: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  }) => {
    try {
      const base = getBaseUrl();
      const payload = {
        lead_id: selectedLead?.id,
        adhar_number: kycData.aadhaarNumber,
        pan_numnber: kycData.panNumber,
        permanent_address: kycData.address,
        accound_number: kycData.accountNumber,
        IFSC_code: kycData.ifscCode,
        // Agreement Data can be added here if needed
      };

      const resp = await fetch(`${base}/farmer_managment/register_farmer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        toast({ title: 'Success', description: 'Farmer Registered & Agreement Active' });
        setKycModalOpen(false);
        loadLeads();
      }
    } catch (e) {
      toast({ title: 'System Error', description: 'Could not complete registration', variant: 'destructive' });
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#fcfdfa] min-h-screen">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Farmer Pipeline</h1>
          <p className="text-slate-500 mt-1">Onboarding, KYC, and Lease Management for Agri-Scale</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-slate-200">
            <Journal className="mr-2 h-4 w-4" /> Export B1/Kissan Book
          </Button>
          <Button onClick={() => setAddModalOpen(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add New Lead
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border-emerald-100">
          <CardHeader className="pb-2"><CardDescription>Active Leads</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-900">{leads.filter(l => l.status !== 'rejected').length}</p></CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-amber-100">
          <CardHeader className="pb-2"><CardDescription>Pending Follow-up</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{leads.filter(l => l.status === 'follow_up').length}</p></CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-red-100">
          <CardHeader className="pb-2"><CardDescription>Flagged Behavior</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{leads.filter(l => l.isFlagged).length}</p></CardContent>
        </Card>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <span className="text-lg text-slate-500">Loading leads...</span>
        </div>
      )}

      {/* Error or Empty State */}
      {!loading && leads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-2xl text-slate-400 mb-2">No leads found</span>
          <span className="text-slate-500 mb-4">Try syncing again or add a new lead.</span>
          <Button onClick={loadLeads} variant="outline">Reload Leads</Button>
        </div>
      )}

      {/* Main Table UI */}
      {!loading && leads.length > 0 && (
        <Tabs defaultValue="active" onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-xl border shadow-sm">
            <TabsList className="bg-slate-50 border-none">
              <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700">Pipeline</TabsTrigger>
              <TabsTrigger value="follow_up" className="data-[state=active]:bg-white data-[state=active]:text-amber-700">Follow Up</TabsTrigger>
              <TabsTrigger value="rejected" className="data-[state=active]:bg-white data-[state=active]:text-red-700">Rejected</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-3 w-full md:w-auto px-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search village or name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200" 
                />
              </div>
              <Button variant="ghost" size="icon"><Filter className="h-4 w-4 text-slate-500" /></Button>
            </div>
          </div>
          <TabsContent value={activeTab} className="m-0">
            <Card className="border-none shadow-md overflow-hidden bg-white">
              <LeadsTable 
                leads={filteredLeads} 
                onRegister={(lead) => { setSelectedLead(lead); setKycModalOpen(true); }}
                onFlag={(id, flagged) => console.log(id, flagged)}
                onAddLand={(lead) => console.log("Adding land to", lead.id)}
              />
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Modals */}
      <KYCModal 
        open={kycModalOpen} 
        onClose={() => setKycModalOpen(false)} 
        onSubmit={handleRegisterFarmer}
        lead={selectedLead}
      />
      <AddLeadModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSubmit={loadLeads} />
    </div>
  );
};

export default Leads;