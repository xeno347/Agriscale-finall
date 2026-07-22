import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin } from 'lucide-react';
import getBaseUrl from '@/lib/config';

type LatLng = [number, number];

export interface InlineMapPlotItem {
  plot_id: string;
  plot_name: string;
  plot_area: number;
}

interface ApiPlotData {
  plot_name: string;
  plot_area: number;
  plot_coordinates: LatLng[];
}

interface MapApiResponse {
  farm_coordinates: LatLng[];
  plot_map_data: ApiPlotData[];
}

interface InlineTaskPlotMapProps {
  farmId: string;
  plots: InlineMapPlotItem[];
}

const PLOT_COLORS = [
  '#f59e0b', '#a855f7', '#06b6d4', '#ec4899',
  '#f97316', '#14b8a6', '#6366f1', '#84cc16',
];
const plotColor = (i: number) => PLOT_COLORS[i % PLOT_COLORS.length];

const DEFAULT_CENTER: LatLng = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

const FitBounds = ({ coords }: { coords: LatLng[] }) => {
  const map = useMap();
  useEffect(() => {
    if (coords.length < 2) return;
    const bounds = L.latLngBounds(coords.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [8, 8], animate: false });
  }, [coords, map]);
  return null;
};

const InlineTaskPlotMap = ({ farmId, plots }: InlineTaskPlotMapProps) => {
  const [apiData, setApiData] = useState<MapApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (plots.length === 0) return;
    let mounted = true;
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    setIsLoading(true);
    setFetchError(null);

    fetch(`${BASE_URL}/farmer_managment/get_plot_map_view_data_for_task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farm_id: farmId, plot_id: plots.map((p) => p.plot_id) }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then((data: MapApiResponse) => { if (mounted) { setApiData(data); setIsLoading(false); } })
      .catch(() => { if (mounted) { setFetchError('Failed to load map'); setIsLoading(false); } });

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, plots.map((p) => p.plot_id).join(',')]);

  const nameToIdx = new Map<string, number>(plots.map((p, i) => [p.plot_name, i]));
  const farmCoords = apiData?.farm_coordinates ?? [];

  if (plots.length === 0) {
    return (
      <div className="flex h-20 w-full items-center justify-center rounded-md border border-dashed border-[#276152]/20 bg-slate-50">
        <span className="flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="h-3 w-3" /> No plots</span>
      </div>
    );
  }

  return (
    <div className="relative h-20 w-full overflow-hidden rounded-md border border-[#276152]/25 bg-slate-50">
      {isLoading && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-white/70">
          <Loader2 className="h-4 w-4 animate-spin text-[#276152]" />
        </div>
      )}
      {!isLoading && fetchError && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center px-1 text-center text-[9px] font-medium text-red-400">
          {fetchError}
        </div>
      )}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />

        {farmCoords.length >= 2 && <FitBounds coords={farmCoords} />}

        {farmCoords.length >= 3 && (
          <Polygon
            positions={farmCoords}
            pathOptions={{ color: '#ffffff', fillColor: '#ffffff', fillOpacity: 0.06, weight: 1.5, dashArray: '4 4' }}
          />
        )}

        {(apiData?.plot_map_data ?? []).map((plot) => {
          const colorIdx = nameToIdx.get(plot.plot_name) ?? 0;
          const color = plotColor(colorIdx);
          return (
            <Polygon
              key={plot.plot_name}
              positions={plot.plot_coordinates}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 1.5 }}
            >
              <Tooltip sticky>
                <span className="font-semibold">{plot.plot_name}</span>
                <br />
                <span className="text-gray-500 text-[11px]">{plot.plot_area} ac</span>
              </Tooltip>
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default InlineTaskPlotMap;
