import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  MapPin, 
  Thermometer, 
  Droplets, 
  Wind, 
  Sun, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Activity,
  Beaker,
  Sprout,
  Eye,
  Wheat,
  Tractor,
  Users,
  Phone,
  Mail,
  Building,
  Clock,
  DollarSign,
  BarChart3,
  Zap,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FarmLocation {
  id: string;
  name: string;
  coordinates: [number, number];
  boundary: [number, number][];
  owner: string;
  contactPerson: string;
  phone: string;
  email: string;
  totalArea: number;
  cultivableArea: number;
  cropTypes: string[];
  currentCrops: Array<{ crop: string; area: number; status: string }>;
  soilType: string;
  irrigationType: string;
  waterSource: string;
  numberOfPlots: number;
  facilities: string[];
  equipment: string[];
  workforce: number;
  established: string;
  lastInspection: string;
  nextInspection: string;
  certifications: string[];
  avgYield: string;
  revenue: string;
  expenses: string;
  healthScore: number;
  alerts: string[];
  notes: string;
}

const farmLocations: FarmLocation[] = [
  {
    id: '1',
    name: 'Amrit Dairy Farm',
    coordinates: [28.6139, 77.2090],
    boundary: [
      [28.6145, 77.2085],
      [28.6145, 77.2095],
      [28.6133, 77.2095],
      [28.6133, 77.2085],
    ],
    owner: 'Amrit Singh',
    contactPerson: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'contact@amritdairy.com',
    totalArea: 44,
    cultivableArea: 40.8,
    cropTypes: ['Wheat', 'Rice', 'Cotton', 'Vegetables'],
    currentCrops: [
      { crop: 'Wheat', area: 15, status: 'Growing' },
      { crop: 'Rice', area: 12, status: 'Harvesting' },
      { crop: 'Cotton', area: 8, status: 'Flowering' },
      { crop: 'Vegetables', area: 5.8, status: 'Harvested' }
    ],
    soilType: 'Alluvial Loam',
    irrigationType: 'Drip & Sprinkler',
    waterSource: 'Borewell, Canal',
    numberOfPlots: 24,
    facilities: ['Processing Unit', 'Cold Storage', 'Warehouse', 'Office', 'Worker Housing'],
    equipment: ['5 Tractors', '3 Harvesters', '2 Sprayers', '4 Pumps', 'Seed Drill'],
    workforce: 45,
    established: '2015',
    lastInspection: '2026-01-28',
    nextInspection: '2026-02-15',
    certifications: ['Organic Certified', 'ISO 9001:2015', 'Good Agricultural Practices'],
    avgYield: '3.5 tons/acre',
    revenue: '₹85 Lakhs/year',
    expenses: '₹52 Lakhs/year',
    healthScore: 92,
    alerts: ['Irrigation system maintenance due', 'Plot 5 showing pest activity'],
    notes: 'High-performing farm with excellent soil health and modern infrastructure.'
  },
  {
    id: '2',
    name: 'Green Valley Farm',
    coordinates: [28.6200, 77.2150],
    boundary: [
      [28.6205, 77.2145],
      [28.6205, 77.2155],
      [28.6195, 77.2155],
      [28.6195, 77.2145],
    ],
    owner: 'Harpreet Kaur',
    contactPerson: 'Sunil Sharma',
    phone: '+91 98765 43211',
    email: 'info@greenvalley.com',
    totalArea: 32,
    cultivableArea: 28.5,
    cropTypes: ['Sugarcane', 'Wheat', 'Vegetables'],
    currentCrops: [
      { crop: 'Sugarcane', area: 18, status: 'Growing' },
      { crop: 'Wheat', area: 7, status: 'Sowing' },
      { crop: 'Vegetables', area: 3.5, status: 'Harvesting' }
    ],
    soilType: 'Clay Loam',
    irrigationType: 'Canal & Borewell',
    waterSource: 'Canal, 2 Borewells',
    numberOfPlots: 18,
    facilities: ['Warehouse', 'Pump House', 'Worker Quarters'],
    equipment: ['3 Tractors', '1 Harvester', '2 Sprayers', '3 Pumps'],
    workforce: 28,
    established: '2018',
    lastInspection: '2026-01-25',
    nextInspection: '2026-02-20',
    certifications: ['Good Agricultural Practices'],
    avgYield: '3.2 tons/acre',
    revenue: '₹62 Lakhs/year',
    expenses: '₹38 Lakhs/year',
    healthScore: 85,
    alerts: ['Soil testing recommended for Plot 7'],
    notes: 'Efficient water management system in place.'
  },
  {
    id: '3',
    name: 'Sunrise Agro Farm',
    coordinates: [28.6050, 77.2030],
    boundary: [
      [28.6055, 77.2025],
      [28.6055, 77.2035],
      [28.6045, 77.2035],
      [28.6045, 77.2025],
    ],
    owner: 'Vikram Malhotra',
    contactPerson: 'Amit Verma',
    phone: '+91 98765 43212',
    email: 'contact@sunriseagro.com',
    totalArea: 56,
    cultivableArea: 52,
    cropTypes: ['Rice', 'Wheat', 'Corn', 'Pulses'],
    currentCrops: [
      { crop: 'Rice', area: 25, status: 'Growing' },
      { crop: 'Wheat', area: 15, status: 'Growing' },
      { crop: 'Corn', area: 8, status: 'Harvesting' },
      { crop: 'Pulses', area: 4, status: 'Sowing' }
    ],
    soilType: 'Sandy Loam',
    irrigationType: 'Drip',
    waterSource: '3 Borewells, Pond',
    numberOfPlots: 30,
    facilities: ['Modern Storage', 'Processing Center', 'Laboratory', 'Office Complex', 'Guest House'],
    equipment: ['7 Tractors', '4 Harvesters', '5 Sprayers', '6 Pumps', 'Drone'],
    workforce: 65,
    established: '2012',
    lastInspection: '2026-02-01',
    nextInspection: '2026-02-18',
    certifications: ['Organic Certified', 'ISO 14001:2015', 'Fair Trade'],
    avgYield: '4.1 tons/acre',
    revenue: '₹1.2 Crores/year',
    expenses: '₹68 Lakhs/year',
    healthScore: 95,
    alerts: [],
    notes: 'Award-winning farm with sustainable practices and high productivity.'
  },
  {
    id: '4',
    name: 'Golden Harvest Farm',
    coordinates: [28.6100, 77.2200],
    boundary: [
      [28.6105, 77.2195],
      [28.6105, 77.2205],
      [28.6095, 77.2205],
      [28.6095, 77.2195],
    ],
    owner: 'Manpreet Singh',
    contactPerson: 'Ravi Patel',
    phone: '+91 98765 43213',
    email: 'hello@goldenharvest.com',
    totalArea: 28,
    cultivableArea: 25,
    cropTypes: ['Vegetables', 'Fruits', 'Herbs'],
    currentCrops: [
      { crop: 'Tomatoes', area: 8, status: 'Harvesting' },
      { crop: 'Potatoes', area: 7, status: 'Growing' },
      { crop: 'Mangoes', area: 6, status: 'Flowering' },
      { crop: 'Herbs', area: 4, status: 'Growing' }
    ],
    soilType: 'Red Soil',
    irrigationType: 'Sprinkler',
    waterSource: 'Borewell, Rainwater Harvesting',
    numberOfPlots: 15,
    facilities: ['Packhouse', 'Cold Storage', 'Nursery', 'Greenhouse'],
    equipment: ['2 Tractors', '3 Sprayers', '2 Pumps', 'Sorting Machine'],
    workforce: 22,
    established: '2019',
    lastInspection: '2026-01-30',
    nextInspection: '2026-02-25',
    certifications: ['Organic Certified', 'GlobalGAP'],
    avgYield: '5.2 tons/acre',
    revenue: '₹48 Lakhs/year',
    expenses: '₹29 Lakhs/year',
    healthScore: 88,
    alerts: ['Greenhouse temperature control needs attention'],
    notes: 'Specialized in high-value crops with direct market connections.'
  }
];

interface FieldMonitoringProps {
  userRole?: 'farm-manager' | 'field-manager';
  regionFilter?: string;
}

export default function FieldMonitoring({ userRole = 'farm-manager', regionFilter }: FieldMonitoringProps) {
  const [selectedFarm, setSelectedFarm] = useState<FarmLocation | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Custom marker icon
  const customIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Farm Locations Map</h2>
          <p className="text-muted-foreground">Click on any farm location to view complete details</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-2 border-blue-500 text-blue-700 bg-blue-50 font-semibold px-4 py-1.5">
            {farmLocations.length} Farms
          </Badge>
        </div>
      </div>

      {/* Map Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[700px] relative">
            <MapContainer
              center={[28.6139, 77.2090]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {farmLocations.map((farm) => (
                <React.Fragment key={farm.id}>
                  {/* Farm boundary polygon */}
                  <Polygon
                    positions={farm.boundary}
                    pathOptions={{
                      color: '#22c55e',
                      fillColor: '#22c55e',
                      fillOpacity: 0.2,
                      weight: 2
                    }}
                  />
                  
                  {/* Farm marker */}
                  <Marker
                    position={farm.coordinates}
                    icon={customIcon}
                    eventHandlers={{
                      click: () => handleFarmClick(farm)
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-lg mb-2">{farm.name}</h3>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Area: {farm.totalArea} acres</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span>Owner: {farm.owner}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Wheat className="h-4 w-4 text-gray-500" />
                            <span>{farm.numberOfPlots} plots</span>
                          </div>
                          <Button 
                            className="mt-3 w-full text-xs border border-gray-300 bg-white hover:bg-gray-50 text-gray-900"
                            onClick={() => handleFarmClick(farm)}
                          >
                            View Full Details
                          </Button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Farm Information Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto z-[9999]">
          {selectedFarm && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-3xl font-bold">{selectedFarm.name}</DialogTitle>
                    <p className="text-muted-foreground mt-1">Complete Farm Information A-Z</p>
                  </div>
                  <Badge className={`px-3 py-1 border-2 ${getHealthColor(selectedFarm.healthScore)}`}>
                    Health Score: {selectedFarm.healthScore}%
                  </Badge>
                </div>
              </DialogHeader>

              <div className="grid gap-6 mt-4">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Owner</Label>
                        <p className="font-semibold">{selectedFarm.owner}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Contact Person</Label>
                        <p className="font-semibold">{selectedFarm.contactPerson}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Phone
                        </Label>
                        <p className="font-semibold">{selectedFarm.phone}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Email
                        </Label>
                        <p className="font-semibold">{selectedFarm.email}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Established</Label>
                        <p className="font-semibold">{selectedFarm.established}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Workforce</Label>
                        <p className="font-semibold">{selectedFarm.workforce} employees</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Land & Agriculture Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Land & Agriculture Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Total Area</Label>
                        <p className="font-semibold text-lg">{selectedFarm.totalArea} acres</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Cultivable Area</Label>
                        <p className="font-semibold text-lg">{selectedFarm.cultivableArea} acres</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Number of Plots</Label>
                        <p className="font-semibold text-lg">{selectedFarm.numberOfPlots}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Soil Type</Label>
                        <p className="font-semibold">{selectedFarm.soilType}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Irrigation Type</Label>
                        <p className="font-semibold">{selectedFarm.irrigationType}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Water Source</Label>
                        <p className="font-semibold">{selectedFarm.waterSource}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Current Crops */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wheat className="h-5 w-5" />
                      Current Crops
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedFarm.currentCrops.map((crop, idx) => (
                        <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{crop.crop}</p>
                              <p className="text-sm text-muted-foreground">{crop.area} acres</p>
                            </div>
                            <Badge className="border border-green-500 text-green-700 bg-green-50">
                              {crop.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Label className="text-muted-foreground">All Crop Types Grown</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedFarm.cropTypes.map((crop, idx) => (
                          <Badge key={idx} className="border border-gray-300 bg-white text-gray-700">
                            {crop}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Facilities & Equipment */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Facilities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedFarm.facilities.map((facility, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                            <span className="text-sm">{facility}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Tractor className="h-5 w-5" />
                        Equipment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedFarm.equipment.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
                            <span className="text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance & Financial */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Performance & Financial Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg bg-green-50">
                        <Label className="text-muted-foreground text-xs">Average Yield</Label>
                        <p className="font-bold text-xl mt-1">{selectedFarm.avgYield}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-blue-50">
                        <Label className="text-muted-foreground text-xs">Annual Revenue</Label>
                        <p className="font-bold text-xl mt-1">{selectedFarm.revenue}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-orange-50">
                        <Label className="text-muted-foreground text-xs">Annual Expenses</Label>
                        <p className="font-bold text-xl mt-1">{selectedFarm.expenses}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-purple-50">
                        <Label className="text-muted-foreground text-xs">Health Score</Label>
                        <p className="font-bold text-xl mt-1">{selectedFarm.healthScore}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Inspections & Certifications */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Inspections
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-muted-foreground">Last Inspection</Label>
                          <p className="font-semibold flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(selectedFarm.lastInspection).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Next Inspection</Label>
                          <p className="font-semibold flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(selectedFarm.nextInspection).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Certifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedFarm.certifications.map((cert, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 border rounded bg-amber-50">
                            <Zap className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium">{cert}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Alerts */}
                {selectedFarm.alerts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Active Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedFarm.alerts.map((alert, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-3 border border-orange-200 rounded-lg bg-orange-50">
                            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                            <p className="text-sm">{alert}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Additional Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{selectedFarm.notes}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button 
                  onClick={() => setShowDetailsDialog(false)}
                  className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-900"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Eye className="h-4 w-4 mr-2" />
                  Schedule Inspection
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
