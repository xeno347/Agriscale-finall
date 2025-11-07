import React from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // Make sure to import cn (or similar utility)

// --- MOCK DATA ---
const performanceRankings = [
  {
    rank: 1,
    name: "Amit Patel",
    zone: "West Zone",
    score: 95,
    fieldsManaged: 20,
  },
  {
    rank: 2,
    name: "Rajesh Kumar",
    zone: "North Zone",
    score: 92,
    fieldsManaged: 25,
  },
  {
    rank: 3,
    name: "Priya Sharma",
    zone: "South Zone",
    score: 88,
    fieldsManaged: 30,
  },
  {
    rank: 4,
    name: "Sunita Devi",
    zone: "East Zone",
    score: 85,
    fieldsManaged: 18,
  },
];

// --- LOCAL COMPONENTS ---
interface RankingItemProps {
  rank: number;
  name: string;
  zone: string;
  score: number;
  fieldsManaged: number;
}

const RankingItem = ({ rank, name, zone, score, fieldsManaged }: RankingItemProps) => {
  const rankColors = [
    "bg-yellow-400 text-yellow-900", // Rank 1
    "bg-gray-300 text-gray-800",      // Rank 2
    "bg-yellow-600 text-yellow-100",  // Rank 3 (Bronze)
    "bg-gray-200 text-gray-700",      // Rank 4+
  ];

  const scoreColors = [
    "text-green-600", // Rank 1
    "text-green-600", // Rank 2
    "text-yellow-600", // Rank 3
    "text-yellow-600", // Rank 4+
  ];

  const rankColor = rankColors[rank - 1] || rankColors[3];
  const scoreColor = scoreColors[rank - 1] || scoreColors[3];

  return (
    <div className="flex items-center gap-4 py-4 px-2 border-b last:border-b-0">
      {/* Rank Circle */}
      <div 
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
          rankColor
        )}
      >
        {rank}
      </div>

      {/* Name and Zone */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{name}</p>
        <p className="text-sm text-muted-foreground truncate">{zone}</p>
      </div>

      {/* Score and Fields */}
      <div className="text-right shrink-0">
        <p className={cn("text-2xl font-bold", scoreColor)}>
          {score}%
        </p>
        <p className="text-xs text-muted-foreground">
          {fieldsManaged} fields managed
        </p>
      </div>
    </div>
  );
};


// --- MAIN PAGE COMPONENT ---

const PerformanceReview = () => {
  return (
    <PageLayout>
      <PageHeader 
        title="Performance Review"
        description="Manage field managers and regional operations across all zones"
      />
      
      <h2 className="text-2xl font-semibold mb-4">Performance Review</h2>

      <Card>
        <CardHeader>
          <CardTitle>Field Manager Performance Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {performanceRankings.map((manager) => (
              <RankingItem key={manager.rank} {...manager} />
            ))}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default PerformanceReview;