import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HarvestPlan, Farmer } from '@/types/farm';
import { useToast } from '@/hooks/use-toast';
import getBaseUrl from '@/lib/config';
import HarvestCalendar from '@/components/harvest/HarvestCalendar';
import DateDetailModal from '@/components/harvest/DateDetailModal';
import HarvestPlanWizard from '@/components/harvest/HarvestPlanWizard';

const HarvestPlanning = () => {
  const [plans, setPlans] = useState<HarvestPlan[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const { toast } = useToast();

  useEffect(() => {
    loadPlans();
    loadFarmers();
  }, []);

  const loadPlans = async () => {
    try {
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/harvest/get_plans`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      const result = await resp.json();
      console.log('Raw API response:', result);

      const transformed: HarvestPlan[] = (result.plans || []).map((item: any) => ({
        id: item.id || item.plan_id,
        farmerId: item.farmer_id,
        farmerName: item.farmer_name || 'Unknown',
        cropType: item.crop_type || 'N/A',
        planningDate: item.planning_date,
        expectedHarvestDate: item.expected_harvest_date,
        estimatedYield: item.estimated_yield,
        yieldUnit: item.yield_unit || 'kg',
        notes: item.notes,
        status: item.status || 'planned',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      setPlans(transformed);
      toast({
        title: 'Success',
        description: `Loaded ${transformed.length} harvest plans`,
      });
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast({
        title: 'Error',
        description: `Failed to load plans: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const getMockFarmers = (): Farmer[] => {
    return [
      {
        id: 'farm-001',
        fullName: 'Rajesh Kumar Patel',
        phoneNumber: '+91-9876543210',
        alternatePhone: '+91-8765432109',
        village: 'Nashik',
        taluka: 'Nashik',
        district: 'Nashik',
        state: 'Maharashtra',
        profileImageUrl: undefined,
        kyc: {
          aadhaarNumber: '123456789012',
          panNumber: 'ABCDE1234F',
          address: 'Plot No. 45, Nashik Village',
          bankName: 'State Bank of India',
          accountNumber: '123456789012345',
          ifscCode: 'SBIN0001234',
          verified: true,
        },
        landMapping: {
          totalArea: 5,
          coordinates: [],
          soilType: 'Black Soil',
          irrigationType: 'Well',
          satelliteImageUrl: undefined,
        },
        agreements: [],
        createdAt: new Date('2024-01-15'),
      },
      {
        id: 'farm-002',
        fullName: 'Priya Sharma',
        phoneNumber: '+91-9123456789',
        alternatePhone: '+91-8123456789',
        village: 'Aurangabad',
        taluka: 'Aurangabad',
        district: 'Aurangabad',
        state: 'Maharashtra',
        profileImageUrl: undefined,
        kyc: {
          aadhaarNumber: '234567890123',
          panNumber: 'BCDEF2345G',
          address: 'Gram Panchayat Road, Aurangabad',
          bankName: 'HDFC Bank',
          accountNumber: '234567890123456',
          ifscCode: 'HDFC0002345',
          verified: true,
        },
        landMapping: {
          totalArea: 3.5,
          coordinates: [],
          soilType: 'Red Soil',
          irrigationType: 'Drip Irrigation',
          satelliteImageUrl: undefined,
        },
        agreements: [],
        createdAt: new Date('2024-02-10'),
      },
      {
        id: 'farm-003',
        fullName: 'Vikram Singh Yadav',
        phoneNumber: '+91-9234567890',
        alternatePhone: '+91-8234567890',
        village: 'Jalna',
        taluka: 'Jalna',
        district: 'Jalna',
        state: 'Maharashtra',
        profileImageUrl: undefined,
        kyc: {
          aadhaarNumber: '345678901234',
          panNumber: 'CDEFG3456H',
          address: 'Farm Plot 12, Jalna District',
          bankName: 'ICICI Bank',
          accountNumber: '345678901234567',
          ifscCode: 'ICIC0003456',
          verified: true,
        },
        landMapping: {
          totalArea: 7.2,
          coordinates: [],
          soilType: 'Black Soil',
          irrigationType: 'Canal',
          satelliteImageUrl: undefined,
        },
        agreements: [],
        createdAt: new Date('2023-12-20'),
      },
      {
        id: 'farm-004',
        fullName: 'Anjali Deshmukh',
        phoneNumber: '+91-9345678901',
        alternatePhone: '+91-8345678901',
        village: 'Parbhani',
        taluka: 'Parbhani',
        district: 'Parbhani',
        state: 'Maharashtra',
        profileImageUrl: undefined,
        kyc: {
          aadhaarNumber: '456789012345',
          panNumber: 'DEFGH4567I',
          address: 'Shendra Road, Parbhani',
          bankName: 'Axis Bank',
          accountNumber: '456789012345678',
          ifscCode: 'AXIS0004567',
          verified: true,
        },
        landMapping: {
          totalArea: 4.8,
          coordinates: [],
          soilType: 'Loamy Soil',
          irrigationType: 'Well',
          satelliteImageUrl: undefined,
        },
        agreements: [],
        createdAt: new Date('2024-01-05'),
      },
      {
        id: 'farm-005',
        fullName: 'Suresh Kulkarni',
        phoneNumber: '+91-9456789012',
        alternatePhone: '+91-8456789012',
        village: 'Beed',
        taluka: 'Beed',
        district: 'Beed',
        state: 'Maharashtra',
        profileImageUrl: undefined,
        kyc: {
          aadhaarNumber: '567890123456',
          panNumber: 'EFGHI5678J',
          address: 'Sultanpur, Beed District',
          bankName: 'Kotak Bank',
          accountNumber: '567890123456789',
          ifscCode: 'KKBK0005678',
          verified: true,
        },
        landMapping: {
          totalArea: 6.5,
          coordinates: [],
          soilType: 'Black Soil',
          irrigationType: 'Tube Well',
          satelliteImageUrl: undefined,
        },
        agreements: [],
        createdAt: new Date('2023-11-30'),
      },
    ];
  };

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
          kyc: kyc
            ? {
                aadhaarNumber: kyc.adhar_number,
                panNumber: kyc.pan_numnber ?? null,
                address: kyc.permanent_address,
                bankName: '',
                accountNumber: kyc.accound_number,
                ifscCode: kyc.IFSC_code,
                verified: true,
              }
            : undefined,
          landMapping: fd.estimated_land_area != null
            ? { totalArea: fd.estimated_land_area, coordinates: fd.land_coordinates || [] }
            : undefined,
          agreements: item.agreement_data && Array.isArray(item.agreement_data)
            ? item.agreement_data
            : [],
          createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        } as Farmer;
      });

      setFarmers(transformed);
    } catch (error) {
      console.error('Failed to load farmers, using mock data:', error);
      // Use mock data as fallback
      setFarmers(getMockFarmers());
      toast({
        title: 'Using Sample Farmers',
        description: 'Loaded sample farmers for testing. Connect to backend when ready.',
      });
    }
  };

  const filteredPlans = plans.filter(plan =>
    plan.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.cropType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total area from all farmers
  const totalArea = farmers.reduce((sum, f) => sum + (f.landMapping?.totalArea ?? 0), 0);
  // Calculate planned area from all plans with status 'planned'
  const plannedArea = plans
    .filter(p => p.status === 'planned')
    .reduce((sum, p) => {
      // Find matching farmer for area
      const farmer = farmers.find(f => f.id === p.farmerId);
      return sum + (farmer?.landMapping?.totalArea ?? 0);
    }, 0);

  const getStatusColor = (status: HarvestPlan['status']) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Harvest Planning</h1>
          <p className="text-muted-foreground mt-1">Manage crop harvest schedules and planning</p>
        </div>
        <Button className="gap-2" onClick={() => setAddModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Plan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-card rounded-xl p-4 shadow-card border border-border">
          <p className="text-sm text-muted-foreground">Total Area</p>
          <p className="text-2xl font-bold mt-1 text-primary">{totalArea} acres</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border border-border">
          <p className="text-sm text-muted-foreground">Planned Area</p>
          <p className="text-2xl font-bold mt-1 text-info">{plannedArea} acres</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by farmer name or crop type..."
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

      {/* Calendar view */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" onClick={() => setCalendarMonth(m => m === 0 ? 11 : m - 1) || (m === 0 ? setCalendarYear(y => y - 1) : null)}>
            &lt; Prev
          </Button>
          <div className="text-lg font-medium">{new Date(calendarYear, calendarMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
          <Button variant="ghost" onClick={() => setCalendarMonth(m => m === 11 ? 0 : m + 1) || (calendarMonth === 11 ? setCalendarYear(y => y + 1) : null)}>
            Next &gt;
          </Button>
        </div>
        <HarvestCalendar
          plans={plans}
          onDateClick={(dateIso, plansForDate) => { setActiveDate(dateIso); setDetailOpen(true); }}
          year={calendarYear}
          month={calendarMonth}
        />
      </div>

      <DateDetailModal
        open={detailOpen}
        dateIso={activeDate}
        plans={plans.filter(p => p.planningDate?.slice(0,10) === (activeDate ?? ''))}
        onClose={() => setDetailOpen(false)}
        onCreate={() => { setDetailOpen(false); setWizardOpen(true); }}
      />

      <HarvestPlanWizard
        open={wizardOpen}
        dateIso={activeDate ?? new Date().toISOString().slice(0,10)}
        farmers={farmers}
        onClose={() => setWizardOpen(false)}
        onCreatePlan={(plan) => { setPlans(prev => [plan, ...prev]); toast({ title: 'Plan created' }); }}
      />
    </div>
  );
};

export default HarvestPlanning;
