import { useState, useEffect } from 'react';
import { Search, Filter, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Farmer } from '@/types/farm';
import { farmersApi } from '@/services/mockData';
import FarmerCard from '@/components/farmers/FarmerCard';
import { useToast } from '@/hooks/use-toast';

const Farmers = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadFarmers();
  }, []);

  const loadFarmers = async () => {
    try {
      const data = await farmersApi.getAll();
      setFarmers(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load farmers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredFarmers = farmers.filter(farmer =>
    farmer.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    farmer.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
    farmer.district.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalArea = farmers.reduce((acc, f) => acc + (f.landMapping?.totalArea || 0), 0);
  const verifiedKYC = farmers.filter(f => f.kyc?.verified).length;
  const totalAgreements = farmers.reduce((acc, f) => acc + f.agreements.length, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Farmers</h1>
          <p className="text-muted-foreground mt-1">View and manage registered farmers</p>
        </div>
      </div>

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

      {filteredFarmers.length === 0 && !loading && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No farmers found</h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery ? 'Try adjusting your search' : 'Registered farmers will appear here'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Farmers;
