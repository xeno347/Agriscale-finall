import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Award } from 'lucide-react';

// Define a type for the component's props
export type PerformanceData = {
  id: string;
  initials: string;
  name: string;
  tasksCompleted: number;
  rating: number;
  metrics: {
    label: string;
    value: number;
    isProgress?: boolean; // To show a progress bar
  }[];
  tasksDone: number;
};

interface PerformanceCardProps {
  data: PerformanceData;
}

export const PerformanceCard = ({ data }: PerformanceCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-muted text-muted-foreground">
                {data.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{data.name}</h3>
              <p className="text-sm text-muted-foreground">
                {data.tasksCompleted} tasks completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-lg font-bold">
            <Award className="w-5 h-5 text-yellow-500" />
            <span>{data.rating.toFixed(1)}/5</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 mb-4">
          {data.metrics.map((metric) => (
            <div key={metric.label}>
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs text-muted-foreground">{metric.label}</span>
                <span className="text-sm font-medium">{metric.value}%</span>
              </div>
              <Progress value={metric.value} className="h-2" />
            </div>
          ))}
        </div>

        {/* Tasks Done */}
        <div className="border-t pt-4 text-right">
          <p className="text-xs text-muted-foreground">Tasks Done</p>
          <p className="text-3xl font-bold">{data.tasksDone}</p>
        </div>
      </CardContent>
    </Card>
  );
};