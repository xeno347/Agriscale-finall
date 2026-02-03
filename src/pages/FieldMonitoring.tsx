import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBaseUrl } from '@/lib/config';
import { 
  MapPin, 
  Wheat,
  Users,
  Building,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FarmLocation {
  id: string;
  name: string;
  coordinates: [number, number];
  boundary?: [number, number][];
  area: number;
  state?: string;
  district?: string;
  village?: string;
  farmingOption?: string;
  priority?: number;
  farmer_id?: string;
  block_id?: string;
  supervisor?: {
    name?: string;
    phone?: string;
  };
}

interface ApiFarm {
  farm_id: string;
  land_coordinates: [number, number] | [number, number][];
  area: number;
  land_data?: {
    state?: string;
    district?: string;
    village?: string;
    farming_option?: string;
  };
  priority?: number;
  farmer_id?: string;
  block_id?: string;
  supervisor?: {
    name?: string;
    phone?: string;
  };
}

const ZoomToFarm: React.FC<{ search: string; farms: FarmLocation[] }> = ({ search, farms }) => {
  const map = useMap();

  useEffect(() => {
    const trimmedSearch = search.trim();
    if (!trimmedSearch) return;
    if (farms.length !== 1) return;

    const farm = farms[0];

    if (farm.boundary && farm.boundary.length >= 2) {
      const bounds = L.latLngBounds(farm.boundary);
      map.flyToBounds(bounds, {
        maxZoom: 19,
        duration: 1.2,
      });
    } else {
      map.flyTo(farm.coordinates, 18, { duration: 1.2 });
    }
  }, [search, farms, map]);

  return null;
};

interface FieldMonitoringProps {
  userRole?: 'farm-manager' | 'field-manager';
  regionFilter?: string;
}

export default function FieldMonitoring({ userRole = 'farm-manager', regionFilter }: FieldMonitoringProps) {
  const [selectedFarm, setSelectedFarm] = useState<FarmLocation | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [farmIdSearch, setFarmIdSearch] = useState('');
  const [farms, setFarms] = useState<FarmLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const response = await fetch(`${getBaseUrl()}/farmer_managment/get_farms`);
        const data = await response.json();
        
        if (data.farms) {
          const transformedFarms: FarmLocation[] = data.farms.map((apiFarm: ApiFarm) => {
            const coords = apiFarm.land_coordinates;
            const isPolygon = Array.isArray(coords[0]);
            
            // Calculate center point for polygon or use single coordinate
            let centerCoords: [number, number];
            let boundary: [number, number][] | undefined;
            
            if (isPolygon) {
              // It's a polygon - coords is array of [lat, lng] pairs
              boundary = coords as [number, number][];
              // Calculate centroid
              const latSum = boundary.reduce((sum, coord) => sum + coord[0], 0);
              const lngSum = boundary.reduce((sum, coord) => sum + coord[1], 0);
              centerCoords = [latSum / boundary.length, lngSum / boundary.length];
            } else {
              // It's a single point
              centerCoords = coords as [number, number];
            }
            
            return {
              id: apiFarm.farm_id,
              name: `${apiFarm.land_data?.village || 'Farm'} - ${apiFarm.land_data?.district || 'Unknown'}`,
              coordinates: centerCoords,
              boundary,
              area: apiFarm.area,
              state: apiFarm.land_data?.state,
              district: apiFarm.land_data?.district,
              village: apiFarm.land_data?.village,
              farmingOption: apiFarm.land_data?.farming_option,
              priority: apiFarm.priority,
              farmer_id: apiFarm.farmer_id,
              block_id: apiFarm.block_id,
              supervisor: apiFarm.supervisor,
            };
          });
          
          setFarms(transformedFarms);
        }
      } catch (error) {
        console.error('Error fetching farms:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFarms();
  }, []);

  // Minimal, clean circular marker icon
  const customIcon = L.divIcon({
    className: 'farm-marker-icon',
    html: `
      <div
        style="
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background-color: #22c55e;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
        "
      ></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });

  const handleFarmClick = (farm: FarmLocation) => {
    setSelectedFarm(farm);
    setShowDetailsDialog(true);
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 75) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const filteredFarms = useMemo(() => {
    if (!farmIdSearch.trim()) return farms;
    const query = farmIdSearch.trim().toLowerCase();
    return farms.filter((farm) => 
      farm.id.toLowerCase().includes(query) ||
      farm.name.toLowerCase().includes(query) ||
      farm.village?.toLowerCase().includes(query) ||
      farm.district?.toLowerCase().includes(query)
    );
  }, [farmIdSearch, farms]);

  // Calculate default center from all farms
  const mapCenter: [number, number] = useMemo(() => {
    if (farms.length === 0) return [22.5726, 78.9629]; // Default India center
    const latSum = farms.reduce((sum, farm) => sum + farm.coordinates[0], 0);
    const lngSum = farms.reduce((sum, farm) => sum + farm.coordinates[1], 0);
    return [latSum / farms.length, lngSum / farms.length];
  }, [farms]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading farms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header with search */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Field Monitoring</h1>
          <div className="w-full max-w-sm">
            <Input
              value={farmIdSearch}
              onChange={(e) => setFarmIdSearch(e.target.value)}
              placeholder="Search by Farm ID..."
              className="bg-white"
            />
          </div>
        </div>
      </div>

      {/* Full-width Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <ZoomToFarm search={farmIdSearch} farms={filteredFarms} />
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          {filteredFarms.map((farm) => {
            const isSelected = selectedFarm?.id === farm.id;
            return (
              <React.Fragment key={farm.id}>
                {/* Only render polygon if farm has boundary data */}
                {farm.boundary && (
                  <Polygon
                    positions={farm.boundary}
                    pathOptions={{
                      color: isSelected ? '#2563eb' : '#22c55e',
                      fillColor: isSelected ? '#60a5fa' : '#22c55e',
                      fillOpacity: isSelected ? 0.25 : 0.18,
                      weight: isSelected ? 3 : 2,
                    }}
                    eventHandlers={{
                      click: () => handleFarmClick(farm),
                    }}
                  />
                )}

                <Marker
                  position={farm.coordinates}
                  icon={customIcon}
                  eventHandlers={{
                    click: () => handleFarmClick(farm),
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[220px]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base leading-snug">{farm.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">Farm ID: {farm.id}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm mt-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Area: {farm.area} acres</span>
                        </div>
                        {farm.village && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span>{farm.village}, {farm.district}</span>
                          </div>
                        )}
                        {farm.state && (
                          <div className="flex items-center gap-2">
                            <Wheat className="h-4 w-4 text-gray-500" />
                            <span>{farm.state}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        className="mt-3 w-full text-xs border border-gray-300 bg-white hover:bg-gray-50 text-gray-900"
                        onClick={() => handleFarmClick(farm)}
                      >
                        View Full Details
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      {/* Detailed Farm Information Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto z-[9999]">
          {selectedFarm && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-bold">{selectedFarm.name}</DialogTitle>
                    <p className="text-muted-foreground mt-1">Farm ID: {selectedFarm.id}</p>
                  </div>
                  <Button
                    onClick={() => setShowDetailsDialog(false)}
                    variant="outline"
                    size="sm"
                    className="bg-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              <Separator className="my-4" />

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" /> Location Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Village</Label>
                        <p className="font-semibold">{selectedFarm.village || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">District</Label>
                        <p className="font-semibold">{selectedFarm.district || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">State</Label>
                        <p className="font-semibold">{selectedFarm.state || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Area</Label>
                        <p className="font-semibold text-lg">{selectedFarm.area} acres</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" /> Farm Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Farming Option</Label>
                        <p className="font-semibold">{selectedFarm.farmingOption || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Priority</Label>
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                          {selectedFarm.priority ? `Priority ${selectedFarm.priority}` : 'Not Set'}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Farmer ID</Label>
                        <p className="font-mono text-sm">{selectedFarm.farmer_id || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Block ID</Label>
                        <p className="font-mono text-sm">{selectedFarm.block_id || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">Supervisor</Label>
                        {selectedFarm.supervisor?.name || selectedFarm.supervisor?.phone ? (
                          <p className="font-semibold">
                            {selectedFarm.supervisor?.name}
                            {selectedFarm.supervisor?.phone
                              ? ` (${selectedFarm.supervisor.phone})`
                              : ''}
                          </p>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground">No supervisor found</span>
                            <Button size="sm" variant="outline">
                              Add Supervisor
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" /> Coordinates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">Center Point</Label>
                        <p className="font-mono text-sm">
                          Lat: {selectedFarm.coordinates[0].toFixed(6)}, 
                          Lng: {selectedFarm.coordinates[1].toFixed(6)}
                        </p>
                      </div>
                      {selectedFarm.boundary && (
                        <div>
                          <Label className="text-muted-foreground">Boundary Points</Label>
                          <Badge className="bg-green-50 text-green-700 border border-green-200">
                            {selectedFarm.boundary.length} Points Mapped
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
