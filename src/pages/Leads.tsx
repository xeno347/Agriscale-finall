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
  const [selectedTab, setSelectedTab] = useState<'general' | 'follow_up' | 'rejected'>('general');
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
          // Keep taluka for backward compatibility, but prefer tehsil if provided by backend
          taluka: farmer.taluka,
          tehsil: farmer.tehsil || farmer.taluka || undefined,
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
      // If any land mapping or location exists, always send a nested list of coordinate pairs
      // i.e. [[lat, lng], [lat, lng], ...]. This includes single-point mappings.
      let land_coordinates = null;
      if (Array.isArray(data.landCoordinates) && data.landCoordinates.length > 0) {
        land_coordinates = data.landCoordinates.map(coord => [coord.lat, coord.lng]);
      } else if ((data as any).landLocation) {
        const loc = (data as any).landLocation;
        land_coordinates = [[loc.lat, loc.lng]];
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
        // send `tehsil` to backend; fallback to `taluka` if older UI supplies it
        tehsil: (data as any).tehsil || (data as any).taluka || null,
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
        // Refresh the leads list from server to ensure latest data
        await loadLeads();
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
          // Attempt to refresh leads (may fail if offline)
          await loadLeads();
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
    } else if (lead.status === 'verified' || lead.status === 'follow_up') {
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
      console.log('lead_id:', leadId);

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

  const handleFollowUp = async (note: string) => {
    if (!selectedLead) return;
    try {
      const base = getBaseUrl();
      const payload = {
        lead_id: String(selectedLead.backendId || selectedLead.id),
        follow_up_note: note,
      };

      const resp = await fetch(`${base.replace(/\/$/, '')}/farmer_managment/followup_lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      const result = await resp.json();
      if (result.success) {
        setLeads(prev =>
          prev.map(l => (l.id === selectedLead.id ? { ...l, status: 'follow_up' as const, notes: note } : l))
        );
        toast({ title: 'Follow Up', description: 'Lead moved to follow-up' });
        setVerifyModalOpen(false);
      } else {
        throw new Error('Server returned success: false');
      }
    } catch (error) {
      console.error('FollowUp error:', error);
      // Fallback to local update when network/backend fails
      setLeads(prev =>
        prev.map(l => (l.id === selectedLead.id ? { ...l, status: 'follow_up' as const, notes: note } : l))
      );
      toast({ title: 'Follow Up (offline)', description: 'Saved follow-up locally', variant: 'destructive' });
      setVerifyModalOpen(false);
    }
  };

  const handleKYCSubmit = async (kycData: {
    aadhaarNumber: string;
    aadhaarPhoto?: File | null;
    profilePhoto?: File | null;
    panNumber: string;
    panPhoto?: File | null;
    address: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    passbookPhoto?: File | null;
    agreementFile?: File | null;
    agreementStart?: string;
    agreementEnd?: string;
    b1Record?: File | null;
    kisanBook?: File | null;
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
        agreement_start_date: kycData.agreementStart || undefined,
        agreement_end_date: kycData.agreementEnd || undefined,
        lease_rent: kycData.leaseRent != null ? Number(kycData.leaseRent) : undefined,
      };

      const url = `${base.replace(/\/$/, '')}/farmer_managment/register_farmer`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      const result = await resp.json();
      if (!result.success) throw new Error('Server returned success: false');

      // Attempt to extract farmer id returned by register API
      const farmerId = result.farmer_id || result.data?.farmer_id || result.data?.id || result.farmer?.id;
      if (!farmerId) throw new Error('Register succeeded but farmer_id not returned');

      // Upload documents (if present) to upload_documents endpoint using multipart/form-data
      const uploadUrl = `${base.replace(/\/$/, '')}/farmer_managment/upload_documents`;

      const uploads: Array<{
        file?: File | null;
        document_type: string;
        fieldName: string;
      }> = [
        { file: kycData.aadhaarPhoto, document_type: 'adhar_card', fieldName: 'aadhaarPhoto' },
        { file: kycData.profilePhoto, document_type: 'profile_photo', fieldName: 'profilePhoto' },
        { file: kycData.panPhoto, document_type: 'pand_card', fieldName: 'panPhoto' },
        { file: kycData.passbookPhoto, document_type: 'bank_passbook', fieldName: 'passbookPhoto' },
        { file: kycData.agreementFile, document_type: 'agreement', fieldName: 'agreementFile' },
        { file: kycData.b1Record, document_type: 'B1_record', fieldName: 'b1Record' },
        { file: kycData.kisanBook, document_type: 'kisan_book', fieldName: 'kisanBook' },
      ];

      const failedUploads: string[] = [];

      for (const u of uploads) {
        if (!u.file) continue;

        try {
          const fd = new FormData();
          fd.append('document_type', u.document_type);
          fd.append('farmer_id', String(farmerId));
          fd.append('doc', u.file, u.file.name);

          // Some FastAPI handlers expect non-file params as query parameters.
          // Send document_type and farmer_id as query params and file as multipart body.
          const params = new URLSearchParams({ document_type: u.document_type, farmer_id: String(farmerId) });
          const urlWithParams = `${uploadUrl}?${params.toString()}`;

          const r = await fetch(urlWithParams, {
            method: 'POST',
            body: fd,
          });

          if (!r.ok) {
            // try to read response body for FastAPI validation details
            let text = '';
            try {
              text = await r.text();
            } catch (readErr) {
              text = String(readErr);
            }
            throw new Error(`Upload responded ${r.status}: ${text}`);
          }

          const rr = await r.json();
          if (!rr.success) throw new Error('Upload returned success: false');
        } catch (err) {
          console.error(`Upload failed for ${u.fieldName}:`, err);
          failedUploads.push(u.fieldName);
        }
      }

      // Update UI state based on upload results
      setLeads(prev =>
        prev.map(l => (l.id === selectedLead.id ? { ...l, status: 'registered' as const } : l))
      );

      if (failedUploads.length === 0) {
        toast({ title: 'Success', description: 'Farmer registered and documents uploaded' });
      } else {
        toast({ title: 'Partial Success', description: `Registered but failed to upload: ${failedUploads.join(', ')}`, variant: 'destructive' });
      }

      setKycModalOpen(false);
    } catch (error) {
      console.error('KYC submission error:', error);
      toast({
        title: 'Error',
        description: `Failed to register farmer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const filteredLeads = leads
    .filter(lead => {
      if (selectedTab === 'general') return ['contacted', 'verified'].includes(lead.status);
      if (selectedTab === 'follow_up') return lead.status === 'follow_up';
      if (selectedTab === 'rejected') return lead.status === 'rejected';
      return true;
    })
    .filter(lead =>
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

      {/* Search, Tabs & Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, village, or district..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setSelectedTab('general')}
            className={`${selectedTab === 'general' ? 'bg-primary text-primary-foreground' : 'bg-transparent'} px-3 py-1`}
          >
            General
          </Button>
          <Button
            variant="ghost"
            onClick={() => setSelectedTab('follow_up')}
            className={`${selectedTab === 'follow_up' ? 'bg-primary text-primary-foreground' : 'bg-transparent'} px-3 py-1`}
          >
            Follow up
          </Button>
          <Button
            variant="ghost"
            onClick={() => setSelectedTab('rejected')}
            className={`${selectedTab === 'rejected' ? 'bg-primary text-primary-foreground' : 'bg-transparent'} px-3 py-1`}
          >
            Rejected
          </Button>
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
        <LeadsTable leads={filteredLeads} onRegister={handleProceed} />
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
        onFollowUp={handleFollowUp}
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
