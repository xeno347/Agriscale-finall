import { useState } from 'react';
import { Farmer } from '@/types/farm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, MapPin, Phone, FileCheck, Map, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FarmerCardProps {
  farmer: Farmer;
}

const FarmerCard = ({ farmer }: FarmerCardProps) => {
  const [landMappingOpen, setLandMappingOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [agreementsOpen, setAgreementsOpen] = useState(false);

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-lg transition-shadow duration-300 animate-slide-up">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary flex-shrink-0">
              {farmer.profileImageUrl ? (
                <img
                  src={farmer.profileImageUrl}
                  alt={farmer.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
                  {farmer.fullName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-lg truncate">{farmer.fullName}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Phone className="w-3.5 h-3.5" />
                <span>{farmer.phoneNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{farmer.village}, {farmer.district}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Sections */}
        <div className="divide-y divide-border">
          {/* Land Mapping */}
          <Collapsible open={landMappingOpen} onOpenChange={setLandMappingOpen}>
            <CollapsibleTrigger className="w-full px-5 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                  <Map className="w-4 h-4 text-info" />
                </div>
                <span className="font-medium text-sm">Land Mapping</span>
                {farmer.landMapping && (
                  <Badge variant="secondary" className="text-xs">
                    {farmer.landMapping.totalArea} acres
                  </Badge>
                )}
              </div>
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform duration-200',
                  landMappingOpen && 'rotate-90'
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {farmer.landMapping && (
                <div className="px-5 pb-4 space-y-3">
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={farmer.landMapping.satelliteImageUrl}
                      alt="Farm satellite view"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 bg-secondary rounded-lg">
                      <span className="text-muted-foreground">Soil Type</span>
                      <p className="font-medium">{farmer.landMapping.soilType || 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-secondary rounded-lg">
                      <span className="text-muted-foreground">Irrigation</span>
                      <p className="font-medium">{farmer.landMapping.irrigationType || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* KYC */}
          <Collapsible open={kycOpen} onOpenChange={setKycOpen}>
            <CollapsibleTrigger className="w-full px-5 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    farmer.kyc?.verified ? 'bg-success/10' : 'bg-warning/10'
                  )}
                >
                  <FileCheck
                    className={cn(
                      'w-4 h-4',
                      farmer.kyc?.verified ? 'text-success' : 'text-warning'
                    )}
                  />
                </div>
                <span className="font-medium text-sm">KYC</span>
                {farmer.kyc?.verified ? (
                  <Badge className="bg-success/10 text-success border-success/20 text-xs">
                    Verified
                  </Badge>
                ) : (
                  <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">
                    Pending
                  </Badge>
                )}
              </div>
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform duration-200',
                  kycOpen && 'rotate-90'
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {farmer.kyc && (
                <div className="px-5 pb-4 space-y-2">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-secondary rounded-lg">
                      <span className="text-muted-foreground">Aadhaar</span>
                      <span className="font-medium">{farmer.kyc.aadhaarNumber}</span>
                    </div>
                    {farmer.kyc.panNumber && (
                      <div className="flex justify-between p-2 bg-secondary rounded-lg">
                        <span className="text-muted-foreground">PAN</span>
                        <span className="font-medium">{farmer.kyc.panNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between p-2 bg-secondary rounded-lg">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium">{farmer.kyc.bankName}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-secondary rounded-lg">
                      <span className="text-muted-foreground">Account</span>
                      <span className="font-medium">{farmer.kyc.accountNumber}</span>
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Agreements */}
          <Collapsible open={agreementsOpen} onOpenChange={setAgreementsOpen}>
            <CollapsibleTrigger className="w-full px-5 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium text-sm">Agreements</span>
                <Badge variant="secondary" className="text-xs">
                  {farmer.agreements.length}
                </Badge>
              </div>
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform duration-200',
                  agreementsOpen && 'rotate-90'
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-5 pb-4 space-y-2">
                {farmer.agreements.length > 0 ? (
                  farmer.agreements.map(agreement => (
                    <div
                      key={agreement.id}
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium">{agreement.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(agreement.signedDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg text-muted-foreground">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm">No agreements yet</span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
};

export default FarmerCard;
