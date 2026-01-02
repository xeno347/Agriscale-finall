import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, ArrowRight, ArrowLeft, MapPin, Check, Info, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, FeatureGroup, Marker } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

interface AddLeadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddLeadFormData) => Promise<void>;
}

export interface AddLeadFormData {
  fullName: string;
  phoneNumber: string;
  alternatePhone?: string;
  leadSource: string;
  farmingOption?: string;
  village: string;
  taluka?: string;
  district: string;
  state: string;
  estimatedLandArea?: number;
  waterAvailable: boolean;
  notes?: string;
  landLocation?: { lat: number; lng: number } | null;
  landCoordinates?: { lat: number; lng: number }[];
}

const AddLeadModal = ({ open, onClose, onSubmit }: AddLeadModalProps) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'location' | 'mapping'>('info');
  const [skipMapping, setSkipMapping] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 22.5726, lng: 78.9629 });
  const [landLocation, setLandLocation] = useState<{ lat: number; lng: number } | null>(null);
  const featureGroupRef = useRef(null);

  const [formData, setFormData] = useState<AddLeadFormData>({
    fullName: '',
    phoneNumber: '',
    alternatePhone: '',
    leadSource: '',
    farmingOption: '',
    village: '',
    taluka: '',
    district: '',
    state: '',
    estimatedLandArea: undefined,
    waterAvailable: false,
    notes: '',
    landCoordinates: [],
  });

  const getUserLocation = async () => {
    setLocationLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      setMapCenter({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your location. Using default location.');
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setStep('info');
      setSkipMapping(false);
      setLandLocation(null);
      setFormData({
        fullName: '',
        phoneNumber: '',
        alternatePhone: '',
        leadSource: '',
        farmingOption: '',
        village: '',
        taluka: '',
        district: '',
        state: '',
        estimatedLandArea: undefined,
        waterAvailable: false,
        notes: '',
        landCoordinates: [],
      });
    }
  }, [open]);

  useEffect(() => {
    if ((step === 'location' || step === 'mapping') && !landLocation) {
      getUserLocation();
    }
  }, [step]);

  const handleCanvasClick = () => {
    // No longer needed with leaflet
  };

  const handleMouseMove = () => {
    // No longer needed with leaflet
  };

  const handleUndo = () => {
    // Handled by leaflet draw
  };

  const handleClear = () => {
    // Handled by leaflet draw
  };

  const calculateArea = () => {
    return '0';
  };

  const isInfoValid = () => {
    return formData.fullName && formData.phoneNumber && formData.leadSource && 
           formData.village && formData.district && formData.state;
  };

  const handleNextStep = () => {
    if (isInfoValid()) {
      setStep('location');
    }
  };

  const handleLocationNext = () => {
    if (landLocation) {
      setStep('mapping');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let coordinates: { lat: number; lng: number }[] = [];
      if (!skipMapping && featureGroupRef.current) {
        coordinates = extractCoordinates();
      }
      const submitData: AddLeadFormData = {
        ...formData,
        landCoordinates: coordinates,
        landLocation: landLocation || undefined,
      };
      await onSubmit(submitData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const extractCoordinates = () => {
    // Extract drawn polygon coordinates from leaflet
    const coordinates: { lat: number; lng: number }[] = [];
    if (featureGroupRef.current) {
      const layers = (featureGroupRef.current as any).getLayers?.();
      if (layers) {
        layers.forEach((layer: any) => {
          if (layer.getLatLngs) {
            const latlngs = layer.getLatLngs();
            if (Array.isArray(latlngs)) {
              latlngs.forEach((latlng: any) => {
                coordinates.push({ lat: latlng.lat, lng: latlng.lng });
              });
            }
          }
        });
      }
    }
    return coordinates;
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display flex items-center gap-2">
            {step === 'info' && <>Add New Lead</>}
            {step === 'location' && <><MapPin className="w-5 h-5 text-primary" />Provide Land Location - {formData.fullName}</>}
            {step === 'mapping' && <><MapPin className="w-5 h-5 text-primary" />Land Mapping (Optional) - {formData.fullName}</>}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 'info' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs font-bold">1</span>
            Lead Info
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 'location' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs font-bold">2</span>
            Land Location
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 'mapping' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs font-bold">3</span>
            Land Mapping (Optional)
          </div>
        </div>

        {/* Step 1: Info */}
        {step === 'info' && (
          <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6 pt-4">
            {/* ...existing code for info form... */}
            <div className="grid grid-cols-2 gap-4">
              {/* ...existing code for info fields... */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter farmer's full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  required
                  value={formData.phoneNumber}
                  onChange={e => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternatePhone">Alternate Phone</Label>
                <Input
                  id="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={e => setFormData(prev => ({ ...prev, alternatePhone: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadSource">Lead Source *</Label>
                <Select
                  value={formData.leadSource}
                  onValueChange={value => setFormData(prev => ({ ...prev, leadSource: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Field Agent">Field Agent</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Digital Campaign">Digital Campaign</SelectItem>
                    <SelectItem value="Village Meeting">Village Meeting</SelectItem>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmingOption">Farming Option</Label>
                <Select
                  value={formData.farmingOption || ''}
                  onValueChange={value => setFormData(prev => ({ ...prev, farmingOption: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select farming option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contract Farming">Contract Farming</SelectItem>
                    <SelectItem value="Lease Farming">Lease Farming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="village">Village *</Label>
                <Input
                  id="village"
                  required
                  value={formData.village}
                  onChange={e => setFormData(prev => ({ ...prev, village: e.target.value }))}
                  placeholder="Enter village name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taluka">Taluka</Label>
                <Input
                  id="taluka"
                  value={formData.taluka}
                  onChange={e => setFormData(prev => ({ ...prev, taluka: e.target.value }))}
                  placeholder="Enter taluka"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">District *</Label>
                <Input
                  id="district"
                  required
                  value={formData.district}
                  onChange={e => setFormData(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="Enter district"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select
                  value={formData.state}
                  onValueChange={value => setFormData(prev => ({ ...prev, state: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
                    <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                    <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                    <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                    <SelectItem value="Bihar">Bihar</SelectItem>
                    <SelectItem value="Gujarat">Gujarat</SelectItem>
                    <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
                    <SelectItem value="Karnataka">Karnataka</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedLandArea">Estimated Land Area (acres)</Label>
                <Input
                  id="estimatedLandArea"
                  type="number"
                  value={formData.estimatedLandArea || ''}
                  onChange={e => setFormData(prev => ({ ...prev, estimatedLandArea: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="Enter area in acres"
                />
              </div>
              <div className="space-y-2">
                <Label>Water Available</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={formData.waterAvailable}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, waterAvailable: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.waterAvailable ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about this lead..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isInfoValid()} className="gap-2">
                Next: Land Location
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Land Location */}
        {step === 'location' && (
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3 p-3 bg-info/10 rounded-lg border border-info/20">
              <Info className="w-5 h-5 text-info mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Confirm or adjust the marker to indicate the main location of your land.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={getUserLocation}
                disabled={locationLoading}
                className="gap-2 flex-1"
              >
                {locationLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                {locationLoading ? 'Getting Location...' : 'Use My Location'}
              </Button>
            </div>
            <div className="relative border-2 border-border rounded-lg overflow-hidden h-96">
              <MapContainer
                center={landLocation || mapCenter}
                zoom={18}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='&copy; Esri'
                />
                {/* Draggable marker for land location */}
                {((landLocation || mapCenter) &&
                  <Marker
                    position={landLocation || mapCenter}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e: any) => {
                        const marker = e.target;
                        const pos = marker.getLatLng();
                        setLandLocation({ lat: pos.lat, lng: pos.lng });
                      },
                    }}
                  />
                )}
              </MapContainer>
            </div>
            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setStep('info')} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleLocationNext}
                  disabled={!landLocation}
                  className="gap-2"
                >
                  Next: Land Mapping (Optional)
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Land Mapping (Optional) */}
        {step === 'mapping' && (
          <div className="space-y-4">
            {!skipMapping ? (
              <>
                <div className="flex items-start gap-3 p-3 bg-info/10 rounded-lg border border-info/20">
                  <Info className="w-5 h-5 text-info mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Use the drawing tools on the map to mark your land boundary. You can draw polygons, rectangles, or circles. This step is optional.
                  </p>
                </div>
                <div className="relative border-2 border-border rounded-lg overflow-hidden h-96">
                  <MapContainer
                    center={landLocation || mapCenter}
                    zoom={18}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution='&copy; Esri'
                    />
                    <FeatureGroup ref={featureGroupRef}>
                      <EditControl
                        position="topleft"
                        onEdited={() => {}}
                        onCreated={() => {}}
                        onDeleted={() => {}}
                        draw={{
                          rectangle: true,
                          polygon: true,
                          circle: true,
                          polyline: false,
                          marker: false,
                          circlemarker: false,
                        }}
                      />
                    </FeatureGroup>
                  </MapContainer>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="font-medium">Land Mapping Skipped</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You can add land details later
                </p>
              </div>
            )}
            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setStep('location')} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSkipMapping(true)}
                  disabled={skipMapping}
                >
                  {skipMapping ? 'Mapping Skipped' : 'Skip Mapping'}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Check className="w-4 h-4" />
                  Save Lead
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadModal;
