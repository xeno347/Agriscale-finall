import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Undo2, Trash2, Check, MousePointer2, Info } from 'lucide-react';

interface LandMappingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (coordinates: { lat: number; lng: number }[]) => void;
}

interface Point {
  x: number;
  y: number;
  lat: number;
  lng: number;
}

const LandMappingModal = ({ open, onClose, onComplete }: LandMappingModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Simulated map center (India)
  const mapCenter = { lat: 22.5726, lng: 78.9629 };
  
  const pixelToLatLng = (x: number, y: number, canvas: HTMLCanvasElement) => {
    const scale = 0.0001; // Rough scale for demo
    return {
      lat: mapCenter.lat + (canvas.height / 2 - y) * scale,
      lng: mapCenter.lng + (x - canvas.width / 2) * scale,
    };
  };

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw satellite-like background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#2d5016');
    gradient.addColorStop(0.3, '#3d6b1f');
    gradient.addColorStop(0.5, '#4a7c23');
    gradient.addColorStop(0.7, '#3d6b1f');
    gradient.addColorStop(1, '#2d5016');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add texture/noise for satellite effect
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 3 + 1;
      const alpha = Math.random() * 0.3;
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'}, ${alpha})`;
      ctx.fillRect(x, y, size, size);
    }

    // Draw field patterns
    ctx.strokeStyle = 'rgba(34, 139, 34, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw polygon if points exist
    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((point, index) => {
        if (index > 0) {
          ctx.lineTo(point.x, point.y);
        }
      });

      if (isComplete && points.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
        ctx.fill();
      }

      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw points
      points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, hoveredPoint === index ? 10 : 8, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? '#f59e0b' : '#22c55e';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${index + 1}`, point.x, point.y + 4);
      });
    }

    // Draw instruction
    if (!isComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, canvas.height - 40, 300, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      const instruction = points.length === 0 
        ? 'Click to place first point' 
        : points.length < 3 
          ? `Place ${3 - points.length} more point(s) minimum`
          : 'Click first point (orange) to close boundary';
      ctx.fillText(instruction, 20, canvas.height - 20);
    }
  }, [points, isComplete, hoveredPoint]);

  useEffect(() => {
    if (open) {
      setPoints([]);
      setIsComplete(false);
    }
  }, [open]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isComplete) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on first point to close
    if (points.length >= 3) {
      const firstPoint = points[0];
      const distance = Math.sqrt((x - firstPoint.x) ** 2 + (y - firstPoint.y) ** 2);
      if (distance < 15) {
        setIsComplete(true);
        return;
      }
    }

    const coords = pixelToLatLng(x, y, canvas);
    setPoints(prev => [...prev, { x, y, ...coords }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isComplete) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check hover on first point
    if (points.length >= 3) {
      const firstPoint = points[0];
      const distance = Math.sqrt((x - firstPoint.x) ** 2 + (y - firstPoint.y) ** 2);
      setHoveredPoint(distance < 15 ? 0 : null);
    }
  };

  const handleUndo = () => {
    if (isComplete) {
      setIsComplete(false);
    } else {
      setPoints(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setPoints([]);
    setIsComplete(false);
  };

  const handleConfirm = () => {
    if (isComplete && points.length >= 3) {
      onComplete(points.map(p => ({ lat: p.lat, lng: p.lng })));
      onClose();
    }
  };

  const calculateArea = () => {
    if (points.length < 3) return 0;
    // Shoelace formula for polygon area (simplified)
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    // Convert to approximate acres (very rough estimate for demo)
    return Math.abs(area / 2 / 1000).toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Land Mapping - Draw Farm Boundary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-3 bg-info/10 rounded-lg border border-info/20">
            <Info className="w-5 h-5 text-info mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Click on the map to place boundary points. Place at least 3 points, then click the first point (orange) to close the boundary.
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={points.length === 0}
                className="gap-1"
              >
                <Undo2 className="w-4 h-4" />
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={points.length === 0}
                className="gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </Button>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Points: <span className="font-semibold text-foreground">{points.length}</span>
              </span>
              {isComplete && (
                <span className="text-muted-foreground">
                  Est. Area: <span className="font-semibold text-primary">{calculateArea()} acres</span>
                </span>
              )}
            </div>
          </div>

          {/* Map Canvas */}
          <div className="relative border-2 border-border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={750}
              height={450}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              className={`w-full cursor-${isComplete ? 'default' : 'crosshair'}`}
              style={{ cursor: isComplete ? 'default' : 'crosshair' }}
            />
            
            {/* Status Overlay */}
            {isComplete && (
              <div className="absolute top-4 right-4 bg-success text-success-foreground px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />
                Boundary Complete
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Start Point</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Boundary Point</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!isComplete}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              Confirm Mapping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LandMappingModal;
