/**
 * RateCardStandalone.tsx
 * 
 * A self-contained Rate Card component for Farmer Services.
 * Contains all types, dummy data, and sub-components in a single file.
 * 
 * Dependencies required:
 * - @radix-ui/react-dialog
 * - @radix-ui/react-select
 * - @radix-ui/react-switch
 * - lucide-react
 * - tailwindcss
 * - shadcn/ui components (Button, Input, Card, Badge, Dialog, Select, Switch, Label, Textarea)
 */

import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { getBaseUrl } from '@/lib/config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tractor,
  Truck,
  Wrench,
  IndianRupee,
  Clock,
  FileText,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  Zap,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type ServiceCategory = 'cultivation' | 'logistics' | 'others';

export type PerUnit = 'per_acre' | 'per_hour' | 'per_day' | 'per_trip' | 'per_load' | 'per_kg';

export type ActivityType =
  | 'ploughing'
  | 'interweeding'
  | 'mulching'
  | 'soil_pulverization'
  | 'harrowing'
  | 'seeding'
  | 'spraying'
  | 'harvesting'
  | 'transportation'
  | 'loading_unloading';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  perUnit: PerUnit;
  activity: ActivityType;
  basePrice: number;
  includesGST: boolean;
  note: string;
  isLive: boolean;
  createdAt: Date;
  timeline?: {
    applicationStartDate?: Date;
    applicationEndDate?: Date;
    rentalStartDate?: Date;
    rentalEndDate?: Date;
  };
}

type RateCardApiItem = {
  activity?: string;
  service_name?: string;
  Note?: string;
  billing_unit?: string;
  created_at?: string;
  inclusive_GST?: boolean;
  base_price?: number;
  status?: string;
  rental_id?: string;
  category?: string;
  timeline?: Array<{
    application_start_date?: string;
    application_end_date?: string;
    rental_start_date?: string;
    rental_end_date?: string;
  }>;
};

function parseDateOrUndefined(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d;

  // Fallback for strict YYYY-MM-DD parsing
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (match) {
    const d2 = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(d2.getTime())) return d2;
  }
  return undefined;
}

// ============================================
// DUMMY DATA
// ============================================

const dummyServices: Service[] = [
  {
    id: '1',
    name: 'Premium Ploughing Service',
    category: 'cultivation',
    perUnit: 'per_acre',
    activity: 'ploughing',
    basePrice: 2500,
    includesGST: true,
    note: '20% discount on orders above 10 acres. Includes deep soil turning.',
    isLive: true,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Interweeding Package',
    category: 'cultivation',
    perUnit: 'per_acre',
    activity: 'interweeding',
    basePrice: 1800,
    includesGST: false,
    note: 'Best for row crops. Mechanical weeding between crop rows.',
    isLive: true,
    createdAt: new Date('2024-02-10'),
  },
  {
    id: '3',
    name: 'Soil Pulverization Service',
    category: 'cultivation',
    perUnit: 'per_acre',
    activity: 'soil_pulverization',
    basePrice: 3200,
    includesGST: true,
    note: 'Breaks down large clods for fine seedbed preparation.',
    isLive: true,
    createdAt: new Date('2024-02-20'),
  },
  {
    id: '4',
    name: 'Farm to Market Transport',
    category: 'logistics',
    perUnit: 'per_trip',
    activity: 'transportation',
    basePrice: 5000,
    includesGST: true,
    note: 'Max 3 tonnes per trip. Refrigerated option available at extra cost.',
    isLive: true,
    createdAt: new Date('2024-03-05'),
  },
  {
    id: '5',
    name: 'Mulching Service',
    category: 'cultivation',
    perUnit: 'per_acre',
    activity: 'mulching',
    basePrice: 2200,
    includesGST: false,
    note: 'Organic mulch spreading for moisture retention.',
    isLive: false,
    createdAt: new Date('2024-03-15'),
  },
  {
    id: '6',
    name: 'Crop Spraying Service',
    category: 'cultivation',
    perUnit: 'per_acre',
    activity: 'spraying',
    basePrice: 1500,
    includesGST: true,
    note: 'Pesticide/Fertilizer spraying. Chemicals not included.',
    isLive: true,
    createdAt: new Date('2024-04-01'),
  },
];

// ============================================
// CONSTANTS / LABELS
// ============================================

const categoryIcons = {
  cultivation: Tractor,
  logistics: Truck,
  others: Wrench,
};

const categoryLabels = {
  cultivation: 'Cultivation',
  logistics: 'Logistics',
  others: 'Others',
};

const perUnitLabels: Record<string, string> = {
  per_acre: 'Per Acre',
  per_hour: 'Per Hour',
  per_day: 'Per Day',
  per_trip: 'Per Trip',
  per_load: 'Per Load',
  per_kg: 'Per KG',
};

const activityLabels: Record<string, string> = {
  ploughing: 'Ploughing',
  interweeding: 'Interweeding',
  mulching: 'Mulching',
  soil_pulverization: 'Soil Pulverization',
  harrowing: 'Harrowing',
  seeding: 'Seeding',
  spraying: 'Spraying',
  harvesting: 'Harvesting',
  transportation: 'Transportation',
  loading_unloading: 'Loading/Unloading',
};

const categoryOptions: { value: ServiceCategory; label: string; icon: ReactNode }[] = [
  { value: 'cultivation', label: 'Cultivation', icon: <Tractor className="w-4 h-4" /> },
  { value: 'logistics', label: 'Logistics', icon: <Truck className="w-4 h-4" /> },
  { value: 'others', label: 'Others', icon: <Wrench className="w-4 h-4" /> },
];

const perUnitOptions: { value: PerUnit; label: string }[] = [
  { value: 'per_acre', label: 'Per Acre' },
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_trip', label: 'Per Trip' },
  { value: 'per_load', label: 'Per Load' },
  { value: 'per_kg', label: 'Per KG' },
];

const activityOptions: { value: ActivityType; label: string }[] = [
  { value: 'ploughing', label: 'Ploughing' },
  { value: 'interweeding', label: 'Interweeding' },
  { value: 'mulching', label: 'Mulching' },
  { value: 'soil_pulverization', label: 'Soil Pulverization' },
  { value: 'harrowing', label: 'Harrowing' },
  { value: 'seeding', label: 'Seeding' },
  { value: 'spraying', label: 'Spraying' },
  { value: 'harvesting', label: 'Harvesting' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'loading_unloading', label: 'Loading/Unloading' },
];

function toServiceCategory(value: string | undefined): ServiceCategory {
  if (value === 'cultivation' || value === 'logistics' || value === 'others') return value;
  return 'others';
}

function toPerUnit(value: string | undefined): PerUnit {
  if (
    value === 'per_acre' ||
    value === 'per_hour' ||
    value === 'per_day' ||
    value === 'per_trip' ||
    value === 'per_load' ||
    value === 'per_kg'
  ) {
    return value;
  }
  return 'per_acre';
}

function toActivityType(value: string | undefined): ActivityType {
  if (
    value === 'ploughing' ||
    value === 'interweeding' ||
    value === 'mulching' ||
    value === 'soil_pulverization' ||
    value === 'harrowing' ||
    value === 'seeding' ||
    value === 'spraying' ||
    value === 'harvesting' ||
    value === 'transportation' ||
    value === 'loading_unloading'
  ) {
    return value;
  }
  return 'ploughing';
}

// ============================================
// SERVICE CARD COMPONENT
// ============================================

interface ServiceCardProps {
  service: Service;
  onToggleLive: (id: string, isLive: boolean) => void;
}

function ServiceCard({ service, onToggleLive }: ServiceCardProps) {
  const CategoryIcon = categoryIcons[service.category];
  const timeline = service.timeline;
  const hasTimeline =
    Boolean(timeline?.applicationStartDate) ||
    Boolean(timeline?.applicationEndDate) ||
    Boolean(timeline?.rentalStartDate) ||
    Boolean(timeline?.rentalEndDate);

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      {/* Live Status Indicator */}
      <div
        className={`absolute top-0 left-0 w-1 h-full ${service.isLive ? 'bg-green-500' : 'bg-gray-300'}`}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <CategoryIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground leading-tight">{service.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs font-normal">
                  {categoryLabels[service.category] ?? service.category}
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  {activityLabels[service.activity] ?? service.activity}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{service.isLive ? 'Live' : 'Draft'}</span>
            <Switch
              checked={service.isLive}
              onCheckedChange={(checked) => onToggleLive(service.id, checked)}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <IndianRupee className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">₹{service.basePrice.toLocaleString()}</span>
            <span className="text-muted-foreground text-xs">
              {service.includesGST ? '(incl. GST)' : '(excl. GST)'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{perUnitLabels[service.perUnit] ?? service.perUnit}</span>
          </div>
        </div>

        {service.note && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-secondary/50">
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{service.note}</p>
          </div>
        )}

        {hasTimeline && (
          <div className="mt-3 rounded-md bg-secondary/50 p-3">
            <div className="text-xs font-medium text-foreground mb-2">Timeline</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Application start</span>
                <span className="text-foreground">
                  {timeline?.applicationStartDate
                    ? timeline.applicationStartDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Application end</span>
                <span className="text-foreground">
                  {timeline?.applicationEndDate
                    ? timeline.applicationEndDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Rental start</span>
                <span className="text-foreground">
                  {timeline?.rentalStartDate
                    ? timeline.rentalStartDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Rental end</span>
                <span className="text-foreground">
                  {timeline?.rentalEndDate
                    ? timeline.rentalEndDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Created:{' '}
            {service.createdAt.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span>ID: #{service.id}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// ADD SERVICE DIALOG COMPONENT
// ============================================

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
}

function AddServiceDialog({ open, onOpenChange, onCreated }: AddServiceDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    name: '',
    category: '' as ServiceCategory,
    perUnit: '' as PerUnit,
    activity: '' as ActivityType,
    basePrice: '',
    includesGST: true,
    note: '',
    isLive: false,
    applicationStartDate: '',
    applicationEndDate: '',
    rentalStartDate: '',
    rentalEndDate: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isStep1Valid =
    Boolean(formData.name) &&
    Boolean(formData.category) &&
    Boolean(formData.perUnit) &&
    Boolean(formData.activity) &&
    Boolean(formData.basePrice);

  const isStep2Valid =
    Boolean(formData.applicationStartDate) &&
    Boolean(formData.applicationEndDate) &&
    Boolean(formData.rentalStartDate) &&
    Boolean(formData.rentalEndDate);

  const handleNext = () => {
    if (!isStep1Valid) {
      toast.error('Please fill all required fields');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!isStep1Valid) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!isStep2Valid) {
      toast.error('Please add all timeline dates');
      return;
    }

    const payload = {
      service_name: formData.name,
      category: formData.category,
      activity: formData.activity,
      billing_unit: formData.perUnit,
      base_price: Number(formData.basePrice),
      inclusive_GST: formData.includesGST,
      Note: formData.note || '',
      status: formData.isLive ? 'Live' : 'Draft',
      timeline: [
        {
          application_start_date: formData.applicationStartDate,
          application_end_date: formData.applicationEndDate,
          rental_start_date: formData.rentalStartDate,
          rental_end_date: formData.rentalEndDate,
        },
      ],
    };

    const BASE_URL = getBaseUrl().replace(/\/$/, '');

    try {
      setIsSubmitting(true);
      const res = await fetch(`${BASE_URL}/admin_rental/add_rental_rate_card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore non-JSON
      }

      if (!res.ok || (data?.status && data.status !== 'success')) {
        const message = data?.message || data?.error || 'Failed to create service';
        toast.error(message);
        return;
      }

      toast.success('Service created successfully');

      await onCreated();

      // Reset form
      setFormData({
        name: '',
        category: '' as ServiceCategory,
        perUnit: '' as PerUnit,
        activity: '' as ActivityType,
        basePrice: '',
        includesGST: true,
        note: '',
        isLive: false,
        applicationStartDate: '',
        applicationEndDate: '',
        rentalStartDate: '',
        rentalEndDate: '',
      });
      setStep(1);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create service');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Tractor className="w-5 h-5 text-primary" />
            </div>
            Create New Service
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          {step === 1 ? (
            <>
              {/* Service Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Service Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Premium Ploughing Service"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-11"
                />
              </div>

              {/* Category & Activity Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: ServiceCategory) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger className="h-11 bg-background">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {option.icon}
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Activity <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.activity}
                    onValueChange={(value: ActivityType) =>
                      setFormData({ ...formData, activity: value })
                    }
                  >
                    <SelectTrigger className="h-11 bg-background">
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {activityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Per Unit */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Billing Unit <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.perUnit}
                  onValueChange={(value: PerUnit) =>
                    setFormData({ ...formData, perUnit: value })
                  }
                >
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder="Select billing unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {perUnitOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Base Price Row */}
              <div className="space-y-2">
                <Label htmlFor="basePrice" className="text-sm font-medium">
                  Base Price (₹) <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="basePrice"
                      type="number"
                      placeholder="0.00"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      className="h-11 pl-8"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary">
                    <Switch
                      id="includesGST"
                      checked={formData.includesGST}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, includesGST: checked })
                      }
                    />
                    <Label htmlFor="includesGST" className="text-sm cursor-pointer">
                      Includes GST
                    </Label>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="note" className="text-sm font-medium">
                  Note / Description
                </Label>
                <Textarea
                  id="note"
                  placeholder="Add any special notes, discounts, or terms..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Live Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${formData.isLive ? 'bg-green-500/20' : 'bg-muted'}`}>
                    <Zap
                      className={`w-4 h-4 ${formData.isLive ? 'text-green-500' : 'text-muted-foreground'}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Publish Service</p>
                    <p className="text-xs text-muted-foreground">
                      {formData.isLive ? 'Service will be visible to farmers' : 'Save as draft'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.isLive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isLive: checked })}
                />
              </div>

              <DialogFooter className="gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="button" className="gap-2" onClick={handleNext}>
                  Next
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {/* Timeline */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-medium mb-3">Timeline</div>

                <div className="relative pl-6">
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

                  <div className="relative mb-4">
                    <div className="absolute left-0 top-2 w-[18px] h-[18px] rounded-full border border-border bg-background" />
                    <div className="pl-6 space-y-2">
                      <Label htmlFor="applicationStartDate" className="text-sm font-medium">
                        Application Start Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="applicationStartDate"
                        type="date"
                        value={formData.applicationStartDate}
                        onChange={(e) =>
                          setFormData({ ...formData, applicationStartDate: e.target.value })
                        }
                        className="h-11 bg-background"
                      />
                    </div>
                  </div>

                  <div className="relative mb-4">
                    <div className="absolute left-0 top-2 w-[18px] h-[18px] rounded-full border border-border bg-background" />
                    <div className="pl-6 space-y-2">
                      <Label htmlFor="applicationEndDate" className="text-sm font-medium">
                        Application End Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="applicationEndDate"
                        type="date"
                        value={formData.applicationEndDate}
                        onChange={(e) =>
                          setFormData({ ...formData, applicationEndDate: e.target.value })
                        }
                        className="h-11 bg-background"
                      />
                    </div>
                  </div>

                  <div className="relative mb-4">
                    <div className="absolute left-0 top-2 w-[18px] h-[18px] rounded-full border border-border bg-background" />
                    <div className="pl-6 space-y-2">
                      <Label htmlFor="rentalStartDate" className="text-sm font-medium">
                        Rental Start Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="rentalStartDate"
                        type="date"
                        value={formData.rentalStartDate}
                        onChange={(e) =>
                          setFormData({ ...formData, rentalStartDate: e.target.value })
                        }
                        className="h-11 bg-background"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute left-0 top-2 w-[18px] h-[18px] rounded-full border border-border bg-background" />
                    <div className="pl-6 space-y-2">
                      <Label htmlFor="rentalEndDate" className="text-sm font-medium">
                        Rental End Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="rentalEndDate"
                        type="date"
                        value={formData.rentalEndDate}
                        onChange={(e) =>
                          setFormData({ ...formData, rentalEndDate: e.target.value })
                        }
                        className="h-11 bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2" disabled={isSubmitting || !isStep2Valid}>
                  <Zap className="w-4 h-4" />
                  {isSubmitting ? 'Creating...' : 'Create Service'}
                </Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// MAIN RATE CARD SECTION COMPONENT
// ============================================

export function RateCardStandalone() {
  const [services, setServices] = useState<Service[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const fetchRateCards = async () => {
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/admin_rental/get_all_rental_rate_cards`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data?.message || data?.error || 'Failed to load rate cards';
        toast.error(message);
        return;
      }

      if (!Array.isArray(data)) {
        toast.error('Invalid rate card response');
        return;
      }

      const mapped: Service[] = (data as RateCardApiItem[]).map((item) => {
        const createdAt = item.created_at ? new Date(item.created_at) : new Date();
        const status = (item.status ?? 'Draft').toString();
        const timelineItem = Array.isArray(item.timeline) ? item.timeline[0] : undefined;
        const timeline = timelineItem
          ? {
              applicationStartDate: parseDateOrUndefined(timelineItem.application_start_date),
              applicationEndDate: parseDateOrUndefined(timelineItem.application_end_date),
              rentalStartDate: parseDateOrUndefined(timelineItem.rental_start_date),
              rentalEndDate: parseDateOrUndefined(timelineItem.rental_end_date),
            }
          : undefined;

        return {
          id: item.rental_id || crypto.randomUUID(),
          name: item.service_name || 'Untitled Service',
          category: toServiceCategory(item.category),
          perUnit: toPerUnit(item.billing_unit),
          activity: toActivityType(item.activity),
          basePrice: typeof item.base_price === 'number' ? item.base_price : Number(item.base_price ?? 0),
          includesGST: Boolean(item.inclusive_GST),
          note: item.Note ?? '',
          isLive: status.toLowerCase() === 'live',
          createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
          timeline,
        };
      });

      setServices(mapped);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load rate cards');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRateCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleLive = (id: string, isLive: boolean) => {
    setServices(services.map((s) => (s.id === id ? { ...s, isLive } : s)));
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.note.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'live' && service.isLive) ||
      (statusFilter === 'draft' && !service.isLive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const liveCount = services.filter((s) => s.isLive).length;
  const draftCount = services.filter((s) => !s.isLive).length;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Rental Rate Card</h1>
          <p className="text-muted-foreground mt-1">Manage service pricing for cultivation and logistics activities.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" />
          Add Service
        </Button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Services</p>
              <h3 className="text-2xl font-bold mt-1">{services.length}</h3>
            </div>
            <div className="p-2 bg-secondary text-muted-foreground rounded-lg">
              <LayoutGrid className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Services</p>
              <h3 className="text-2xl font-bold mt-1">{liveCount}</h3>
            </div>
            <div className="p-2 bg-secondary text-muted-foreground rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Draft Services</p>
              <h3 className="text-2xl font-bold mt-1">{draftCount}</h3>
            </div>
            <div className="p-2 bg-secondary text-muted-foreground rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 border-b border-border pb-4">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="flex flex-1 gap-3 w-full flex-col sm:flex-row">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services by name or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card"
              />
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-card">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="cultivation">Cultivation</SelectItem>
                  <SelectItem value="logistics">Logistics</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px] bg-card">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
          Loading rate cards...
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <ServiceCard key={service.id} service={service} onToggleLive={handleToggleLive} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border-2 border-dashed bg-card/50">
          <div className="p-3 rounded-full bg-secondary mb-4">
            <LayoutGrid className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No services found</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first service to get started'}
          </p>
          {!searchQuery && categoryFilter === 'all' && statusFilter === 'all' && (
            <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Service
            </Button>
          )}
        </div>
      )}

      <AddServiceDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onCreated={fetchRateCards} />
    </div>
  );
}

export default RateCardStandalone;
