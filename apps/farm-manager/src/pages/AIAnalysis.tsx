import React from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wand2,
  Brain,
  Stethoscope,
  Recycle,
  LayoutGrid,
  ShieldCheck,
  Search,
  Upload,
  AlertTriangle,
  AlertOctagon,
  PieChart,
  IndianRupee,
  Check,
  Droplet,
  Leaf,
  Bug,
  TrendingUp,
  BarChart,
  ClipboardList
} from "lucide-react";

// --- MOCK DATA ---

const predictionStats = [
  { title: "Avg Predicted Yield", value: "4.5 tons/hectare", icon: LayoutGrid },
  { title: "Accuracy Score", value: "86%", icon: ShieldCheck },
  { title: "Fields Analyzed", value: "3", icon: Search },
];

const yieldPredictions = [
  {
    title: "North Zone - Plot A1",
    subtitle: "Wheat • Grain Filling",
    confidence: 87,
    predictedYield: "4.2 t/ha",
    harvestDate: "20 November 2024",
    expectedYield: "4.5 t/ha",
    factors: [
      { name: "Weather Conditions", value: 85 },
      { name: "Soil Health", value: 90 },
      { name: "Irrigation Quality", value: 88 },
      { name: "Fertilization", value: 82 },
    ]
  },
  {
    title: "South Zone - Plot B2",
    subtitle: "Cotton • Flowering",
    confidence: 92,
    predictedYield: "3.8 t/ha",
    harvestDate: "15 December 2024",
    expectedYield: "3.5 t/ha",
    factors: [
      { name: "Weather Conditions", value: 90 },
      { name: "Soil Health", value: 88 },
      { name: "Irrigation Quality", value: 95 },
      { name: "Fertilization", value: 92 },
    ]
  },
  {
    title: "West Zone - Plot C1",
    subtitle: "Rice • Vegetative",
    confidence: 78,
    predictedYield: "5.5 t/ha",
    harvestDate: "10 January 2025",
    expectedYield: "6 t/ha",
    factors: [
      { name: "Weather Conditions", value: 75 },
      { name: "Soil Health", value: 82 },
      { name: "Irrigation Quality", value: 78 },
      { name: "Fertilization", value: 75 },
    ]
  },
];

const diseaseStats = [
  { title: "Active Threats", value: "3", icon: AlertTriangle, color: "text-destructive" },
  { title: "Critical Cases", value: "1", icon: AlertOctagon, color: "text-destructive" },
  { title: "Affected Area", value: "48%", icon: PieChart, color: "text-warning" },
  { title: "Est. Losses", value: "₹4.50 L", icon: IndianRupee, color: "text-destructive" },
];

const diseaseThreats = [
  {
    name: "Leaf Rust",
    location: "North Zone - Plot A1",
    severity: "medium severity",
    confidence: 84,
    affectedArea: "15%",
    detected: "4/11/2024",
    estLoss: "₹1.25 L",
    recommendations: [
      "Apply fungicide treatment within 48 hours",
      "Monitor adjacent fields for spread",
      "Increase field inspections to once daily",
      "Consider resistant varieties for next season"
    ]
  },
  {
    name: "Bollworm Infestation",
    location: "South Zone - Plot B2",
    severity: "high severity",
    confidence: 89,
    affectedArea: "25%",
    detected: "4/11/2024",
    estLoss: "₹2.80 L",
    recommendations: [
      "Immediate pesticide application required",
      "Deploy pheromone traps",
      "Scout fields for new larval stages",
      "Consider biological control agents"
    ]
  },
  {
    name: "Early Blight",
    location: "East Zone - Plot D3",
    severity: "low severity",
    confidence: 81,
    affectedArea: "8%",
    detected: "5/11/2024",
    estLoss: "₹45K",
    recommendations: [
      "Remove affected leaves",
      "Improve air circulation",
      "Apply copper-based fungicide",
      "Adjust irrigation schedule"
    ]
  }
];

const resourceStats = [
  { title: "Potential Savings", value: "₹1.09 L", icon: TrendingUp, color: "text-success" },
  { title: "Avg. Efficiency Gain", value: "25%", icon: BarChart, color: "text-blue-600" },
  { title: "Recommendations", value: "3", icon: ClipboardList, color: "text-muted-foreground" },
];

const optimizationData = [
  {
    title: "Water Optimization",
    icon: Droplet,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    savePercent: 24,
    saveValue: 195,
    currentUsage: "5000 l/hectare",
    optimizedUsage: "3800 l/hectare",
    reduction: "1200 l/hectare",
    recommendation: "Implement drip irrigation and adjust watering schedule based on soil moisture sensors.",
    steps: [
      "Install soil moisture sensors at 3 depths",
      "Set up drip irrigation lines",
      "Program irrigation controller based on sensor data",
      "Monitor water usage weekly"
    ]
  },
  {
    title: "Fertilizer Optimization",
    icon: Leaf,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    savePercent: 22,
    saveValue: 600,
    currentUsage: "250 kg/hectare",
    optimizedUsage: "195 kg/hectare",
    reduction: "55 kg/hectare",
    recommendation: "Use variable rate application based on soil testing and reduce NPK ratio in nitrogen-rich zones.",
    steps: [
      "Conduct detailed soil nutrient analysis",
      "Create application zone map",
      "Calibrate spreader for variable rates",
      "Apply fertilizer in split doses"
    ]
  },
  {
    title: "Pesticide Optimization",
    icon: Bug,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    savePercent: 28,
    saveValue: 295,
    currentUsage: "45 l/hectare",
    optimizedUsage: "32 l/hectare",
    reduction: "13 l/hectare",
    recommendation: "Adopt integrated pest management (IPM) and targeted spraying only in affected areas.",
    steps: [
      "Deploy yellow sticky traps for monitoring",
      "Identify pest hotspots",
      "Use spot spraying instead of blanket application",
      "Rotate pesticide classes to prevent resistance"
    ]
  }
];

// --- LOCAL COMPONENTS ---
const FactorProgressBar = ({ name, value }: { name: string, value: number }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-muted-foreground">{name}</span>
      <span className="font-medium">{value}%</span>
    </div>
    <Progress value={value} className="h-2" />
  </div>
);

const PredictionCard = ({ data }: { data: (typeof yieldPredictions)[0] }) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-lg">{data.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{data.subtitle}</p>
        </div>
        <Badge variant="outline" className="text-blue-600 border-blue-200">{data.confidence}% confidence</Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Predicted Yield</p>
          <p className="text-2xl font-bold text-green-600">{data.predictedYield}</p>
          <p className="text-sm text-muted-foreground mt-2">Harvest Date</p>
          <p className="text-sm font-medium">{data.harvestDate}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Expected Yield</p>
          <p className="text-2xl font-bold">{data.expectedYield}</p>
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Contributing Factors</h4>
        {data.factors.map(factor => (
          <FactorProgressBar key={factor.name} name={factor.name} value={factor.value} />
        ))}
      </div>
    </CardContent>
  </Card>
);

const DiseaseCard = ({ data }: { data: (typeof diseaseThreats)[0] }) => {
  const severityClasses = {
    "high severity": "bg-red-100 text-red-700 border-red-200",
    "medium severity": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "low severity": "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{data.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{data.location}</p>
          </div>
          <Badge variant="outline" className={severityClasses[data.severity as keyof typeof severityClasses]}>
            {data.severity} • {data.confidence}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Affected Area</p>
            <p className="text-2xl font-bold">{data.affectedArea}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Detected</p>
            <p className="text-lg font-medium">{data.detected}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Est. Loss</p>
            <p className="text-2xl font-bold text-destructive">{data.estLoss}</p>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">AI Recommendations</h4>
          <ul className="space-y-1.5">
            {data.recommendations.map((rec) => (
              <li key={rec} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-muted-foreground">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button variant="link" className="p-0">Mark as Treated</Button>
          <Button>View Treatment Plan</Button>
        </div>
      </CardContent>
    </Card>
  );
};

const OptimizationCard = ({ data }: { data: (typeof optimizationData)[0] }) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${data.iconBg}`}>
            <data.icon className={`w-5 h-5 ${data.iconColor}`} />
          </div>
          <CardTitle className="text-lg">{data.title}</CardTitle>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-200">
          Save {data.savePercent}% • ₹{data.saveValue}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Current Usage</p>
          <p className="text-2xl font-bold">{data.currentUsage.split(' ')[0]}</p>
          <p className="text-xs text-muted-foreground">{data.currentUsage.split(' ')[1]}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Optimized Usage</p>
          <p className="text-2xl font-bold text-green-600">{data.optimizedUsage.split(' ')[0]}</p>
          <p className="text-xs text-muted-foreground">{data.optimizedUsage.split(' ')[1]}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Reduction</p>
          <p className="text-2xl font-bold text-green-600">{data.reduction.split(' ')[0]}</p>
          <p className="text-xs text-muted-foreground">{data.reduction.split(' ')[1]}</p>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium">AI Recommendation</h4>
        <p className="text-sm text-muted-foreground mb-4">{data.recommendation}</p>
        <h4 className="text-sm font-medium">Implementation Steps</h4>
        <ol className="list-decimal list-inside space-y-1.5 mt-2 text-sm text-muted-foreground">
          {data.steps.map(step => <li key={step}>{step}</li>)}
        </ol>
      </div>
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <Button variant="link" className="p-0">View Details</Button>
        <Button>Implement Plan</Button>
      </div>
    </CardContent>
  </Card>
);

// --- MAIN PAGE COMPONENT ---
const AIAnalysis = () => {
  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Analysis & Insights</h1>
          <p className="text-muted-foreground">
            AI-powered insights and predictions for better farm management
          </p>
        </div>
        <Button variant="outline" className="gap-2 shrink-0 mt-4 md:mt-0 w-full md:w-auto">
          <Wand2 className="w-4 h-4 text-primary" />
          AI Powered
        </Button>
      </div>

      <Tabs defaultValue="yield-prediction">
        <TabsList className="mb-6">
          <TabsTrigger value="yield-prediction" className="gap-2">
            <Brain className="w-4 h-4" /> Yield Prediction
          </TabsTrigger>
          <TabsTrigger value="disease-detection" className="gap-2">
            <Stethoscope className="w-4 h-4" /> Disease Detection
          </TabsTrigger>
          <TabsTrigger value="resource-optimization" className="gap-2">
            <Recycle className="w-4 h-4" /> Resource Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="yield-prediction" className="space-y-6">
          <Card className="bg-secondary border-border">
            <CardContent className="p-4 text-sm text-muted-foreground">
              AI-powered yield predictions based on historical data, current weather patterns, soil conditions, and crop health monitoring.
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {predictionStats.map(stat => (
              <Card key={stat.title}>
                <CardContent className="p-4 pt-6 flex items-center gap-4">
                  <stat.icon className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {yieldPredictions.map(data => <PredictionCard key={data.title} data={data} />)}
          </div>
        </TabsContent>

        <TabsContent value="disease-detection" className="space-y-6">
          <Card className="bg-secondary border-border">
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Upload photos of leaves or crops for instant AI-powered disease identification and treatment recommendations.
              </p>
              <Button variant="outline" className="gap-2 w-full md:w-auto">
                <Upload className="w-4 h-4" /> Upload Image
              </Button>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {diseaseStats.map(stat => (
              <Card key={stat.title}>
                <CardContent className="p-4 pt-6">
                  <stat.icon className={`w-6 h-6 mb-2 ${stat.color}`} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-6">
            {diseaseThreats.map(data => <DiseaseCard key={data.name} data={data} />)}
          </div>
        </TabsContent>

        <TabsContent value="resource-optimization" className="space-y-6">
          <Card className="bg-secondary border-border">
            <CardContent className="p-4 text-sm text-muted-foreground">
              AI analyzes usage patterns and provides data-driven recommendations to optimize resource consumption and reduce costs.
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resourceStats.map(stat => (
              <Card key={stat.title}>
                <CardContent className="p-4 pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-6">
            {optimizationData.map(data => <OptimizationCard key={data.title} data={data} />)}
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default AIAnalysis;
