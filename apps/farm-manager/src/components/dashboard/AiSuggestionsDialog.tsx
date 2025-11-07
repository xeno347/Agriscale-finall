import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, User, Calendar, MapPin, BarChart } from "lucide-react";

interface AiSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Local component for the suggestion card
const SuggestionCard = ({ title, confidence, reason, tags, plot, assignees, dueDate, onAccept }: any) => (
  <div className="border rounded-lg p-4 space-y-3">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">Based on weather patterns, prepare wheat fields...</p>
      </div>
      <div className="text-right">
        <Badge>{confidence}% confidence</Badge>
        <Button size="sm" className="mt-2">Accept</Button>
      </div>
    </div>
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {plot}</div>
      <div className="flex items-center gap-1"><User className="w-4 h-4" /> {assignees}</div>
      <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Due: {dueDate}</div>
    </div>
    <div className="p-3 bg-secondary rounded-md space-y-2">
      <h4 className="font-semibold text-sm">AI Reasoning:</h4>
      <p className="text-sm text-muted-foreground">{reason}</p>
      <div className="flex gap-2 pt-2">
        {tags.map((tag: any) => <Badge key={tag.name} variant="outline" className={tag.type === 'weather' ? 'border-blue-300 text-blue-600' : ''}>{tag.name}</Badge>)}
      </div>
    </div>
  </div>
);

export const AiSuggestionsDialog = ({ open, onOpenChange }: AiSuggestionsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            AI Task Suggestions
          </DialogTitle>
          <DialogDescription>
            Intelligent task recommendations based on weather, seasonal patterns, and farm analytics
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4 py-4">
            <SuggestionCard 
              title="Pre-Winter Wheat Field Preparation"
              confidence={89}
              reason="Weather forecast shows ideal conditions for the next 5 days. Historical data indicates 23% better yield when preparation starts early."
              tags={[{name: "Urgency: 88%", type: ""}, {name: "Seasonal: 96%", type: ""}, {name: "Impact: High", type: ""}, {name: "Weather Factor", type: "weather"}]}
              plot="Plot A-1 (Wheat)"
              assignees="3 Days"
              dueDate="12/10/2024"
            />
            <SuggestionCard 
              title="Cotton Pest Monitoring & Treatment"
              confidence={94}
              reason="Recent climate conditions favor cotton bollworm development. Immediate monitoring and targeted treatment recommended for cotton plots."
              tags={[{name: "Urgent", type: ""}, {name: "Pest: 92%", type: ""}, {name: "Impact: Critical", type: ""}]}
              plot="Plot B-2 (Cotton)"
              assignees="2 Days"
              dueDate="10/10/2024"
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};