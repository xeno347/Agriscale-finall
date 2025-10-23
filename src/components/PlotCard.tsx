import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

// --- THIS IS THE NEW ANIMATED PROGRESS BAR ---
const CustomProgress = ({ value, colorHex }: { value: number; colorHex: string }) => {
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      {/* The base color fill, which acts as a clipping mask */}
      <div
        className="h-2 rounded-full relative overflow-hidden" // Added relative, overflow-hidden
        style={{ width: `${value}%`, backgroundColor: colorHex }}
      >
        {/* The animated shimmer */}
        <motion.div
          className="absolute inset-0" // Fill its parent
          style={{
            background: `linear-gradient(to right, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)`,
          }}
          initial={{ x: "-100%" }} // Start off-screen to the left
          animate={{ x: "100%" }} // Animate to off-screen to the right
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 0.5, // Add a slight pause between shimmers
          }}
        />
      </div>
    </div>
  );
};
// -------------------------------------------

interface PlotCardProps {
  plotNumber: string;
  acreage: string;
  activity: string;
  completion: number;
  colorClass: string; // e.g., "bg-amber-500"
  colorHex: string; // e.g., "#f59e0b"
  Icon: LucideIcon;
}

const PlotCard = ({
  plotNumber,
  acreage,
  activity,
  completion,
  colorClass,
  colorHex,
  Icon,
}: PlotCardProps) => {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <motion.div
          className="relative rounded-lg overflow-hidden border bg-card cursor-pointer"
          whileHover={{ scale: 1.03 }}
        >
          {/* This is the GLOWING PULSE animation (from last time) */}
          <motion.div
            className="absolute inset-0 opacity-0"
            animate={{
              opacity: [0, 0.4, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            // --- FIX #1: Merged the two 'style' props ---
            style={{
              transformOrigin: "center",
              backgroundColor: colorHex,
            }}
            // ------------------------------------------
          />

          {/* This div holds the content, z-10 places it above the glow */}
          <div className="relative z-10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-foreground">
                PLOT NO. {plotNumber}
              </span>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="mb-3">
              <p className="text-xs text-muted-foreground">{acreage}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {activity.replace("-", " ")}
              </p>
            </div>
            {/* This now uses the new animated progress bar */}
            <CustomProgress value={completion} colorHex={colorHex} />
            <p className="text-center text-xs font-medium text-foreground mt-1.5">
              {completion}% complete
            </p>
          </div>
        </motion.div>
      </HoverCardTrigger>
      {/* This is the popover content */}
      <HoverCardContent className="w-60" side="right">
        <div className="space-y-2">
          <h4 className="font-semibold">Plot Status: {plotNumber}</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Activity:</span>
            <Badge className={`capitalize ${colorClass}`}>{activity.replace("-", " ")}</Badge>
          </div>
          <p className="text-sm">
            This plot is currently undergoing {activity.replace("-", " ")}.
          </p>
          <div className="pt-2">
            <p className="text-sm font-medium">Completion: {completion}%</p>
            {/* This also uses the new animated progress bar */}
            <CustomProgress value={completion} colorHex={colorHex} />
          </div>
        </div>
      </HoverCardContent> {/* <-- FIX #2: Corrected typo 'HverCardContent' */}
    </HoverCard>
  );
};

export default PlotCard;