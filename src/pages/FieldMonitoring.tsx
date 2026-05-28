import React, { useMemo, useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { MapContainer, TileLayer, Marker, Polygon, Popup, Tooltip, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getBaseUrl } from '@/lib/config';
import { 
  MapPin, 
  Wheat,
  Users,
  Building,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';

interface FarmLocation {
  id: string;
  name: string;
  cropType?: string;
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
    supervisor_id?: string;
    phone?: string;
  };
  mediaPreview?: string;
}

interface ApiFarm {
  farm_id: string;
  crop_type?: string;
  created_at?: string;
  area: number;
  harvest_log?: Record<string, unknown>;
  priority?: number;
  block_id?: string;
  land_data?: {
    land_coordinates?: [number, number] | [number, number][];
    state?: string;
    district?: string;
    village?: string;
    farming_option?: string;
    land_media?: {
      images?: string[];
      video?: string;
    };
  };
  farmer_id?: string;
  payment_log?: Record<string, unknown>;
  supervisor?: {
    name?: string;
    supervisor_id?: string;
    contact?: string;
    phone?: string;
  };
}

interface ApiSupervisor {
  assigned_farms?: Record<string, unknown>;
  staff_id: string;
  sup_id: string;
  supervisor_info?: {
    staff_name?: string;
    employment_type?: string;
    staff_phone?: string;
    staff_department?: string;
    staff_designation?: string;
  };
}

interface Supervisor {
  staffId: string;
  supId: string;
  name: string;
  phone?: string;
  employmentType?: string;
  department?: string;
  designation?: string;
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

const FitToFarmBounds: React.FC<{ farms: FarmLocation[] }> = ({ farms }) => {
  const map = useMap();

  useEffect(() => {
    if (farms.length === 0) return;

    const points: [number, number][] = farms.flatMap((farm) => {
      if (farm.boundary && farm.boundary.length > 0) return farm.boundary;
      return [farm.coordinates];
    });

    if (points.length === 0) return;

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 18,
      animate: true,
    });
  }, [farms, map]);

  return null;
};

interface FieldMonitoringProps {
  userRole?: 'farm-manager' | 'field-manager';
  regionFilter?: string;
}

export default function FieldMonitoring({ userRole = 'farm-manager', regionFilter }: FieldMonitoringProps) {
  const [selectedFarm, setSelectedFarm] = useState<FarmLocation | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [farmIdSearch, setFarmIdSearch] = useState('');
  const [farms, setFarms] = useState<FarmLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [supervisorsError, setSupervisorsError] = useState<string | null>(null);
  const [supervisorsReloadKey, setSupervisorsReloadKey] = useState(0);
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const response = await fetch(`${getBaseUrl()}/farmer_managment/get_farms`);
        const data = await response.json();
        
        if (data.farms) {
          const transformedFarms: FarmLocation[] = data.farms.map((apiFarm: ApiFarm) => {
            const coords = apiFarm.land_data?.land_coordinates ?? [0, 0];
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
              cropType: apiFarm.crop_type,
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
              mediaPreview: apiFarm.land_data?.land_media?.images?.[0],
              supervisor: apiFarm.supervisor
                ? {
                    name: apiFarm.supervisor.name,
                    supervisor_id: apiFarm.supervisor.supervisor_id,
                    phone: apiFarm.supervisor.contact ?? apiFarm.supervisor.phone,
                  }
                : undefined,
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

  useEffect(() => {
    if (!showAssignDialog) return;

    const controller = new AbortController();

    const fetchSupervisors = async () => {
      try {
        setSupervisorsLoading(true);
        setSupervisorsError(null);

        const response = await fetch(`${getBaseUrl()}/supervisor_management/get_all_supervisors`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch supervisors (${response.status})`);
        }

        const data = await response.json();
        const apiList: ApiSupervisor[] = Array.isArray(data?.supervisors) ? data.supervisors : [];
        const transformed: Supervisor[] = apiList.map((sup) => ({
          staffId: sup.staff_id,
          supId: sup.sup_id,
          name: sup.supervisor_info?.staff_name || sup.sup_id || 'Supervisor',
          phone: sup.supervisor_info?.staff_phone,
          employmentType: sup.supervisor_info?.employment_type,
          department: sup.supervisor_info?.staff_department,
          designation: sup.supervisor_info?.staff_designation,
        }));

        setSupervisors(transformed);
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        console.error('Error fetching supervisors:', error);
        setSupervisorsError('Unable to load supervisors. Please try again.');
      } finally {
        setSupervisorsLoading(false);
      }
    };

    fetchSupervisors();

    return () => controller.abort();
  }, [showAssignDialog, supervisorsReloadKey]);

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

  const handleOpenAssignSupervisor = () => {
    setSupervisorSearch('');
    setSelectedSupervisor(null);
    setAssignError(null);
    setShowAssignDialog(true);
  };

  const filteredSupervisors = useMemo(() => {
    const query = supervisorSearch.trim().toLowerCase();
    if (!query) return supervisors;
    return supervisors.filter((sup) => {
      const haystack = `${sup.name} ${sup.supId} ${sup.phone ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [supervisorSearch, supervisors]);

  const handleConfirmAssignSupervisor = async () => {
    if (!selectedFarm || !selectedSupervisor) return;
    if (assignSubmitting) return;

    try {
      setAssignSubmitting(true);
      setAssignError(null);

      const supervisorIdToSend = selectedSupervisor.supId || selectedSupervisor.staffId;

      const response = await fetch(`${getBaseUrl()}/supervisor_management/assign_supervisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supervisor_id: supervisorIdToSend,
          farm_id: selectedFarm.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Assign supervisor failed (${response.status})`);
      }

      const data = await response.json();
      const isSuccess = data?.success === true || data?.success === 'True' || data?.success === 'true';
      if (!isSuccess) {
        throw new Error('Assign supervisor did not succeed');
      }

      const updatedSupervisor = {
        name: selectedSupervisor.name,
        supervisor_id: selectedSupervisor.supId,
        phone: selectedSupervisor.phone,
      };

      setFarms((prev) =>
        prev.map((farm) => (farm.id === selectedFarm.id ? { ...farm, supervisor: updatedSupervisor } : farm))
      );
      setSelectedFarm((prev) => (prev ? { ...prev, supervisor: updatedSupervisor } : prev));

      setShowAssignDialog(false);
    } catch (error) {
      console.error('Error assigning supervisor:', error);
      setAssignError('Unable to assign supervisor. Please try again.');
    } finally {
      setAssignSubmitting(false);
    }
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
      <div className="flex-1 relative min-h-[calc(100vh-7rem)]">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <FitToFarmBounds farms={filteredFarms} />
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
                      color: isSelected ? '#2563eb' : '#16a34a',
                      fillColor: isSelected ? '#93c5fd' : '#86efac',
                      fillOpacity: isSelected ? 0.28 : 0.22,
                      weight: isSelected ? 4 : 3,
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
                  <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                    <div className="px-2 py-1 rounded-md bg-white border border-emerald-200 shadow-sm text-[11px] font-semibold text-gray-800">
                      {farm.name}
                    </div>
                  </Tooltip>
                  <Popup>
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-900">{farm.name}</div>
                      <div className="text-xs text-gray-600">{farm.cropType || 'Crop not set'} • {farm.area} acres</div>
                      <div className="text-xs text-gray-500">{farm.village || '—'} • {farm.district || '—'} • {farm.state || '—'}</div>
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
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden p-0 gap-0 z-[5000]">
          {selectedFarm && (
            <>
              {/* Header Section - Fixed */}
              <div className="sticky top-0 bg-gradient-to-r from-green-50 to-emerald-50 border-b px-6 py-5 z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold text-gray-900 mb-1">
                      {selectedFarm.name}
                    </DialogTitle>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="bg-white font-mono text-xs">
                        {selectedFarm.id}
                      </Badge>
                      <Badge className="bg-green-600 text-white">
                        {selectedFarm.area} acres
                      </Badge>
                      {selectedFarm.priority && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                          Priority {selectedFarm.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowDetailsDialog(false)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-white/80"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto max-h-[calc(92vh-120px)] px-6 py-6">
                <div className="space-y-4">
                  {/* Row 1: Location + Farm info (concise, 2-column with dotted divider) */}
                  <div className="bg-white border rounded-xl p-5 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      <div className="md:pr-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-blue-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Location details</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Village</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedFarm.village || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">District</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedFarm.district || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">State</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedFarm.state || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Coordinates</p>
                            <p className="text-xs font-mono text-gray-600">
                              {selectedFarm.coordinates[0].toFixed(4)}, {selectedFarm.coordinates[1].toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 md:mt-0 md:pl-6 md:border-l md:border-dotted md:border-gray-300">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Building className="h-4 w-4 text-amber-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Farm information</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Farming option</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedFarm.farmingOption || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Area</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedFarm.area} acres</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Farmer ID</p>
                            <p className="text-xs font-mono text-gray-700 truncate">{selectedFarm.farmer_id || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Block ID</p>
                            <p className="text-xs font-mono text-gray-700 truncate">{selectedFarm.block_id || '—'}</p>
                          </div>
                          {selectedFarm.boundary && (
                            <div className="col-span-2">
                              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Boundary</p>
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                {selectedFarm.boundary.length} points mapped
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Supervisor (one-liner) */}
                  <div className="bg-white border rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-purple-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Supervisor</p>
                          {selectedFarm.supervisor?.name || selectedFarm.supervisor?.phone ? (
                            <p className="text-sm text-gray-900 truncate">
                              <span className="font-semibold">{selectedFarm.supervisor?.name || '—'}</span>
                              {selectedFarm.supervisor?.supervisor_id ? (
                                <span className="text-gray-500"> • </span>
                              ) : null}
                              {selectedFarm.supervisor?.supervisor_id ? (
                                <span className="font-mono text-xs text-gray-600">{selectedFarm.supervisor.supervisor_id}</span>
                              ) : null}
                              {selectedFarm.supervisor?.phone ? (
                                <span className="text-gray-500"> • {selectedFarm.supervisor.phone}</span>
                              ) : null}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600">No supervisor assigned</p>
                          )}
                        </div>
                      </div>

                      {!(selectedFarm.supervisor?.name || selectedFarm.supervisor?.phone) ? (
                        <Button size="sm" variant="outline" className="text-xs" onClick={handleOpenAssignSupervisor}>
                          Assign
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs" onClick={handleOpenAssignSupervisor}>
                          Change
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Latest cultivation details (one-liner) */}
                  <div className="bg-white border rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                        <Wheat className="h-4 w-4 text-teal-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Latest cultivation details</p>
                        <p className="text-sm text-gray-700 truncate">
                          Stage: — • Sowing: — • Last update: —
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Harvest logs (bigger section) */}
                  <div className="bg-white border rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                          <Wheat className="h-4 w-4 text-green-700" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Harvest log</h3>
                          <p className="text-xs text-muted-foreground">Latest entries for this farm</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        Coming soon
                      </Badge>
                    </div>

                    <div className="border rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-700 font-medium">No harvest entries yet</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Harvest log data will appear here once the API is integrated.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Supervisor Dialog */}
      <Dialog
        open={showAssignDialog}
        onOpenChange={(open) => {
          setShowAssignDialog(open);
          if (!open) {
            setSupervisorSearch('');
            setSelectedSupervisor(null);
            setSupervisorsError(null);
            setAssignError(null);
          }
        }}
      >
        <DialogPortal>
          <DialogOverlay className="z-[6000] bg-black/60" />
          <DialogPrimitive.Content
            className="fixed left-[50%] top-[50%] z-[6001] grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-xl border bg-white shadow-2xl"
          >
            <div className="border-b px-5 py-4 bg-white">
              <DialogTitle className="text-lg font-semibold text-gray-900">Assign Supervisor</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedFarm ? `Farm ID: ${selectedFarm.id}` : 'Select a farm to assign a supervisor.'}
              </p>
              <div className="mt-3">
                <Input
                  value={supervisorSearch}
                  onChange={(e) => setSupervisorSearch(e.target.value)}
                  placeholder="Search by name, phone, or supervisor ID..."
                  className="bg-white"
                />
              </div>
            </div>

            <div className="px-5 py-4">
              {assignError && (
                <div className="mb-3 border border-red-200 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                  {assignError}
                </div>
              )}
              {supervisorsLoading ? (
                <div className="py-10 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
                  <p className="text-sm text-muted-foreground">Loading supervisors...</p>
                </div>
              ) : supervisorsError ? (
                <div className="py-8">
                  <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-4 text-sm">
                    {supervisorsError}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" onClick={() => setSupervisorsReloadKey((k) => k + 1)}>
                      Retry
                    </Button>
                  </div>
                </div>
              ) : filteredSupervisors.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">No supervisors found.</p>
                </div>
              ) : (
                <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
                  {filteredSupervisors.map((sup) => {
                    const isActive = selectedSupervisor?.staffId === sup.staffId;
                    return (
                      <button
                        key={sup.staffId}
                        type="button"
                        onClick={() => setSelectedSupervisor(sup)}
                        className={
                          `w-full text-left border rounded-lg p-4 transition ` +
                          (isActive
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50')
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{sup.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {sup.supId}
                              {sup.phone ? ` • ${sup.phone}` : ''}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {sup.employmentType && (
                                <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-700">
                                  {sup.employmentType}
                                </Badge>
                              )}
                              {sup.department && (
                                <Badge variant="outline" className="text-[10px] bg-white">
                                  {sup.department}
                                </Badge>
                              )}
                              {sup.designation && (
                                <Badge variant="outline" className="text-[10px] bg-white">
                                  {sup.designation}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isActive && <Badge className="bg-green-600 text-white">Selected</Badge>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t px-5 py-4 bg-gray-50 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground truncate">
                {selectedSupervisor
                  ? `Selected: ${selectedSupervisor.name} (${selectedSupervisor.supId})`
                  : 'Select a supervisor to continue'}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!selectedFarm || !selectedSupervisor || assignSubmitting}
                  onClick={handleConfirmAssignSupervisor}
                >
                  {assignSubmitting ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
