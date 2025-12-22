import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lead } from '@/types/farm';
import { leadsApi } from '@/services/mockData';
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
      const data = await leadsApi.getAll();
      setLeads(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load leads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (data: AddLeadFormData) => {
    try {
      const newLead = await leadsApi.create({
        ...data,
        status: 'contacted',
      });
      setLeads(prev => [newLead, ...prev]);
      toast({
        title: 'Success',
        description: 'Lead added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add lead',
        variant: 'destructive',
      });
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
      await leadsApi.updateStatus(selectedLead.id, 'verified');
      setLeads(prev =>
        prev.map(l => (l.id === selectedLead.id ? { ...l, status: 'verified' as const } : l))
      );
      toast({
        title: 'Success',
        description: 'Lead verified successfully',
      });
      setVerifyModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify lead',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedLead) return;
    try {
      await leadsApi.updateStatus(selectedLead.id, 'rejected');
      setLeads(prev =>
        prev.map(l => (l.id === selectedLead.id ? { ...l, status: 'rejected' as const } : l))
      );
      toast({
        title: 'Lead Rejected',
        description: 'The lead has been rejected',
      });
      setVerifyModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject lead',
        variant: 'destructive',
      });
    }
  };

  const handleKYCSubmit = async () => {
    if (!selectedLead) return;
    try {
      await leadsApi.updateStatus(selectedLead.id, 'registered');
      setLeads(prev =>
        prev.map(l => (l.id === selectedLead.id ? { ...l, status: 'registered' as const } : l))
      );
      toast({
        title: 'Success',
        description: 'Farmer registered successfully',
      });
      setKycModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to register farmer',
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
