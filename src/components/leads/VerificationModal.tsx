import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lead } from '@/types/farm';
import { Check, X, MapPin, Phone, Droplets, FileText } from 'lucide-react';

interface VerificationModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onVerify: () => void;
  onReject: () => void;
}

const VerificationModal = ({ open, onClose, lead, onVerify, onReject }: VerificationModalProps) => {
  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Verify Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Farmer Info */}
          <div className="p-4 bg-secondary rounded-lg space-y-3">
            <h3 className="font-semibold text-lg">{lead.fullName}</h3>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{lead.phoneNumber}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{lead.village}, {lead.district}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Droplets className="w-4 h-4" />
                <span>Water: {lead.waterAvailable ? 'Available' : 'Not Available'}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>{lead.estimatedLandArea || 'N/A'} acres</span>
              </div>
            </div>

            {lead.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Notes:</span> {lead.notes}
                </p>
              </div>
            )}
          </div>

          {/* Map Preview */}
          {lead.location && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lead.location.lng},${lead.location.lat},14,0/400x200?access_token=pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example`}
                alt="Farm location"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=200&fit=crop';
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={onReject}
            >
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              className="flex-1"
              onClick={onVerify}
            >
              <Check className="w-4 h-4 mr-2" />
              Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationModal;
