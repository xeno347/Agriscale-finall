// ============================================
// ServiceRequestsStandalone.tsx
// A self-contained component for Service Requests
// Copy this entire file into your project
// Requires: shadcn/ui components (card, button, input, table, dropdown-menu)
// Requires: lucide-react
// ============================================

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getBaseUrl } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, CheckCircle2, FileText, Eye, User, MapPin, Calendar, Phone } from 'lucide-react';

// ============================================
// Types
// ============================================

export type RequestStatus = 'applied' | 'approved' | 'work_order' | 'completed';

export interface ServiceRequest {
  id: string;
  serviceId: string;
  serviceName: string;
  farmerName: string;
  farmerContact: string;
  farmLocation: string;
  areaSize: string;
  requestedDate: Date;
  status: RequestStatus;
  appliedAt: Date;
  approvedAt?: Date;
  workOrderSentAt?: Date;
  completedAt?: Date;
}

type RentalApplicationApiItem = {
  area?: number;
  farmer_id?: string;
  contact?: string;
  requested_date?: string;
  request_id?: string;
  farmer_name?: string;
  status?: string;
};

type RentalApplicationsApiGroup = {
  rental_id?: string;
  service_name?: string;
  applications?: RentalApplicationApiItem[];
};

type RentalApplicationsApiResponse = {
  rental_applications?: RentalApplicationsApiGroup[];
};

function toRequestStatus(value: string | undefined): RequestStatus {
  if (value === 'applied' || value === 'approved' || value === 'work_order' || value === 'completed') {
    return value;
  }
  return 'applied';
}

// ============================================
// NOTE
// ============================================
// This page now reads data from API:
// GET ${BASE_URL}/admin_rental/get_rental_applications

// ============================================
// StatusBadge Component
// ============================================

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  applied: {
    label: 'Applied',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  work_order: {
    label: 'Work Order Sent',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
};

function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// ============================================
// Status Tabs Configuration
// ============================================

const statusTabs: {
  value: RequestStatus | 'all';
  label: string;
}[] = [
  { value: 'all', label: 'All Requests' },
  { value: 'applied', label: 'Applied' },
  { value: 'approved', label: 'Approved' },
  { value: 'work_order', label: 'Work Order Sent' },
  { value: 'completed', label: 'Completed' },
];

// ============================================
// Main Component
// ============================================

export function ServiceRequestsStandalone() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [activeTab, setActiveTab] = useState<RequestStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchApplications = async () => {
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/admin_rental/get_rental_applications`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const data: RentalApplicationsApiResponse = await res.json();

      if (!res.ok) {
        const message = (data as any)?.message || (data as any)?.error || 'Failed to load applications';
        toast.error(message);
        return;
      }

      const groups = data?.rental_applications;
      if (!Array.isArray(groups)) {
        toast.error('Invalid applications response');
        return;
      }

      const flattened: ServiceRequest[] = [];

      for (const group of groups) {
        const rentalId = group?.rental_id ?? '';
        const serviceName = group?.service_name ?? 'Unknown Service';
        const apps = Array.isArray(group?.applications) ? group.applications : [];

        for (const app of apps) {
          const requestedDate = app?.requested_date ? new Date(app.requested_date) : new Date();
          const safeRequestedDate = Number.isNaN(requestedDate.getTime()) ? new Date() : requestedDate;
          const area = typeof app?.area === 'number' ? app.area : Number(app?.area ?? 0);

          flattened.push({
            id: app?.request_id ?? `${rentalId}-${Math.random().toString(16).slice(2)}`,
            serviceId: rentalId,
            serviceName,
            farmerName: app?.farmer_name ?? 'Unknown',
            farmerContact: app?.contact ?? '',
            farmLocation: '-',
            areaSize: `${Number.isFinite(area) ? area : 0} acres`,
            requestedDate: safeRequestedDate,
            status: toRequestStatus(app?.status),
            appliedAt: safeRequestedDate,
          });
        }
      }

      setRequests(flattened);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCountByStatus = (status: RequestStatus | 'all') => {
    if (status === 'all') return requests.length;
    return requests.filter((r) => r.status === status).length;
  };

  const filteredRequests = requests.filter((request) => {
    const matchesStatus = activeTab === 'all' || request.status === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (request.farmerName ?? '').toLowerCase().includes(q) ||
      (request.serviceName ?? '').toLowerCase().includes(q) ||
      (request.id ?? '').toLowerCase().includes(q) ||
      (request.farmLocation ?? '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const updateRequestStatus = (id: string, newStatus: RequestStatus) => {
    setRequests(
      requests.map((r) => {
        if (r.id === id) {
          const now = new Date();
          const updates: Partial<ServiceRequest> = { status: newStatus };
          if (newStatus === 'approved') updates.approvedAt = now;
          if (newStatus === 'work_order') updates.workOrderSentAt = now;
          if (newStatus === 'completed') updates.completedAt = now;
          return { ...r, ...updates };
        }
        return r;
      })
    );
  };

  const getNextAction = (
    status: RequestStatus
  ): { label: string; nextStatus: RequestStatus } | null => {
    switch (status) {
      case 'applied':
        return { label: 'Approve', nextStatus: 'approved' };
      case 'approved':
        return { label: 'Send Work Order', nextStatus: 'work_order' };
      case 'work_order':
        return { label: 'Mark Complete', nextStatus: 'completed' };
      default:
        return null;
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Service Requests</h1>
          <p className="text-muted-foreground mt-1">
            Track farmer requests, approvals, and work order progress.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusTabs.map((tab) => {
          const count = getCountByStatus(tab.value);
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap border',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:bg-muted text-foreground'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by farmer, service, location, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Requests Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Request ID</TableHead>
                <TableHead className="font-semibold">Service</TableHead>
                <TableHead className="font-semibold">Farmer Details</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">Area</TableHead>
                <TableHead className="font-semibold">Requested Date</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="text-sm text-muted-foreground">Loading applications...</div>
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((request, index) => {
                  const nextAction = getNextAction(request.status);
                  return (
                    <TableRow
                      key={request.id}
                      className={index % 2 === 1 ? 'bg-muted/20' : ''}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {request.id}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{request.serviceName}</div>
                        <div className="text-xs text-muted-foreground">
                          Applied:{' '}
                          {request.appliedAt.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">{request.farmerName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {request.farmerContact}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1.5 max-w-[200px]">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-sm leading-tight">
                            {request.farmLocation}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{request.areaSize}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {request.requestedDate.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {nextAction && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateRequestStatus(request.id, nextAction.nextStatus)
                              }
                              className="gap-1.5 text-xs"
                            >
                              {nextAction.nextStatus === 'approved' && (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              {nextAction.nextStatus === 'work_order' && (
                                <FileText className="w-3.5 h-3.5" />
                              )}
                              {nextAction.nextStatus === 'completed' && (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              {nextAction.label}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover z-50">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Phone className="w-4 h-4 mr-2" />
                                Contact Farmer
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="w-4 h-4 mr-2" />
                                Download Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No requests found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {searchQuery
                          ? 'Try adjusting your search'
                          : 'No service requests in this category'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default ServiceRequestsStandalone;
