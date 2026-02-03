import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  MapPin, 
  Thermometer, 
  Droplets, 
  Wind, 
  Sun, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Activity,
  Beaker,
  Sprout,
  Camera,
  CheckCircle,
  Clock,
  Eye,
  Plus,
  Search,
  Filter,
  Wheat,
  Tractor
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FieldData {
  id: string;
  name: string;
  location: string;
  area: number;
  cropType: string;
  plantingDate: string;
  expectedHarvestDate: string;
  currentStage: string;
  soilMoisture: number;
  temperature: number;
  humidity: number;
  phLevel: number;
  nitrogenLevel: number;
  phosphorusLevel: number;
  potassiumLevel: number;
  pestActivity: 'low' | 'medium' | 'high';
  diseaseRisk: 'low' | 'medium' | 'high';
  irrigationStatus: 'scheduled' | 'active' | 'completed' | 'overdue';
  weatherCondition: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  lastInspection: string;
  nextInspection: string;
  healthScore: number;
  yieldProjection: number;
  alerts: string[];
  observations: Array<{
    id: string;
    date: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    images?: string[];
  }>;
}

interface FieldMonitoringProps {
  userRole?: 'farm-manager' | 'field-manager';
  regionFilter?: string;
}

interface PlotData {
  id: number;
  plotNumber: string;
  name: string;
  area: string;
  status: 'idle' | 'ploughing' | 'harvesting' | 'irrigation' | 'planting' | 'fertilizing' | 'pest-control';
  crop: string;
  completion: number;
  lastActivity: string;
  nextActivity: string;
  position: { x: number; y: number; width: number; height: number };
  alerts?: string[];
}

// Clean grid layout matching the image
const plotsData: PlotData[] = [
  // Top row
  { id: 18, plotNumber: '18', name: 'PLOT NO. 18', area: '1.05acre', status: 'idle', crop: 'Wheat', completion: 0, lastActivity: 'Field prepared', nextActivity: 'Sowing', position: { x: 290, y: 80, width: 110, height: 80 } },
  { id: 13, plotNumber: '13', name: 'PLOT NO. 13', area: '1.3acre', status: 'harvesting', crop: 'Rice', completion: 85, lastActivity: 'Crop matured', nextActivity: 'Storage', position: { x: 420, y: 80, width: 130, height: 80 } },
  { id: 7, plotNumber: '07', name: 'PLOT NO. 07', area: '1.35acre', status: 'irrigation', crop: 'Cotton', completion: 60, lastActivity: 'Fertilizer applied', nextActivity: 'Monitoring', position: { x: 570, y: 80, width: 130, height: 80 } },

  // Second row  
  { id: 17, plotNumber: '17', name: 'PLOT NO. 17', area: '1.65acre', status: 'ploughing', crop: 'Corn', completion: 25, lastActivity: 'Harvest completed', nextActivity: 'Land preparation', position: { x: 290, y: 180, width: 110, height: 90 } },
  { id: 12, plotNumber: '12', name: 'PLOT NO. 12', area: '2.50acre', status: 'fertilizing', crop: 'Soybean', completion: 70, lastActivity: 'Soil testing', nextActivity: 'Growth monitoring', position: { x: 420, y: 180, width: 130, height: 90 } },
  { id: 5, plotNumber: '05', name: 'PLOT NO. 05', area: '1.28acre', status: 'pest-control', crop: 'Vegetables', completion: 85, lastActivity: 'Pest detected', nextActivity: 'Treatment application', position: { x: 570, y: 180, width: 65, height: 90 } },
  { id: 6, plotNumber: '06', name: 'PLOT NO. 06', area: '1.54acre', status: 'idle', crop: 'Millet', completion: 0, lastActivity: 'Field cleared', nextActivity: 'Soil preparation', position: { x: 655, y: 180, width: 65, height: 90 } },

  // Third row
  { id: 16, plotNumber: '16', name: 'PLOT NO. 16', area: '2.63acre', status: 'harvesting', crop: 'Sugarcane', completion: 45, lastActivity: 'Quality check', nextActivity: 'Processing', position: { x: 290, y: 290, width: 110, height: 80 } },
  { id: 11, plotNumber: '11', name: 'PLOT NO. 11', area: '2.25acre', status: 'irrigation', crop: 'Wheat', completion: 55, lastActivity: 'Growth stage 3', nextActivity: 'Fertilizer application', position: { x: 420, y: 290, width: 130, height: 80 } },
  { id: 3, plotNumber: '03', name: 'PLOT NO. 03', area: '1.11acre', status: 'planting', crop: 'Rice', completion: 30, lastActivity: 'Seed preparation', nextActivity: 'Initial irrigation', position: { x: 570, y: 290, width: 65, height: 80 } },
  { id: 4, plotNumber: '04', name: 'PLOT NO. 04', area: '1.21acre', status: 'idle', crop: 'Cotton', completion: 0, lastActivity: 'Field inspection', nextActivity: 'Sowing preparation', position: { x: 655, y: 290, width: 65, height: 80 } },

  // Fourth row
  { id: 10, plotNumber: '10', name: 'PLOT NO. 10', area: '1.43acre', status: 'ploughing', crop: 'Corn', completion: 20, lastActivity: 'Previous crop removed', nextActivity: 'Deep ploughing', position: { x: 420, y: 390, width: 110, height: 80 } },
  { id: 1, plotNumber: '01', name: 'PLOT NO. 01', area: '0.65acre', status: 'fertilizing', crop: 'Soybean', completion: 75, lastActivity: 'Nutrient analysis', nextActivity: 'Growth assessment', position: { x: 550, y: 390, width: 85, height: 80 } },
  { id: 2, plotNumber: '02', name: 'PLOT NO. 02', area: '0.74acre', status: 'harvesting', crop: 'Vegetables', completion: 90, lastActivity: 'Quality inspection', nextActivity: 'Market preparation', position: { x: 655, y: 390, width: 65, height: 80 } },

  // Fifth row
  { id: 15, plotNumber: '15', name: 'PLOT NO. 15', area: '1.64acre', status: 'irrigation', crop: 'Millet', completion: 35, lastActivity: 'Germination check', nextActivity: 'Nutrient supply', position: { x: 290, y: 490, width: 110, height: 70 } },
  { id: 9, plotNumber: '09', name: 'PLOT NO. 09', area: '2.57acre', status: 'pest-control', crop: 'Sugarcane', completion: 60, lastActivity: 'Pest monitoring', nextActivity: 'Organic treatment', position: { x: 420, y: 490, width: 130, height: 70 } },

  // Sixth row
  { id: 14, plotNumber: '14', name: 'PLOT NO. 14', area: '1.90acre', status: 'planting', crop: 'Wheat', completion: 40, lastActivity: 'Seed selection', nextActivity: 'Sowing completion', position: { x: 290, y: 580, width: 110, height: 60 } },
  { id: 8, plotNumber: '08', name: 'PLOT NO. 08', area: '1.35acre', status: 'idle', crop: 'Rice', completion: 0, lastActivity: 'Field survey', nextActivity: 'Soil testing', position: { x: 420, y: 580, width: 130, height: 60 } },

  // Left side plots
  { id: 21, plotNumber: '21B', name: 'PLOT NO. 21B', area: '2.11acre', status: 'harvesting', crop: 'Cotton', completion: 80, lastActivity: 'Fiber quality check', nextActivity: 'Ginning preparation', position: { x: 100, y: 250, width: 80, height: 120 } },
  { id: 22, plotNumber: '21A', name: 'PLOT NO. 21A', area: '2.30acre', status: 'irrigation', crop: 'Corn', completion: 50, lastActivity: 'Tasseling stage', nextActivity: 'Pollination support', position: { x: 190, y: 250, width: 80, height: 120 } },
  { id: 19, plotNumber: '19', name: 'PLOT NO. 19', area: '2.45acre', status: 'ploughing', crop: 'Soybean', completion: 15, lastActivity: 'Residue removal', nextActivity: 'Soil conditioning', position: { x: 100, y: 380, width: 80, height: 100 } },
  { id: 20, plotNumber: '20B', name: 'PLOT NO. 20B', area: '1.84acre', status: 'fertilizing', crop: 'Vegetables', completion: 65, lastActivity: 'Nutrient deficiency detected', nextActivity: 'Balanced fertilization', position: { x: 190, y: 380, width: 80, height: 100 } },
  { id: 23, plotNumber: '20A', name: 'PLOT NO. 20A', area: '1.89acre', status: 'pest-control', crop: 'Millet', completion: 85, lastActivity: 'Integrated pest management', nextActivity: 'Harvest preparation', position: { x: 100, y: 490, width: 80, height: 90 } },
  { id: 24, plotNumber: '19A', name: 'PLOT NO. 19A', area: '1.86acre', status: 'planting', crop: 'Sugarcane', completion: 25, lastActivity: 'Seed cane preparation', nextActivity: 'Planting completion', position: { x: 190, y: 490, width: 80, height: 90 } }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'harvesting': return 'bg-yellow-500';
    case 'ploughing': return 'bg-orange-500';
    case 'irrigation': return 'bg-blue-500';
    case 'planting': return 'bg-green-500';
    case 'fertilizing': return 'bg-purple-500';
    case 'pest-control': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'harvesting': return <Wheat className="w-4 h-4" />;
    case 'irrigation': return <Droplets className="w-4 h-4" />;
    case 'planting': return <Sprout className="w-4 h-4" />;
    case 'ploughing': return <Tractor className="w-4 h-4" />;
    case 'pest-control': return <AlertTriangle className="w-4 h-4" />;
    default: return <CheckCircle className="w-4 h-4" />;
  }
};

// Enhanced Tractor SVG Component
const TractorIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 60" 
    className={className}
    fill="currentColor"
  >
    <rect x="25" y="20" width="35" height="15" rx="2" fill="#22c55e" />
    <rect x="45" y="10" width="15" height="15" rx="2" fill="#16a34a" />
    <rect x="50" y="5" width="2" height="8" fill="#374151" />
    <circle cx="20" cy="40" r="8" fill="#374151" stroke="#1f2937" strokeWidth="2" />
    <circle cx="20" cy="40" r="4" fill="#6b7280" />
    <circle cx="65" cy="42" r="12" fill="#374151" stroke="#1f2937" strokeWidth="2" />
    <circle cx="65" cy="42" r="6" fill="#6b7280" />
    <rect x="5" y="30" width="15" height="8" rx="1" fill="#dc2626" />
    <rect x="6" y="32" width="2" height="4" fill="#fbbf24" />
    <rect x="9" y="32" width="2" height="4" fill="#fbbf24" />
    <rect x="12" y="32" width="2" height="4" fill="#fbbf24" />
    <rect x="15" y="32" width="2" height="4" fill="#fbbf24" />
  </svg>
);

function InteractiveFarmMap() {
  const [hoveredPlot, setHoveredPlot] = useState<number | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<PlotData | null>(null);

  return (
    <div className="w-full bg-white rounded-lg border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">AMRIT DAIRY FARM MAP</h1>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">TOTAL AREA:</span>
                <span className="font-bold text-gray-900 text-base">44 Acre</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">PLOT AREA:</span>
                <span className="font-bold text-gray-900 text-base">40.80 Acre</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">ROAD AREA:</span>
                <span className="font-bold text-gray-900 text-base">3.20 Acre</span>
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <Badge className="border-2 border-green-500 text-green-700 bg-green-50 font-semibold px-4 py-1.5">
              Real-time Monitoring
            </Badge>
            <p className="text-sm text-gray-600 font-medium">AgriScale Management System</p>
          </div>
        </div>
      </div>
      
      <div className="relative">
        {/* Main Farm Map Container */}
        <div className="relative w-full h-[800px] bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 overflow-auto">
          
          {/* Main Road - Left side */}
          <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-b from-blue-400 via-blue-300 to-blue-400 border-r-4 border-blue-600 shadow-lg">
            <div className="h-full flex items-center justify-center">
              <div className="transform -rotate-90 text-white font-bold tracking-widest text-base drop-shadow-lg uppercase">
                Main Road
              </div>
            </div>
            {/* Road markings */}
            <div className="absolute inset-y-0 right-2 flex flex-col justify-evenly">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-2 h-8 bg-white/40 rounded-sm"></div>
              ))}
            </div>
          </div>

          {/* Activity Status Legend */}
          <div className="absolute left-6 top-6 bg-white rounded-xl shadow-2xl border-2 border-gray-200 p-5 z-30 min-w-[160px]">
            <h4 className="font-bold text-base mb-4 text-gray-900 border-b-2 border-gray-200 pb-2">Activity Status</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                <div className="w-5 h-5 bg-yellow-500 rounded-full shadow-md ring-2 ring-yellow-200"></div>
                <span className="font-medium text-gray-700 group-hover:text-gray-900">Harvesting</span>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                <div className="w-5 h-5 bg-blue-500 rounded-full shadow-md ring-2 ring-blue-200"></div>
                <span className="font-medium text-gray-700 group-hover:text-gray-900">Irrigation</span>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                <div className="w-5 h-5 bg-orange-500 rounded-full shadow-md ring-2 ring-orange-200"></div>
                <span className="font-medium text-gray-700 group-hover:text-gray-900">Ploughing</span>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                <div className="w-5 h-5 bg-green-500 rounded-full shadow-md ring-2 ring-green-200"></div>
                <span className="font-medium text-gray-700 group-hover:text-gray-900">Planting</span>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                <div className="w-5 h-5 bg-purple-500 rounded-full shadow-md ring-2 ring-purple-200"></div>
                <span className="font-medium text-gray-700 group-hover:text-gray-900">Fertilizing</span>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                <div className="w-5 h-5 bg-red-500 rounded-full shadow-md ring-2 ring-red-200"></div>
                <span className="font-medium text-gray-700 group-hover:text-gray-900">Pest Control</span>
              </div>
            </div>
          </div>

          {/* Dairy Land Section */}
          <div className="absolute bottom-24 right-24 w-96 h-40 bg-gradient-to-br from-yellow-200 via-yellow-300 to-yellow-400 border-4 border-yellow-600 rounded-xl shadow-2xl relative overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-20 h-20 border-4 border-yellow-700 rounded-full"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 border-4 border-yellow-700 rounded-full"></div>
            </div>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <h3 className="text-2xl font-bold text-yellow-900 tracking-wide mb-2 drop-shadow">DAIRY LAND</h3>
              <p className="text-yellow-800 font-semibold text-base">Processing & Storage Area</p>
            </div>
            
            {/* Compass directions around Dairy Land */}
            <div className="absolute -top-4 right-10 bg-white px-4 py-2 rounded-lg shadow-lg border-2 border-red-500">
              <span className="text-base font-bold text-red-600">N</span>
            </div>
            <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 bg-white px-4 py-2 rounded-lg shadow-lg border-2 border-gray-400">
              <span className="text-base font-bold text-gray-700">E</span>
            </div>
            <div className="absolute -bottom-4 right-10 bg-white px-4 py-2 rounded-lg shadow-lg border-2 border-gray-400">
              <span className="text-base font-bold text-gray-700">S</span>
            </div>
            <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 bg-white px-4 py-2 rounded-lg shadow-lg border-2 border-gray-400">
              <span className="text-base font-bold text-gray-700">W</span>
            </div>
          </div>

          {/* All Plot Elements */}
          {plotsData.map((plot) => (
            <motion.div
              key={plot.id}
              className={`absolute border-3 cursor-pointer transition-all duration-300 bg-white rounded-md shadow-md ${
                hoveredPlot === plot.id ? 'z-20 shadow-2xl scale-105 border-gray-800' : 'z-10 border-gray-700'
              }`}
              style={{
                left: `${plot.position.x}px`,
                top: `${plot.position.y}px`,
                width: `${plot.position.width}px`,
                height: `${plot.position.height}px`,
                borderWidth: '3px',
              }}
              onMouseEnter={() => setHoveredPlot(plot.id)}
              onMouseLeave={() => setHoveredPlot(null)}
              onClick={() => setSelectedPlot(plot)}
              whileHover={{ scale: 1.05 }}
            >
              {/* Plot Content */}
              <div className="relative w-full h-full p-3 flex flex-col justify-between">
                
                {/* Plot Header */}
                <div className="text-center mb-1">
                  <div className="font-bold text-sm text-gray-900 leading-tight">{plot.name}</div>
                  <div className="text-xs text-gray-600 font-medium mt-0.5">({plot.area})</div>
                </div>

                {/* Status Indicator Circle */}
                {plot.status !== 'idle' && (
                  <motion.div 
                    className={`absolute top-2 right-2 w-8 h-8 ${getStatusColor(plot.status)} rounded-full flex items-center justify-center text-white shadow-xl border-2 border-white`}
                    animate={{ 
                      scale: [1, 1.15, 1],
                      rotate: plot.status === 'pest-control' ? [0, 360] : [0, 0]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity 
                    }}
                  >
                    {getStatusIcon(plot.status)}
                  </motion.div>
                )}

                {/* Irrigation Animation */}
                {plot.status === 'irrigation' && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-60"
                        style={{ 
                          top: `${25 + (i % 3) * 20}%`,
                          left: `${20 + Math.floor(i / 3) * 30}%`
                        }}
                        animate={{
                          scale: [0, 1.5, 0],
                          opacity: [0, 0.8, 0]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Tractor Animation for Harvesting */}
                {plot.status === 'harvesting' && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                      className="absolute top-1/2 text-green-700"
                      style={{ transform: 'translateY(-50%)' }}
                      animate={{ 
                        x: [-20, plot.position.width - 60, plot.position.width - 60, -20],
                        rotate: [0, 0, 180, 180]
                      }}
                      transition={{ 
                        duration: 8, 
                        repeat: Infinity, 
                        ease: "linear" as const
                      }}
                    >
                      <TractorIcon className="w-8 h-6" />
                    </motion.div>
                  </div>
                )}

                {/* Ploughing Animation */}
                {plot.status === 'ploughing' && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute h-0.5 bg-orange-900 opacity-40"
                        style={{ 
                          top: `${30 + i * 20}%`,
                          left: '10%',
                          right: '10%'
                        }}
                        initial={{ scaleX: 0, originX: 0 }}
                        animate={{ 
                          scaleX: [0, 1, 1, 0],
                          originX: [0, 0, 1, 1]
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          delay: i * 0.5
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Progress and Completion */}
                {plot.status !== 'idle' && (
                  <div className="text-center mt-auto">
                    <div className="text-xs font-bold text-gray-800 mb-1.5">
                      {plot.completion}% complete
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-2.5 shadow-inner">
                      <motion.div 
                        className={`h-2.5 rounded-full ${getStatusColor(plot.status)} shadow-sm`}
                        initial={{ width: 0 }}
                        animate={{ width: `${plot.completion}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Hover Tooltip */}
              {hoveredPlot === plot.id && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-32 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white p-4 rounded-xl shadow-2xl z-50 min-w-60 border-2 border-gray-700"
                >
                  <div className="text-sm font-bold mb-2 border-b border-gray-700 pb-2">{plot.name}</div>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Crop:</span>
                      <span className="font-semibold">{plot.crop}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="font-semibold capitalize">{plot.status.replace('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last:</span>
                      <span className="font-semibold text-xs">{plot.lastActivity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Next:</span>
                      <span className="font-semibold text-xs">{plot.nextActivity}</span>
                    </div>
                  </div>
                  {/* Arrow pointing down */}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900">  <div>Next: {plot.nextActivity}</div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Plot Details Modal */}
      <AnimatePresence>
        {selectedPlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setSelectedPlot(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{selectedPlot.name}</h3>
                    <Badge className={`${getStatusColor(selectedPlot.status)} text-white`}>
                      {selectedPlot.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div><span className="font-medium">Area:</span> {selectedPlot.area}</div>
                    <div><span className="font-medium">Crop:</span> {selectedPlot.crop}</div>
                    <div><span className="font-medium">Completion:</span> {selectedPlot.completion}%</div>
                    <div><span className="font-medium">Last Activity:</span> {selectedPlot.lastActivity}</div>
                    <div><span className="font-medium">Next Activity:</span> {selectedPlot.nextActivity}</div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{selectedPlot.completion}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getStatusColor(selectedPlot.status)}`}
                          style={{ width: `${selectedPlot.completion}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FieldMonitoring({ userRole = 'farm-manager', regionFilter }: FieldMonitoringProps) {
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showAddObservationDialog, setShowAddObservationDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('monitoring');
  const [selectedFarm, setSelectedFarm] = useState('amrit-dairy');

  // Farm options
  const farmOptions = [
    { value: 'amrit-dairy', label: 'Amrit Dairy Farm', area: '44 Acre', plots: 24 },
    { value: 'green-valley', label: 'Green Valley Farm', area: '32 Acre', plots: 18 },
    { value: 'sunrise-agro', label: 'Sunrise Agro Farm', area: '56 Acre', plots: 30 },
    { value: 'golden-harvest', label: 'Golden Harvest Farm', area: '28 Acre', plots: 15 },
  ];

  // Mock field data
  const mockFields: FieldData[] = [
    {
      id: 'field-001',
      name: 'North Field A',
      location: 'Sector 1, Block A',
      area: 25.5,
      cropType: 'Wheat',
      plantingDate: '2024-10-01',
      expectedHarvestDate: '2025-03-15',
      currentStage: 'Germination',
      soilMoisture: 65,
      temperature: 24,
      humidity: 58,
      phLevel: 6.8,
      nitrogenLevel: 45,
      phosphorusLevel: 32,
      potassiumLevel: 28,
      pestActivity: 'low',
      diseaseRisk: 'low',
      irrigationStatus: 'scheduled',
      weatherCondition: 'sunny',
      lastInspection: '2024-10-01',
      nextInspection: '2024-10-05',
      healthScore: 92,
      yieldProjection: 3.2,
      alerts: [],
      observations: [
        {
          id: 'obs-001',
          date: '2024-10-01',
          type: 'Growth Assessment',
          description: 'Seeds showing good germination rate of 95%',
          severity: 'low'
        }
      ]
    },
    {
      id: 'field-002',
      name: 'South Field B',
      location: 'Sector 2, Block B',
      area: 18.3,
      cropType: 'Rice',
      plantingDate: '2024-09-15',
      expectedHarvestDate: '2025-01-20',
      currentStage: 'Vegetative',
      soilMoisture: 78,
      temperature: 26,
      humidity: 72,
      phLevel: 7.2,
      nitrogenLevel: 38,
      phosphorusLevel: 41,
      potassiumLevel: 35,
      pestActivity: 'medium',
      diseaseRisk: 'medium',
      irrigationStatus: 'active',
      weatherCondition: 'cloudy',
      lastInspection: '2024-09-30',
      nextInspection: '2024-10-03',
      healthScore: 78,
      yieldProjection: 4.1,
      alerts: ['Pest activity detected in northwest corner'],
      observations: [
        {
          id: 'obs-002',
          date: '2024-09-30',
          type: 'Pest Control',
          description: 'Brown plant hopper activity observed',
          severity: 'medium'
        }
      ]
    },
    {
      id: 'field-003',
      name: 'East Field C',
      location: 'Sector 3, Block C',
      area: 32.1,
      cropType: 'Cotton',
      plantingDate: '2024-08-20',
      expectedHarvestDate: '2024-12-10',
      currentStage: 'Flowering',
      soilMoisture: 42,
      temperature: 28,
      humidity: 45,
      phLevel: 6.5,
      nitrogenLevel: 52,
      phosphorusLevel: 29,
      potassiumLevel: 41,
      pestActivity: 'high',
      diseaseRisk: 'high',
      irrigationStatus: 'overdue',
      weatherCondition: 'sunny',
      lastInspection: '2024-09-28',
      nextInspection: '2024-10-02',
      healthScore: 65,
      yieldProjection: 2.8,
      alerts: ['Critical: Bollworm infestation detected', 'Irrigation overdue by 3 days'],
      observations: [
        {
          id: 'obs-003',
          date: '2024-09-28',
          type: 'Disease Assessment',
          description: 'Fungal infection symptoms on lower leaves',
          severity: 'high'
        }
      ]
    }
  ];

  const filteredFields = mockFields.filter(field => {
    const matchesSearch = field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         field.cropType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         field.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && field.currentStage !== 'Harvested') ||
                         (filterStatus === 'harvested' && field.currentStage === 'Harvested') ||
                         (filterStatus === 'alerts' && field.alerts.length > 0);
    
    return matchesSearch && matchesFilter;
  });

  const selectedFieldData = selectedField ? mockFields.find(f => f.id === selectedField) : null;

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIrrigationStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Field Monitoring Dashboard</h2>
          <p className="text-muted-foreground">Real-time field data and crop monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">Select Farm:</Label>
            <Select value={selectedFarm} onValueChange={setSelectedFarm}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {farmOptions.map((farm) => (
                  <SelectItem key={farm.value} value={farm.value}>
                    <div className="flex items-center justify-between w-full gap-3">
                      <span className="font-medium">{farm.label}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{farm.area}</span>
                        <span>•</span>
                        <span>{farm.plots} plots</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowAddObservationDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Observation
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monitoring">Field Monitoring</TabsTrigger>
          <TabsTrigger value="map">Interactive Map</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fields by name, crop, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="active">Active Crops</SelectItem>
                <SelectItem value="harvested">Harvested</SelectItem>
                <SelectItem value="alerts">With Alerts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFields.map((field) => (
              <Card key={field.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{field.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{field.location}</p>
                    </div>
                    <Badge className={getSeverityColor(field.pestActivity)}>
                      {field.pestActivity} pest activity
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Crop</p>
                      <p className="font-medium">{field.cropType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Area</p>
                      <p className="font-medium">{field.area} acres</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stage</p>
                      <p className="font-medium">{field.currentStage}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Health Score</p>
                      <p className={`font-medium ${getHealthScoreColor(field.healthScore)}`}>
                        {field.healthScore}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Thermometer className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">{field.temperature}°C</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">{field.soilMoisture}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Wind className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">pH {field.phLevel}</span>
                      </div>
                      <Badge className={getIrrigationStatusColor(field.irrigationStatus)}>
                        {field.irrigationStatus}
                      </Badge>
                    </div>
                  </div>

                  {field.alerts.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-red-600 font-medium">Alerts:</p>
                      {field.alerts.map((alert, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-red-600">{alert}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    className="w-full border border-gray-300 bg-white hover:bg-gray-50"
                    onClick={() => {
                      setSelectedField(field.id);
                      setShowDetailsDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="map" className="space-y-6">
          <InteractiveFarmMap />
        </TabsContent>
      </Tabs>

      {/* Field Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedFieldData?.name} - Detailed Monitoring
            </DialogTitle>
            <DialogDescription>
              Comprehensive field monitoring data including environmental conditions, crop health, and recent activities
            </DialogDescription>
          </DialogHeader>
          
          {selectedFieldData && (
            <div className="space-y-6">
              {/* Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Sprout className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Crop Health</p>
                        <p className={`text-xl font-bold ${getHealthScoreColor(selectedFieldData.healthScore)}`}>
                          {selectedFieldData.healthScore}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Yield Projection</p>
                        <p className="text-xl font-bold">{selectedFieldData.yieldProjection} tons</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Harvest</p>
                        <p className="text-sm font-medium">{new Date(selectedFieldData.expectedHarvestDate).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Environmental Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle>Environmental Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-3">
                      <Thermometer className="h-8 w-8 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Temperature</p>
                        <p className="text-lg font-semibold">{selectedFieldData.temperature}°C</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Droplets className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Soil Moisture</p>
                        <p className="text-lg font-semibold">{selectedFieldData.soilMoisture}%</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Wind className="h-8 w-8 text-gray-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Humidity</p>
                        <p className="text-lg font-semibold">{selectedFieldData.humidity}%</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Sun className="h-8 w-8 text-yellow-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Weather</p>
                        <p className="text-lg font-semibold capitalize">{selectedFieldData.weatherCondition}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Soil Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Soil Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">pH Level</p>
                      <p className="text-2xl font-bold">{selectedFieldData.phLevel}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Nitrogen (N)</p>
                      <p className="text-2xl font-bold">{selectedFieldData.nitrogenLevel}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Phosphorus (P)</p>
                      <p className="text-2xl font-bold">{selectedFieldData.phosphorusLevel}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Potassium (K)</p>
                      <p className="text-2xl font-bold">{selectedFieldData.potassiumLevel}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Observations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Observations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedFieldData.observations.map((observation) => (
                      <div key={observation.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{observation.type}</p>
                            <p className="text-sm text-muted-foreground">{observation.description}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getSeverityColor(observation.severity)}>
                              {observation.severity}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(observation.date).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Observation Dialog */}
      <Dialog open={showAddObservationDialog} onOpenChange={setShowAddObservationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Field Observation</DialogTitle>
            <DialogDescription>
              Record a new observation about field conditions, crop health, or activities
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="observation-field">Select Field</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a field" />
                </SelectTrigger>
                <SelectContent>
                  {mockFields.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="observation-type">Observation Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth">Growth Assessment</SelectItem>
                  <SelectItem value="pest">Pest Control</SelectItem>
                  <SelectItem value="disease">Disease Assessment</SelectItem>
                  <SelectItem value="irrigation">Irrigation</SelectItem>
                  <SelectItem value="harvest">Harvest</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="observation-notes">Notes</Label>
              <Textarea
                id="observation-notes"
                placeholder="Describe your observation in detail..."
                rows={4}
              />
            </div>
            <div className="flex space-x-2">
              <Button className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Add Photo
              </Button>
              <Button onClick={() => {
                setShowAddObservationDialog(false);
                // In production, this would save to database
                alert('✓ Observation saved successfully!');
              }} className="flex-1 border border-gray-300 bg-white hover:bg-gray-50">
                Save Observation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
