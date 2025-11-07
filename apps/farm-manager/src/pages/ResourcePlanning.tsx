import React from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  LineChart,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Search,
  Plus,
  Download,
  Leaf,
  Tractor,
  Users,
  Wrench,
  Bug,
  UserCheck,
  Check,
  X,
  Zap, // ✅ FIXED: Added missing import
} from "lucide-react";

// --- LOCAL COMPONENTS ---

// 1. Stat Card (for Tab 1)
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconColorClass?: string;
}
const StatCard = ({ title, value, icon: Icon, iconColorClass = "text-muted-foreground" }: StatCardProps) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className="p-3 bg-secondary rounded-lg">
        <Icon className={`w-5 h-5 ${iconColorClass}`} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// 2. Budget Card (for Tab 2)
interface BudgetCardProps {
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  zone: string;
  manager: string;
  status: 'active' | 'exhausted';
  allocated: string;
  spent: string;
  remaining: string;
  utilization: number;
  period: string;
}
const BudgetCard = (props: BudgetCardProps) => {
  const barClass = props.utilization > 90 ? "[&>div]:bg-red-600" :
                   props.utilization < 70 ? "[&>div]:bg-green-600" : "";
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${props.iconBg}`}>
              <props.icon className={`w-5 h-5 ${props.iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{props.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{props.zone} • {props.manager}</p>
            </div>
          </div>
          <Badge variant={props.status === 'active' ? 'success' : 'destructive'}>
            {props.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Allocated</p>
            <p className="text-lg font-bold">{props.allocated}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="text-lg font-bold">{props.spent}</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${props.remaining === '₹0' ? 'text-destructive' : ''}`}>
              {props.remaining}
            </p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Budget Utilization</span>
            <span>{props.utilization}%</span>
          </div>
          <Progress value={props.utilization} className={cn("h-2", barClass)} />
        </div>

        <p className="text-xs text-muted-foreground mt-4 border-t pt-2">
          Period: {props.period}
        </p>
      </CardContent>
    </Card>
  );
};

// 3. Request Card (for Tab 3)
interface RequestCardProps {
  title: string;
  icon: React.ElementType;
  requestedBy: string;
  zone: string;
  priority: 'high' | 'medium' | 'emergency';
  status: 'pending' | 'approved' | 'fulfilled';
  quantity: number;
  unit: string;
  purpose: string;
  justification: string;
  requiredDate: string;
  estCost: string;
  requestDate: string;
  approvalNote?: string;
}
const RequestCard = (props: RequestCardProps) => {
  const priorityBadges: Record<typeof props.priority, 'destructive' | 'warning' | 'default'> = {
    emergency: 'destructive',
    high: 'warning',
    medium: 'default',
  };
  const statusBadges: Record<typeof props.status, 'warning' | 'success' | 'default'> = {
    pending: 'warning',
    approved: 'success',
    fulfilled: 'default',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">
              <props.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{props.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Requested by {props.requestedBy} • {props.zone}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={priorityBadges[props.priority]}>{props.priority}</Badge>
            <Badge variant={statusBadges[props.status]}>{props.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="font-medium">{props.quantity} {props.unit}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Required Date</p>
            <p className="font-medium">{props.requiredDate}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Est. Cost</p>
            <p className="font-medium">{props.estCost}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Request Date</p>
            <p className="font-medium">{props.requestDate}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Purpose</p>
            <p className="font-medium">{props.purpose}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Justification</p>
            <p className="font-medium">{props.justification}</p>
          </div>
        </div>

        {props.approvalNote && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
            {props.approvalNote}
          </div>
        )}

        {props.status === 'pending' && (
          <div className="flex gap-2 justify-end mt-4 border-t pt-4">
            <Button variant="outline">Reject</Button>
            <Button>Approve</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- MOCK DATA ---

// Tab 1: Allocations
const resourceStats = [
  { title: "Active Allocations", value: "3", icon: LineChart, iconColorClass: "text-blue-600" },
  { title: "Total Budget", value: "₹28.50 L", icon: IndianRupee, iconColorClass: "text-green-600" },
  { title: "Budget Utilized", value: "86%", icon: TrendingUp, iconColorClass: "text-yellow-600" },
  { title: "Pending Requests", value: "1", icon: AlertTriangle, iconColorClass: "text-destructive" },
];

// Tab 2: Budget Management
const budgetData: BudgetCardProps[] = [
  { title: "Seeds", icon: Leaf, iconBg: "bg-green-100", iconColor: "text-green-600", zone: "North Zone", manager: "Rajesh Kumar", status: "active", allocated: "₹5.00 L", spent: "₹3.20 L", remaining: "₹1.80 L", utilization: 64, period: "October 2024" },
  { title: "Fertilizers", icon: Zap, iconBg: "bg-orange-100", iconColor: "text-orange-600", zone: "South Zone", manager: "Priya Sharma", status: "active", allocated: "₹7.50 L", spent: "₹6.80 L", remaining: "₹70K", utilization: 91, period: "October 2024" },
  { title: "Equipment", icon: Tractor, iconBg: "bg-blue-100", iconColor: "text-blue-600", zone: "West Zone", manager: "Amit Patel", status: "exhausted", allocated: "₹12.00 L", spent: "₹12.00 L", remaining: "₹0", utilization: 100, period: "October 2024" },
  { title: "Labor", icon: Users, iconBg: "bg-purple-100", iconColor: "text-purple-600", zone: "East Zone", manager: "Sunita Devi", status: "active", allocated: "₹4.00 L", spent: "₹2.50 L", remaining: "₹1.50 L", utilization: 63, period: "October 2024" },
];

// Tab 3: Resource Requests
const requestData: RequestCardProps[] = [
  { title: "Combine Harvester", icon: Wrench, requestedBy: "Rajesh Kumar", zone: "North Zone", priority: "high", status: "pending", quantity: 1, unit: "unit", purpose: "Wheat harvesting", justification: "Current harvester under maintenance, urgent replacement needed", requiredDate: "5/10/2024", estCost: "₹3K", requestDate: "1/10/2024" },
  { title: "Pesticide - Chlorpyrifos", icon: Bug, requestedBy: "Priya Sharma", zone: "South Zone", priority: "emergency", status: "approved", quantity: 50, unit: "litres", purpose: "Pest outbreak control", justification: "Severe pest attack detected, immediate intervention required", requiredDate: "3/10/2024", estCost: "₹43K", requestDate: "2/10/2024", approvalNote: "Approved by Farm Manager on 2/10/2024" },
  { title: "Skilled Technicians", icon: UserCheck, requestedBy: "Amit Patel", zone: "West Zone", priority: "medium", status: "fulfilled", quantity: 5, unit: "workers", purpose: "Drip irrigation system installation", justification: "New field expansion requires irrigation setup", requiredDate: "7/10/2024", estCost: "₹15K", requestDate: "30/9/2024" },
];

// --- MAIN PAGE COMPONENT ---
const ResourcePlanning = () => {
  return (
    <PageLayout>
      <PageHeader 
        title="Resource Planning"
        description="Manage field managers and regional operations across all zones"
      />
      
      <Tabs defaultValue="allocations">
        <TabsList className="mb-4">
          <TabsTrigger value="allocations">Resource Allocations</TabsTrigger>
          <TabsTrigger value="budget">Budget Management</TabsTrigger>
          <TabsTrigger value="requests">Resource Requests</TabsTrigger>
        </TabsList>

        {/* TAB 1 */}
        <TabsContent value="allocations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {resourceStats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </div>
          
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-auto md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search resources..." className="pl-9 w-full" />
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Select>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="labor">Labor</SelectItem>
                    <SelectItem value="materials">Materials</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="gap-2 w-full md:w-auto">
                  <Plus className="w-4 h-4" />
                  New Allocation
                </Button>
                <Button variant="outline" className="gap-2 w-full md:w-auto">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              A table or list of all active resource allocations (e.g., "Tractor 1 to North Zone") would go here.
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2 */}
        <TabsContent value="budget" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Budget Management</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Allocate Budget
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {budgetData.map((data) => <BudgetCard key={data.title} {...data} />)}
          </div>
        </TabsContent>

        {/* TAB 3 */}
        <TabsContent value="requests" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Resource Requests</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          </div>
          <div className="space-y-4">
            {requestData.map((data) => <RequestCard key={data.title} {...data} />)}
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default ResourcePlanning;
