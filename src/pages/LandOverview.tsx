import { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, MapPin, Navigation, Plus, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import LandMap from '@/components/land/LandMap';
import AddLandModal from '@/components/land/AddLandModal';
import AddPlotModal from '@/components/land/AddPlotModal';
import AmritAgrotechProfile from '@/components/land/AmritAgrotechProfile';
import AmritAgrotechSetup from '@/components/land/AmritAgrotechSetup';
import { findAmritAgrotech, fetchLands } from '@/components/land/api';
import type { FarmerDetail, Land } from '@/components/land/types';

const LandOverview = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<FarmerDetail | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [lands, setLands] = useState<Land[]>([]);
  const [selectedLandId, setSelectedLandId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addLandOpen, setAddLandOpen] = useState(false);
  const [addPlotOpen, setAddPlotOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Location unavailable', description: 'Geolocation is not supported by your browser.', variant: 'destructive' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => {
        toast({ title: 'Location error', description: 'Unable to fetch your current location.', variant: 'destructive' });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadLands = async (farmerId: string) => {
    try {
      const data = await fetchLands(farmerId);
      setLands(data);
      if (data.length > 0) setSelectedLandId((prev) => prev ?? data[0].farm_id);
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to load lands', variant: 'destructive' });
    }
  };

  const bootstrap = async () => {
    setLoading(true);
    try {
      const found = await findAmritAgrotech();
      if (!found) {
        setNeedsSetup(true);
        return;
      }
      setFarmer(found);
      setNeedsSetup(false);
      await loadLands(found.farmer_id);
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to load AmritAgrotech', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedLand = useMemo(() => lands.find((l) => l.farm_id === selectedLandId) ?? null, [lands, selectedLandId]);

  const totalPlots = lands.reduce((sum, l) => sum + (l.land_plots?.length ?? 0), 0);
  const totalArea = lands.reduce((sum, l) => sum + (Number(l.area) || 0), 0);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (needsSetup) {
    return (
      <AmritAgrotechSetup
        onCreated={async (farmerId) => {
          setNeedsSetup(false);
          setLoading(true);
          const found = await findAmritAgrotech();
          setFarmer(found);
          if (found) await loadLands(found.farmer_id);
          setLoading(false);
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Land Overview</h1>
          <p className="text-sm text-muted-foreground">
            {lands.length} land{lands.length === 1 ? '' : 's'} · {totalPlots} plot{totalPlots === 1 ? '' : 's'} · {totalArea.toFixed(2)} acres
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5" onClick={handleUseMyLocation} disabled={locating}>
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            My Location
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setProfileOpen(true)}>
            <Building2 className="h-4 w-4" /> AmritAgrotech
          </Button>
          <Button className="gap-1.5" onClick={() => setAddLandOpen(true)}>
            <Plus className="h-4 w-4" /> Add Land
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Lands</span>
          </div>
          {lands.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-muted-foreground">
              No lands yet. Add one to get started.
            </p>
          )}
          {lands.map((land) => (
            <button
              key={land.farm_id}
              onClick={() => setSelectedLandId(land.farm_id)}
              className={`rounded-lg border p-3 text-left text-sm transition ${
                selectedLandId === land.farm_id
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium text-slate-800">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                {[land.land_data.village, land.land_data.district].filter(Boolean).join(', ') || 'Land'}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sprout className="h-3 w-3" />
                {land.area} acres · {(land.land_plots ?? []).length} plot{(land.land_plots ?? []).length === 1 ? '' : 's'}
              </div>
            </button>
          ))}
          {selectedLand && (
            <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => setAddPlotOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Plot to selected land
            </Button>
          )}
        </div>

        <LandMap
          lands={lands}
          selectedLandId={selectedLandId}
          onSelectLand={setSelectedLandId}
          userLocation={userLocation}
          className="h-full min-h-[420px] overflow-hidden rounded-lg border border-slate-200"
        />
      </div>

      {farmer && (
        <>
          <AddLandModal
            farmerId={farmer.farmer_id}
            open={addLandOpen}
            onClose={() => setAddLandOpen(false)}
            onSaved={(land) => {
              setLands((prev) => [...prev, land]);
              setSelectedLandId(land.farm_id);
            }}
          />
          {selectedLand && (
            <AddPlotModal
              land={selectedLand}
              open={addPlotOpen}
              onClose={() => setAddPlotOpen(false)}
              onSaved={(plot) => {
                setLands((prev) =>
                  prev.map((l) => (l.farm_id === selectedLand.farm_id ? { ...l, land_plots: [...(l.land_plots ?? []), plot] } : l))
                );
              }}
            />
          )}
          <AmritAgrotechProfile
            farmerId={farmer.farmer_id}
            farmer={farmer}
            open={profileOpen}
            onOpenChange={setProfileOpen}
            onUpdated={setFarmer}
          />
        </>
      )}
    </div>
  );
};

export default LandOverview;
