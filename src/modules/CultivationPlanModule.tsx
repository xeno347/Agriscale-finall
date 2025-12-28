import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Send, Plus } from 'lucide-react';

const demoPlans = [
  { id: 1, name: 'Winter Wheat', land: 10, startDate: '2025-12-15' },
  { id: 2, name: 'Summer Rice', land: 8, startDate: '2026-01-10' },
  { id: 3, name: 'Corn Rotation', land: 5, startDate: '2026-02-01' },
];

export default function CultivationPlanModule() {
  const [plans] = useState(demoPlans);
  const navigate = useNavigate();
  const totalLand = 30; // demo
  const plannedLand = plans.reduce((sum, p) => sum + p.land, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-foreground">Cultivation Plan</h1>
          <p className="text-muted-foreground">Click on <span className='font-semibold'>+ Add planer</span> to create new plan</p>
        </div>
        <Button className="gap-2" size="lg" onClick={() => navigate("/cultivation-plan/create")}>
          <Plus className="h-5 w-5" />
          Add Planer
        </Button>
      </div>
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Total Land</CardTitle>
            <CardDescription>All available land (acres)</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-foreground">{totalLand} <span className="text-base font-medium">acres</span></span>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Planned Land</CardTitle>
            <CardDescription>Land already planned (acres)</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-foreground">{plannedLand} <span className="text-base font-medium">acres</span></span>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-lg font-semibold text-foreground">Plan List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20">Plan No</TableHead>
                <TableHead>Plan Name</TableHead>
                <TableHead>Land (acres)</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead className="w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan, idx) => (
                <TableRow key={plan.id} className="hover:bg-muted transition">
                  <TableCell className="font-semibold text-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="text-foreground font-semibold">{plan.land}</TableCell>
                  <TableCell className="text-muted-foreground">{plan.startDate}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Send className="h-4 w-4" /> Send
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
