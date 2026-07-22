import { Fragment, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, Marker, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { centerOf } from '@/lib/geo';
import type { Land } from './types';

const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const NAPIER_GREEN = '#22c55e';
const LAND_BOUNDARY_COLOR = '#38bdf8';

const userLocationIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const plotBadgeIcon = (acres: number, cropType?: string) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        width: 54px; height: 54px; border-radius: 9999px;
        background: #ffffff; border: 2px solid ${NAPIER_GREEN};
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: system-ui, -apple-system, sans-serif; line-height: 1.1;
      ">
        <span style="font-size: 13px; font-weight: 700; color: #14532d;">${acres}</span>
        <span style="font-size: 8px; font-weight: 600; color: #16a34a; margin-top: -2px;">acres</span>
        <span style="font-size: 7px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #475569; margin-top: 1px;">${capitalize(cropType || 'napier')}</span>
      </div>
    `,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
  });

const FitBounds = ({ lands }: { lands: Land[] }) => {
  const map = useMap();
  const allCoords = lands.flatMap((land) => land.land_data.land_coordinates ?? []);

  useEffect(() => {
    if (allCoords.length === 0) return;
    map.fitBounds(L.latLngBounds(allCoords as L.LatLngTuple[]), { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allCoords)]);

  return null;
};

const FlyToLocation = ({ position }: { position: { lat: number; lng: number } | null }) => {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    map.flyTo([position.lat, position.lng], 17, { duration: 1.2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng]);
  return null;
};

export type LandMapProps = {
  lands: Land[];
  selectedLandId?: string | null;
  onSelectLand?: (farmId: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
};

const LandMap = ({ lands, selectedLandId, onSelectLand, userLocation, className }: LandMapProps) => {
  return (
    <div className={className}>
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer url={SATELLITE_TILE_URL} maxZoom={21} />
        <FitBounds lands={lands} />
        <FlyToLocation position={userLocation ?? null} />
        {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon} />}

        {lands.map((land) => {
          const isSelected = selectedLandId === land.farm_id;
          const boundary = land.land_data.land_coordinates ?? [];
          return (
            <Fragment key={land.farm_id}>
              {boundary.length >= 3 && (
                <Polygon
                  positions={boundary}
                  pathOptions={{
                    color: LAND_BOUNDARY_COLOR,
                    weight: isSelected ? 3 : 2,
                    fillOpacity: 0.05,
                    dashArray: '6 4',
                  }}
                  eventHandlers={{ click: () => onSelectLand?.(land.farm_id) }}
                >
                  <Tooltip sticky>
                    {[land.land_data.village, land.land_data.district, land.land_data.state]
                      .filter(Boolean)
                      .join(', ') || 'Land'}{' '}
                    · {land.area} acres
                  </Tooltip>
                </Polygon>
              )}
              {(land.land_plots ?? []).map((plot) =>
                plot.plot_coordinates.length >= 3 ? (
                  <Fragment key={plot.plot_id}>
                    <Polygon
                      positions={plot.plot_coordinates}
                      pathOptions={{ color: NAPIER_GREEN, weight: 2, fillColor: NAPIER_GREEN, fillOpacity: 0.35 }}
                    >
                      <Tooltip sticky>
                        {plot.plot_name || 'Plot'} · Napier · {plot.plot_area} acres
                      </Tooltip>
                    </Polygon>
                    <Marker
                      position={centerOf(plot.plot_coordinates)}
                      icon={plotBadgeIcon(plot.plot_area, plot.crop_type)}
                      interactive={false}
                    />
                  </Fragment>
                ) : null
              )}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default LandMap;
