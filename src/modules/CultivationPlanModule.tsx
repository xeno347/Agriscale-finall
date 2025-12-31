import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Send, Plus } from 'lucide-react';

const demoPlans = [
  {
    id: 1,
    blockName: 'Block A',
    totalArea: 10,
    masterPlanName: 'Winter Wheat Master',
    status: 'live',
  },
  {
    id: 2,
    blockName: 'Block B',
    totalArea: 8,
    masterPlanName: 'Summer Rice Master',
    status: 'live',
  },
  {
    id: 3,
    blockName: 'Block C',
    totalArea: 5,
    masterPlanName: 'Corn Rotation Master',
    status: 'live',
  },
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
                <TableHead className="w-20">Plan No.</TableHead>
                <TableHead>Block Name</TableHead>
                <TableHead>Total Area (acres)</TableHead>
                <TableHead>Master Plan Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40">Cultivation Calendar</TableHead>
                <TableHead className="w-40">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan, idx) => (
                <TableRow key={plan.id} className="hover:bg-muted transition">
                  <TableCell className="font-semibold text-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{plan.blockName}</TableCell>
                  <TableCell className="text-foreground font-semibold">{plan.totalArea}</TableCell>
                  <TableCell className="text-foreground">{plan.masterPlanName}</TableCell>
                  <TableCell>
                    {/* Live status icon */}
                    <span title="Live" className="inline-flex items-center gap-1 text-green-600 font-bold">
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="animate-pulse"><circle cx="10" cy="10" r="7" /></svg>
                      Live
                    </span>
                  </TableCell>
                  <TableCell>
                    {/* Calendar icon for cultivation calendar */}
                    <Button variant="ghost" size="icon" title="View Calendar">
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="14" height="13" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="17" y2="10" />
                      </svg>
                    </Button>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="ghost" size="icon" title="Edit">
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 2 20l.5-5L16.5 3.5z" /></svg>
                    </Button>
                    <Button variant="ghost" size="icon" title="Delete">
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
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
