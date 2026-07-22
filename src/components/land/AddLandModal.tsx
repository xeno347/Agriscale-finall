import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup, Marker, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import * as L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Loader2, Navigation, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import getBaseUrl from '@/lib/config';
import { calculateAcres, type LatLng } from '@/lib/geo';
import { useToast } from '@/hooks/use-toast';
import type { Land } from './types';

const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const userLocationIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const FlyToLocation = ({ position }: { position: { lat: number; lng: number } | null }) => {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    map.flyTo([position.lat, position.lng], 18, { duration: 1.2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng]);
  return null;
};

export type AddLandModalProps = {
  farmerId: string;
  open: boolean;
  onClose: () => void;
  onSaved: (land: Land) => void;
};

const AddLandModal = ({ farmerId, open, onClose, onSaved }: AddLandModalProps) => {
  const { toast } = useToast();
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [boundary, setBoundary] = useState<LatLng[]>([]);
  const [saving, setSaving] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const featureGroupRef = useRef<any>(null);

  const acres = useMemo(() => Math.round(calculateAcres(boundary) * 100) / 100, [boundary]);

  const resetAndClose = () => {
    setVillage('');
    setDistrict('');
    setState('');
    setBoundary([]);
    setUserLocation(null);
    onClose();
  };

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

  const handleCreated = (e: any) => {
    const latlngs = e.layer.getLatLngs?.();
    if (Array.isArray(latlngs) && Array.isArray(latlngs[0])) {
      setBoundary(latlngs[0].map((p: any) => [p.lat, p.lng] as LatLng));
    }
  };

  const handleEdited = (e: any) => {
    e.layers.eachLayer((layer: any) => {
      const latlngs = layer.getLatLngs?.();
      if (Array.isArray(latlngs) && Array.isArray(latlngs[0])) {
        setBoundary(latlngs[0].map((p: any) => [p.lat, p.lng] as LatLng));
      }
    });
  };

  const handleSave = async () => {
    if (!village.trim() || !district.trim() || !state.trim()) {
      toast({ title: 'Missing fields', description: 'Village, district and state are required.', variant: 'destructive' });
      return;
    }
    if (boundary.length < 3) {
      toast({ title: 'Missing boundary', description: 'Draw the land boundary on the map first.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const base = getBaseUrl().replace(/\/$/, '');
      const resp = await fetch(`${base}/farmer_managment/add_new_land_to_existing_farmer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: farmerId,
          land_coordinates: boundary,
          total_area: acres,
          state,
          district,
          village,
          crop_type: 'napier',
        }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok || body?.success !== true) {
        throw new Error(body?.message || 'Failed to add land');
      }

      onSaved({
        farm_id: body.farm_id,
        farmer_id: farmerId,
        area: acres,
        crop_type: 'napier',
        land_data: { land_coordinates: boundary, state, district, village, farming_option: '' },
        land_plots: [],
      });
      toast({ title: 'Success', description: 'Land added successfully.', variant: 'success' });
      resetAndClose();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to add land', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Land</DialogTitle>
          <DialogDescription>Draw the land boundary on the map and fill in its location.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Village</Label>
            <Input value={village} onChange={(e) => setVillage(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>District</Label>
            <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Input value={state} onChange={(e) => setState(e.target.value)} />
          </div>
        </div>

        <Button type="button" variant="outline" onClick={handleUseMyLocation} disabled={locating} className="w-full gap-2">
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          {locating ? 'Getting Location...' : 'Use My Location'}
        </Button>

        <div className="relative h-80 overflow-hidden rounded-lg border-2 border-border">
          <MapContainer center={{ lat: 22.5726, lng: 78.9629 }} zoom={16} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={SATELLITE_TILE_URL} attribution="&copy; Esri" />
            <FlyToLocation position={userLocation} />
            {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon} />}
            <FeatureGroup ref={featureGroupRef}>
              <EditControl
                position="topleft"
                onCreated={handleCreated}
                onEdited={handleEdited}
                onDeleted={() => setBoundary([])}
                draw={{
                  rectangle: true,
                  polygon: true,
                  circle: false,
                  polyline: false,
                  marker: false,
                  circlemarker: false,
                }}
              />
            </FeatureGroup>
          </MapContainer>
        </div>
        <p className="text-sm text-muted-foreground">
          {boundary.length >= 3 ? `Boundary drawn · ${acres} acres` : 'Draw a polygon on the map to set the boundary.'}
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetAndClose} disabled={saving}>
            <X className="mr-1.5 h-4 w-4" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save Land
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddLandModal;
