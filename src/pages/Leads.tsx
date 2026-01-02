import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lead } from '@/types/farm';
import { leadsApi } from '@/services/mockData';
import getBaseUrl from '@/lib/config';
import LeadsTable from '@/components/leads/LeadsTable';
import AddLeadModal, { AddLeadFormData } from '@/components/leads/AddLeadModal';
import VerificationModal from '@/components/leads/VerificationModal';
import KYCModal from '@/components/leads/KYCModal';
import { useToast } from '@/hooks/use-toast';

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/get_leads`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resp.ok) throw new Error(`Server responded with ${resp.status}`);

      const result = await resp.json();
      console.log('Raw API response:', result); // Debug log
      
      // Transform backend response to Lead interface
      const transformedLeads: Lead[] = (result.leads || []).map((item: any) => {
        // Defensive checks for farmer_data
        const farmer = item.farmer_data || {};
        return {
          id: String(item.lead_id),
          backendId: String(item.lead_id),
          farmerId: item.farmer_id,
          fullName: farmer.full_name || 'N/A',
          phoneNumber: farmer.phone_number || 'N/A',
          alternatePhone: farmer.alternate_phone_number,
          leadSource: farmer.lead_source || 'N/A',
          farmingOption: farmer.farming_option,
          village: farmer.village || 'N/A',
          taluka: farmer.taluka,
          district: farmer.district || 'N/A',
          state: farmer.state || 'N/A',
          estimatedLandArea: farmer.estimated_land_area,
          waterAvailable: farmer.water_available,
          notes: farmer.note,
          landCoordinates: farmer.land_coordinates,
          status: item.status,
          createdAt: item.created_at,
          kycData: item.kyc_data,
          agreementData: item.agreement_data,
        };
      });

      setLeads(transformedLeads);
      toast({
        title: 'Success',
        description: `Loaded ${transformedLeads.length} leads from backend`,
      });
    } catch (error) {
      console.error('Failed to load leads:', error);
      toast({
        title: 'Error',
        description: `Failed to load leads: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
      setLeads([]); // Show empty list, no fallback to mock
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (data: AddLeadFormData) => {
    try {
      const base = getBaseUrl();

      // Determine land_coordinates logic
      let land_coordinates = null;
      // If landCoordinates is an array of objects and has more than 1, treat as mapping
      if (Array.isArray(data.landCoordinates) && data.landCoordinates.length > 1) {
        // Mapping done: [[lat, lng], ...]
        land_coordinates = data.landCoordinates.map(coord => [coord.lat, coord.lng]);
      } else if (
        (!data.landCoordinates || data.landCoordinates.length === 0) && (data as any).landLocation
      ) {
        // Mapping skipped, but landLocation provided: [lat, lng]
        const loc = (data as any).landLocation;
        land_coordinates = [loc.lat, loc.lng];
      } else if (Array.isArray(data.landCoordinates) && data.landCoordinates.length === 1) {
        // Only one coordinate in mapping (edge case): treat as [lat, lng]
        land_coordinates = [data.landCoordinates[0].lat, data.landCoordinates[0].lng];
      } else {
        land_coordinates = null;
      }

      // Transform data to match backend schema exactly
      const payload = {
        full_name: data.fullName,
        phone_number: data.phoneNumber,
        alternate_phone_number: data.alternatePhone || null,
        lead_source: data.leadSource,
        farming_option: data.farmingOption || '', // Required string field
        village: data.village,
        taluka: data.taluka || null,
        district: data.district,
        state: data.state,
        estimated_land_area: parseFloat(String(data.estimatedLandArea || 0)), // Ensure float type
        water_available: Boolean(data.waterAvailable), // Ensure boolean
        note: data.notes || null,
        land_coordinates,
      };
      console.log('Submitting lead payload:', payload);

      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/lead_contacted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      const result = await resp.json();

      if (result.success) {
        // Create local lead object for UI
        const newLead: Lead = {
          ...(data as any),
          id: Date.now().toString(),
          status: 'contacted',
        };
        setLeads(prev => [newLead, ...prev]);
        toast({
          title: 'Success',
          description: 'Lead added successfully',
        });
      } else {
        throw new Error('Server returned success: false');
      }
    } catch (error) {
      // fallback to mock API if network fails
      try {
        const newLead = await leadsApi.create({
          ...data,
          status: 'contacted',
        });
        setLeads(prev => [newLead, ...prev]);
        toast({
          title: 'Success (offline)',
          description: 'Lead saved locally',
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to add lead',
          variant: 'destructive',
        });
      }
    }
  };

  const handleProceed = (lead: Lead) => {
    setSelectedLead(lead);
    if (lead.status === 'contacted') {
      setVerifyModalOpen(true);
    } else if (lead.status === 'verified') {
      setKycModalOpen(true);
    }
  };

  const handleVerify = async () => {
    if (!selectedLead) return;
    try {
      const base = getBaseUrl();
      const leadId = selectedLead.backendId || selectedLead.id;
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/verify_lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      const result = await resp.json();
      if (result.success) {
        setLeads(prev =>
          prev.map(l => (l.id === selectedLead.id ? { ...l, status: 'verified' as const } : l))
        );
        toast({
          title: 'Success',
          description: 'Lead verified successfully',
        });
        setVerifyModalOpen(false);
      } else {
        throw new Error('Server returned success: false');
      }
    } catch (error) {
      console.error('Verify error:', error);
      toast({
        title: 'Error',
        description: `Failed to verify lead: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedLead) return;
    try {
      const base = getBaseUrl();
      const leadId = selectedLead.backendId || selectedLead.id;
      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/reject_lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      const result = await resp.json();
      if (result.success) {
        setLeads(prev =>
          prev.map(l => (l.id === selectedLead.id ? { ...l, status: 'rejected' as const } : l))
        );
        toast({
          title: 'Lead Rejected',
          description: 'The lead has been rejected',
        });
        setVerifyModalOpen(false);
      } else {
        throw new Error('Server returned success: false');
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast({
        title: 'Error',
        description: `Failed to reject lead: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleKYCSubmit = async (kycData: {
    aadhaarNumber: string;
    panNumber: string;
    address: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  }) => {
    if (!selectedLead) return;
    try {
      const base = getBaseUrl();

      // Build payload matching RegisterFarmerRequest (including lead_id)
      const leadId = selectedLead.backendId || selectedLead.id;
      const payload = {
        lead_id: String(leadId),
        adhar_number: kycData.aadhaarNumber,
        pan_numnber: kycData.panNumber,
        permanent_address: kycData.address,
        accound_number: kycData.accountNumber,
        IFSC_code: kycData.ifscCode,
      };

      const url = `${base.replace(/\/$/, '')}/farmer_managment/register_farmer`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      const result = await resp.json();
      if (result.success) {
        setLeads(prev =>
          prev.map(l => (l.id === selectedLead.id ? { ...l, status: 'registered' as const } : l))
        );
        toast({
          title: 'Success',
          description: 'Farmer registered successfully',
        });
        setKycModalOpen(false);
      } else {
        throw new Error('Server returned success: false');
      }
    } catch (error) {
      console.error('KYC submission error:', error);
      toast({
        title: 'Error',
        description: `Failed to register farmer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.district.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: leads.length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    verified: leads.filter(l => l.status === 'verified').length,
    registered: leads.filter(l => l.status === 'registered').length,
    rejected: leads.filter(l => l.status === 'rejected').length,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Leads</h1>
          <p className="text-muted-foreground mt-1">Manage farmer onboarding pipeline</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Leads', value: stats.total, color: 'bg-primary/10 text-primary' },
          { label: 'Contacted', value: stats.contacted, color: 'bg-info/10 text-info' },
          { label: 'Verified', value: stats.verified, color: 'bg-success/10 text-success' },
          { label: 'Registered', value: stats.registered, color: 'bg-primary/10 text-primary' },
          { label: 'Rejected', value: stats.rejected, color: 'bg-destructive/10 text-destructive' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-4 shadow-card border border-border">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color.split(' ')[1]}`}>{stat.value}</p>
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

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <LeadsTable leads={filteredLeads} onProceed={handleProceed} />
      )}

      {/* Modals */}
      <AddLeadModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddLead}
      />

      <VerificationModal
        open={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        lead={selectedLead}
        onVerify={handleVerify}
        onReject={handleReject}
      />

      <KYCModal
        open={kycModalOpen}
        onClose={() => setKycModalOpen(false)}
        lead={selectedLead}
        onSubmit={handleKYCSubmit}
      />
    </div>
  );
};

export default Leads;
