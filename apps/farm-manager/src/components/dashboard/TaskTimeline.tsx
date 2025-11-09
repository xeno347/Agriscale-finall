import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  CheckCircle, 
  Loader2, 
  Circle, 
  MapPin, 
  Coffee, 
  Briefcase,
  ListChecks,
  AlertTriangle
} from "lucide-react";

// --- MOCK DATA ---
const mockTimelineData = [
  {
    id: 1,
    time: "08:00 AM",
    title: "Morning Briefing",
    location: "Main Office",
    status: "completed",
    icon: Briefcase,
  },
  {
    id: 2,
    time: "09:00 AM",
    title: "Field Inspection - Plot A1",
    location: "North Zone",
    status: "in-progress",
    icon: ListChecks,
  },
  {
    id: 3,
    time: "11:00 AM",
    title: "Check Irrigation System",
    location: "Plot A1, North Zone",
    status: "pending",
    icon: Loader2, // Using Loader2 as a placeholder for irrigation
  },
  {
    id: 4,
    time: "12:30 PM",
    title: "Lunch Break",
    location: "Canteen",
    status: "pending",
    icon: Coffee,
  },
  {
    id: 5,
    time: "02:00 PM",
    title: "Pest Control Audit",
    location: "South Zone",
    status: "pending",
    icon: AlertTriangle,
  },
];

// --- TYPE DEFINITIONS ---
type TaskStatus = "pending" | "in-progress" | "completed";
type TaskTimelineItemProps = {
  id: number;
  time: string;
  title: string;
  location: string;
  status: TaskStatus;
  icon: React.ElementType;
  isLast?: boolean;
};

// --- TIMELINE ITEM SUB-COMPONENT ---
const TaskTimelineItem = ({ time, title, location, status, icon: Icon, isLast }: TaskTimelineItemProps) => {
  
  const getStatusInfo = () => {
    switch (status) {
      case 'completed':
        return { 
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          badge: <Badge variant="success">Completed</Badge> 
        };
      case 'in-progress':
        return { 
          icon: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />, 
          badge: <Badge variant="default" className="bg-blue-500">In Progress</Badge> 
        };
      case 'pending':
      default:
        return { 
          icon: <Circle className="h-4 w-4 text-muted-foreground" />,
          badge: <Badge variant="outline">Pending</Badge> 
        };
    }
  };

  const { icon: statusIcon, badge } = getStatusInfo();

  return (
    <div className="flex gap-4">
      {/* 1. Time Column */}
      <div className="w-20 text-right pt-1.5">
        <p className="font-medium text-sm">{time}</p>
      </div>

      {/* 2. Separator Column */}
      <div className="relative w-8 flex-shrink-0 flex justify-center">
        {/* The Track Line (drawn by the item) */}
        {!isLast && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 h-full w-0.5 bg-border" />
        )}
        
        {/* The Node/Icon */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center z-10 bg-background",
          status === 'in-progress' && "ring-4 ring-blue-100 dark:ring-blue-900"
        )}>
          {statusIcon}
        </div>
      </div>

      {/* 3. Content Column */}
      <div className="flex-1 pb-10">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Icon className="w-3 h-3" /> {location}
        </p>
        <div className="mt-2">{badge}</div>
      </div>
    </div>
  );
};

// --- MAIN TIMELINE COMPONENT ---
export const TaskTimeline = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Task Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {mockTimelineData.map((task, index) => (
            <TaskTimelineItem 
              key={task.id}
              {...task}
              isLast={index === mockTimelineData.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};