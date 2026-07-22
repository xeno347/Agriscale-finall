import { useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Loader2, Save, X } from 'lucide-react';
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
import { calculateAcres, centerOf, type LatLng } from '@/lib/geo';
import { useToast } from '@/hooks/use-toast';
import type { Land, Plot } from './types';

const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export type AddPlotModalProps = {
  land: Land;
  open: boolean;
  onClose: () => void;
  onSaved: (plot: Plot) => void;
};

const AddPlotModal = ({ land, open, onClose, onSaved }: AddPlotModalProps) => {
  const { toast } = useToast();
  const [plotName, setPlotName] = useState('');
  const [plotCoords, setPlotCoords] = useState<LatLng[]>([]);
  const [saving, setSaving] = useState(false);
  const featureGroupRef = useRef<any>(null);

  const acres = useMemo(() => Math.round(calculateAcres(plotCoords) * 100) / 100, [plotCoords]);
  const mapCenter = useMemo(() => centerOf(land.land_data.land_coordinates ?? []), [land]);

  const resetAndClose = () => {
    setPlotName('');
    setPlotCoords([]);
    onClose();
  };

  const handleCreated = (e: any) => {
    const latlngs = e.layer.getLatLngs?.();
    if (Array.isArray(latlngs) && Array.isArray(latlngs[0])) {
      setPlotCoords(latlngs[0].map((p: any) => [p.lat, p.lng] as LatLng));
    }
  };

  const handleEdited = (e: any) => {
    e.layers.eachLayer((layer: any) => {
      const latlngs = layer.getLatLngs?.();
      if (Array.isArray(latlngs) && Array.isArray(latlngs[0])) {
        setPlotCoords(latlngs[0].map((p: any) => [p.lat, p.lng] as LatLng));
      }
    });
  };

  const handleSave = async () => {
    if (plotCoords.length < 3) {
      toast({ title: 'Missing boundary', description: 'Draw the plot boundary on the map first.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const base = getBaseUrl().replace(/\/$/, '');
      const saveResp = await fetch(`${base}/farmer_managment/save_land_plot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: land.farm_id,
          plot_coordinates: plotCoords,
          plot_area: acres,
          plot_name: plotName.trim() || undefined,
        }),
      });
      const saveBody = await saveResp.json().catch(() => null);
      if (!saveResp.ok || saveBody?.success !== true) {
        throw new Error(saveBody?.message || 'Failed to save plot');
      }

      const savedPlots: Plot[] = Array.isArray(saveBody.farm?.land_plots) ? saveBody.farm.land_plots : [];
      const newPlot = savedPlots[savedPlots.length - 1];
      if (!newPlot?.plot_id) {
        throw new Error('Plot saved but no plot_id was returned');
      }

      const cropResp = await fetch(`${base}/farmer_managment/add_crop_type_to_plot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farm_id: land.farm_id, plot_id: newPlot.plot_id, crop_type: 'napier' }),
      });
      const cropBody = await cropResp.json().catch(() => null);
      if (!cropResp.ok || cropBody?.success !== true) {
        throw new Error(cropBody?.message || 'Plot saved but failed to set crop type');
      }

      onSaved({ ...newPlot, crop_type: 'napier' });
      toast({ title: 'Success', description: 'Plot added successfully.', variant: 'success' });
      resetAndClose();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save plot', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Plot</DialogTitle>
          <DialogDescription>
            Draw the plot boundary within {[land.land_data.village, land.land_data.district].filter(Boolean).join(', ') || 'this land'}. Every plot grows Napier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>Plot name</Label>
          <Input value={plotName} onChange={(e) => setPlotName(e.target.value)} placeholder="e.g. Plot A" />
        </div>

        <div className="relative h-80 overflow-hidden rounded-lg border-2 border-border">
          <MapContainer center={{ lat: mapCenter[0], lng: mapCenter[1] }} zoom={17} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={SATELLITE_TILE_URL} attribution="&copy; Esri" />
            {(land.land_data.land_coordinates ?? []).length >= 3 && (
              <Polygon
                positions={land.land_data.land_coordinates}
                pathOptions={{ color: '#38bdf8', weight: 2, fillOpacity: 0.03, dashArray: '6 4' }}
              />
            )}
            <FeatureGroup ref={featureGroupRef}>
              <EditControl
                position="topleft"
                onCreated={handleCreated}
                onEdited={handleEdited}
                onDeleted={() => setPlotCoords([])}
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
          {plotCoords.length >= 3 ? `Plot drawn · ${acres} acres` : 'Draw a polygon on the map to set the plot boundary.'}
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetAndClose} disabled={saving}>
            <X className="mr-1.5 h-4 w-4" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save Plot
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPlotModal;
