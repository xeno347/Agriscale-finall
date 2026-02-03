import React, { useEffect, useState } from 'react';
import { 
  FileText, CheckCircle2, MessageSquare, 
  Plus, ArrowRight, UserCheck, Settings,
  Building2, Send, X, ClipboardCheck, User, Phone, Package,
  MapPin, Calendar, Truck, Search, ChevronDown, AlertTriangle, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBaseUrl } from '@/lib/config';
import { toast } from 'sonner';

/**
 * ADMIN REQUEST WORKFLOW:
 * 
 * 1. DEPARTMENT SUBMITS → User creates request in their department (e.g., Logistics, Inventory)
 * 2. ADMIN RECEIVES → Request appears in Admin Request Management page with status: 'pending'
 * 3. ADMIN REVIEWS → Admin reviews department approval, adds notes, and approves
 * 4. ADMIN FORWARDS → Admin selects department(s) to forward the approved request
 * 5. DEPARTMENT RECEIVES → Forwarded request appears back in the selected department(s) for action
 * 
 * Status Flow: pending → approved → in_progress (forwarded)
 */

type RequestStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
type RequestPriority = 'urgent' | 'high' | 'medium' | 'low';
type RequestType = 'logistics' | 'inventory' | 'maintenance' | 'procurement' | 'other';

type ApprovalStageStatus = 'pending' | 'approved' | 'approved_and_forwarded' | 'rejected' | string;

type BackendAdminOpsRequest = {
  first_department?: string;
  request_details?: {
    note?: string;
    request_location?: string;
  };
  date?: string;
  created_at?: string;
  request_id?: string;
  concerned_department_approval_status?: ApprovalStageStatus;
  concerned_department_note?: string;
  forwarded_department_approval_status?: ApprovalStageStatus;
  admin_ops_approval_status?: ApprovalStageStatus;
  admin_ops_note?: string;
  sender_details?: {
    staff_name?: string;
    staff_phone?: string;
    staff_department?: string;
    staff_designation?: string;
    staff_id?: string;
  };
  forwarded_to_departments?: string[];
};

interface AdminRequestData {
  id: string;
  adminOpsApprovalStatus: string;
  requesterId: string;
  requesterName: string;
  requesterPhone: string;
  requesterDepartment: string;
  requestType: RequestType;
  title: string;
  description: string;
  vehicleType?: string;
  fromLocation?: string;
  toLocation?: string;
  preferredDate?: string;
  loadDetails?: string;
  priority: RequestPriority;
  status: RequestStatus;
  createdAt: string;
  deptApprovals: string;
  deptReason: string;
  adminNotes: string;
  forwardedTo?: string;
  forwardedAt?: string;
  receiverId?: string;
  receiverName?: string;
  receiverDepartment?: string;
}

const AdminRequestPage = () => {
  const [requests, setRequests] = useState<AdminRequestData[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [forwardingRequestId, setForwardingRequestId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentEditingNotes, setCurrentEditingNotes] = useState<{id: string, notes: string} | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<Record<string, string[]>>({});

  const parseRequestLocation = (raw?: string): { fromLocation?: string; toLocation?: string } => {
    const cleaned = String(raw || '').trim();
    if (!cleaned) return { fromLocation: undefined, toLocation: undefined };
    const parts = cleaned.split('->').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) return { fromLocation: parts[0], toLocation: parts.slice(1).join(' -> ') };
    return { fromLocation: cleaned, toLocation: undefined };
  };

  const normalizeRequestType = (raw?: string): RequestType => {
    const v = String(raw || '').trim().toLowerCase();
    if (v === 'logistics') return 'logistics';
    if (v === 'inventory') return 'inventory';
    if (v === 'maintenance') return 'maintenance';
    if (v === 'procurement') return 'procurement';
    return 'other';
  };

  const titleFromNote = (note?: string): string => {
    const cleaned = String(note || '').trim();
    if (!cleaned) return 'Request';
    // Use first sentence-ish / first chunk as a title.
    const firstLine = cleaned.split(/\r?\n/)[0] || cleaned;
    const clipped = firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
    return clipped;
  };

  const deriveUiStatus = (item: BackendAdminOpsRequest): RequestStatus => {
    const concerned = String(item?.concerned_department_approval_status || 'pending');
    const adminOps = String(item?.admin_ops_approval_status || 'pending');
    const forwarded = String(item?.forwarded_department_approval_status || 'pending');
    const forwardedTo = Array.isArray(item?.forwarded_to_departments) ? item.forwarded_to_departments : [];

    const isApproved = (v: string) => v === 'approved' || v === 'approved_and_forwarded';

    if ([concerned, adminOps, forwarded].some(s => s === 'rejected')) return 'rejected';
    if (adminOps === 'pending') return 'pending';
    if (isApproved(adminOps)) {
      return forwardedTo.length > 0 ? 'in_progress' : 'approved';
    }
    return 'pending';
  };

  const fetchAdminRequests = async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoadingRequests(true);
    try {
      const response = await fetch(`${getBaseUrl()}/admin_ops_requests/get_admin_ops_requests`);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const raw = await response.json();

      const list: BackendAdminOpsRequest[] = Array.isArray(raw)
        ? raw
        : (
            Array.isArray(raw?.admin_ops_requests)
              ? raw.admin_ops_requests
              : (Array.isArray(raw?.data?.admin_ops_requests)
                  ? raw.data.admin_ops_requests
                  : [])
          );

      const mapped: AdminRequestData[] = list.map((item) => {
        const requestId = String(item?.request_id || '').trim() || `REQ-${Math.random().toString(16).slice(2)}`;
        const sender = item?.sender_details || {};
        const note = item?.request_details?.note || '';
        const loc = parseRequestLocation(item?.request_details?.request_location);

        const requestType = normalizeRequestType(item?.first_department || sender?.staff_department);
        const status = deriveUiStatus(item);
        const forwardedToList = Array.isArray(item?.forwarded_to_departments) ? item.forwarded_to_departments : [];
        const rawAdminOpsApprovalStatus = String(item?.admin_ops_approval_status || 'pending');
        // Robust filtering: even if backend keeps admin_ops_approval_status="approved",
        // once forwarded_to_departments is non-empty we treat it as "approved_and_forwarded".
        const adminOpsApprovalStatus =
          rawAdminOpsApprovalStatus === 'approved' && forwardedToList.length > 0
            ? 'approved_and_forwarded'
            : rawAdminOpsApprovalStatus;

        const deptApprovals = (() => {
          const concerned = String(item?.concerned_department_approval_status || 'pending');
          if (concerned === 'approved_and_forwarded') return 'Concerned Department Approved';
          if (concerned === 'rejected') return 'Concerned Department Rejected';
          return 'Concerned Department Pending';
        })();

        const deptReason = String(item?.concerned_department_note || '').trim() || '—';

        const forwardedTo = forwardedToList.length > 0 ? forwardedToList.join(', ') : undefined;

        return {
          id: requestId,
          adminOpsApprovalStatus,
          requesterId: String(sender?.staff_id || ''),
          requesterName: String(sender?.staff_name || '—'),
          requesterPhone: String(sender?.staff_phone || '—'),
          requesterDepartment: String(sender?.staff_department || '—'),
          requestType,
          title: titleFromNote(note),
          description: String(note || ''),
          vehicleType: requestType === 'logistics' ? '—' : undefined,
          fromLocation: requestType === 'logistics' ? loc.fromLocation : undefined,
          toLocation: requestType === 'logistics' ? loc.toLocation : undefined,
          preferredDate: String(item?.date || ''),
          loadDetails: undefined,
          priority: 'medium',
          status,
          createdAt: String(item?.created_at || ''),
          deptApprovals,
          deptReason,
          adminNotes: String(item?.admin_ops_note || '').trim(),
          forwardedTo,
          receiverDepartment: forwardedTo,
        };
      });

      setRequests(mapped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load requests');
      // If this is just a background refresh, keep the existing UI.
      if (!silent) setRequests([]);
    } finally {
      if (!silent) setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchAdminRequests();
  }, []);

  const updateAdminOpsApprovalStatus = async (payload: {
    request_id: string;
    status: 'approved' | 'rejected';
    note: string;
  }) => {
    const response = await fetch(
      `${getBaseUrl()}/admin_ops_requests/update_admin_ops_approval_status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const maybeMessage = (data && (data.message || data.detail || data.error))
        ? String(data.message || data.detail || data.error)
        : '';
      throw new Error(maybeMessage || `Request failed (${response.status})`);
    }

    return data;
  };

  const forwardRequestToDepartments = async (payload: {
    request_id: string;
    departments: string[];
  }) => {
    const response = await fetch(
      `${getBaseUrl()}/admin_ops_requests/forward_request_to_departments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const maybeMessage = (data && (data.message || data.detail || data.error))
        ? String(data.message || data.detail || data.error)
        : '';
      throw new Error(maybeMessage || `Request failed (${response.status})`);
    }

    return data;
  };

  const filteredRequests = requests.filter(req => 
    req.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Only show items that still need Admin action or forwarding.
  // Filter by backend status: show only pending/approved; hide approved_and_forwarded.
  const visibleRequests = filteredRequests.filter(req =>
    req.adminOpsApprovalStatus === 'pending' || req.adminOpsApprovalStatus === 'approved'
  );

  const getStatusConfig = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pending' };
      case 'approved': return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Approved' };
      case 'in_progress': return { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', label: 'In Progress' };
      case 'completed': return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Completed' };
      case 'rejected': return { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' };
    }
  };

  const getPriorityConfig = (priority: RequestPriority) => {
    switch (priority) {
      case 'urgent': return { color: 'text-red-700', bg: 'bg-red-50', icon: '🔴' };
      case 'high': return { color: 'text-orange-700', bg: 'bg-orange-50', icon: '🟠' };
      case 'medium': return { color: 'text-yellow-700', bg: 'bg-yellow-50', icon: '🟡' };
      case 'low': return { color: 'text-gray-700', bg: 'bg-gray-50', icon: '⚪' };
    }
  };

  const handleApproveRequest = async (req: AdminRequestData) => {
    const note = String(currentEditingNotes?.notes || '').trim();
    if (!note) {
      toast.error('Please add admin notes first');
      return;
    }

    let saved: any = null;
    try {
      saved = await updateAdminOpsApprovalStatus({
        request_id: req.id,
        status: 'approved',
        note,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve request');
      return;
    }

    const savedNote = String(saved?.admin_ops_note || '').trim() || note;
    const savedStatus = String(saved?.admin_ops_approval_status || 'approved');

    setRequests(prev => prev.map(r =>
      r.id === req.id
        ? {
            ...r,
            status: 'approved' as RequestStatus,
            adminOpsApprovalStatus: 'approved',
            adminNotes: savedNote,
          }
        : r
    ));

    setCurrentEditingNotes(null);
    toast.success('✓ Approved! Now select department(s) to forward');
  };

  const toggleDepartment = (requestId: string, dept: string) => {
    setSelectedDepartments(prev => {
      const current = prev[requestId] || [];
      const updated = current.includes(dept)
        ? current.filter(d => d !== dept)
        : [...current, dept];
      return { ...prev, [requestId]: updated };
    });
  };

  const handleForwardMultiple = async (req: AdminRequestData) => {
    const departments = selectedDepartments[req.id] || [];
    
    if (departments.length === 0) {
      toast.error("Please select at least one department");
      return;
    }

    setForwardingRequestId(req.id);

    try {
      await forwardRequestToDepartments({
        request_id: req.id,
        departments,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to forward request');
      setForwardingRequestId(null);
      return;
    }

    setRequests(prev => prev.map(r => 
      r.id === req.id ? { 
        ...r, 
        forwardedTo: departments.join(', '),
        forwardedAt: new Date().toISOString(),
        receiverDepartment: departments.join(', '),
        adminOpsApprovalStatus: 'approved_and_forwarded',
        status: 'in_progress' as RequestStatus
      } : r
    ));
    
    // Clear selected departments for this request
    setSelectedDepartments(prev => {
      const updated = { ...prev };
      delete updated[req.id];
      return updated;
    });
    
    const deptList = departments.length === 1 ? departments[0] : `${departments.length} departments`;
    toast.success(`✓ Request forwarded to ${deptList}. The department(s) will now handle it.`);

    setForwardingRequestId(null);

    // No automatic re-fetch here because this page intentionally hides forwarded items.
    // A re-fetch could bring the item back if backend keeps admin_ops_approval_status="approved".
  };

  const handleReject = async (id: string) => {
    try {
      await updateAdminOpsApprovalStatus({
        request_id: id,
        status: 'rejected',
        note: '',
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject request');
      return;
    }

    setRequests(prev => prev.map(req =>
      req.id === id ? { ...req, status: 'rejected' as RequestStatus } : req
    ));
    toast.error('Request rejected');
  };

  const pendingCount = visibleRequests.filter(r => r.adminOpsApprovalStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Admin Request Management</h1>
                <p className="text-sm text-gray-600 mt-0.5">Review incoming requests and forward to departments</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-8">
        {loadingRequests ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading requests...</p>
            </div>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Search */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by requester, title, description, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* Request Cards */}
          <div className="space-y-6">
            {visibleRequests.map((req) => {
              const statusConfig = getStatusConfig(req.status);
              const priorityConfig = getPriorityConfig(req.priority);

              return (
                <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Workflow Status Bar */}
                  <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full",
                          req.status === 'pending' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          <div className="w-2 h-2 rounded-full bg-current" />
                          <span className="font-medium">
                            {req.status === 'pending' ? '1. Submitted by ' + req.requesterDepartment : '1. Submitted ✓'}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full",
                          req.status === 'approved' || req.status === 'in_progress' ? "bg-emerald-100 text-emerald-700" : 
                          req.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                        )}>
                          <div className="w-2 h-2 rounded-full bg-current" />
                          <span className="font-medium">
                            {req.status === 'approved' || req.status === 'in_progress' ? '2. Admin Reviewed ✓' : 
                            req.status === 'pending' ? '2. Awaiting Review' : '2. Rejected'}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full",
                          req.status === 'in_progress' ? "bg-emerald-100 text-emerald-700" : 
                          req.status === 'approved' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                        )}>
                          <div className="w-2 h-2 rounded-full bg-current" />
                          <span className="font-medium">
                            {req.status === 'in_progress' ? '3. Forwarded to ' + req.forwardedTo + ' ✓' : 
                            req.status === 'approved' ? '3. Ready to Forward' : '3. Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Three Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 divide-x divide-gray-200">
                    
                    {/* Column 1: Concern Department */}
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                        <Building2 className="w-5 h-5 text-slate-900" />
                        <h2 className="text-lg font-semibold text-gray-900">Request From Department</h2>
                      </div>

                      {/* Request Details */}
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
                        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Request Details</h3>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Request ID:</span>
                            <span className="font-mono font-medium text-gray-900">{req.id}</span>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Requester:</p>
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-medium text-gray-900">{req.requesterName}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs text-gray-600">{req.requesterPhone}</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Department:</span>
                            <span className="font-medium text-gray-900">{req.requesterDepartment}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium text-gray-900 uppercase text-xs">{req.requestType}</span>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Title:</p>
                            <p className="font-medium text-gray-900">{req.title}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Description:</p>
                            <p className="text-gray-800 text-xs leading-relaxed">{req.description}</p>
                          </div>
                          {req.requestType === 'logistics' && (
                            <>
                              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                                <Truck className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-900 font-medium">{req.vehicleType}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
                                <div className="text-xs">
                                  <span className="text-gray-900 font-medium">{req.fromLocation}</span>
                                  <span className="text-gray-500 mx-1">→</span>
                                  <span className="text-gray-900 font-medium">{req.toLocation}</span>
                                </div>
                              </div>
                              {req.preferredDate && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-900 text-xs">{new Date(req.preferredDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-gray-600">Priority:</span>
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium", priorityConfig.bg, priorityConfig.color)}>
                              <span>{priorityConfig.icon}</span>
                              <span>{req.priority.toUpperCase()}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Department Approvals */}
                      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <UserCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-blue-900 text-sm">Department Manager Approval</h3>
                            <p className="text-xs text-blue-800 mt-1">{req.deptApprovals}</p>
                          </div>
                        </div>
                        <div className="pl-6">
                          <p className="text-xs text-blue-600 font-medium mb-1">Reason:</p>
                          <p className="text-xs text-blue-700 italic leading-relaxed">"{req.deptReason}"</p>
                        </div>
                      </div>

                      {/* Forwarded Status */}
                      {req.forwardedTo && (
                        <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="font-semibold text-emerald-900 text-sm">Approved and Forwarded</p>
                              <p className="text-xs text-emerald-700 mt-0.5">to {req.forwardedTo} Department</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!req.forwardedTo && req.status === 'approved' && (
                        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-semibold text-blue-900 text-sm">Approved by Admin</p>
                              <p className="text-xs text-blue-700 mt-0.5">Not forwarded to any department yet</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Admin */}
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                        <Settings className="w-5 h-5 text-slate-900" />
                        <h2 className="text-lg font-semibold text-gray-900">Admin</h2>
                      </div>

                      {/* Request Summary */}
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2.5">
                        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Request Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Request ID:</span>
                            <span className="font-mono font-medium text-gray-900">{req.id}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Status:</span>
                            <span className={cn("inline-flex px-2.5 py-1 rounded-md text-xs font-medium", statusConfig.bg, statusConfig.color)}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="text-xs text-gray-900">{new Date(req.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Admin Notes */}
                      <div className="flex-1">
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-slate-700" />
                            <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Admin Approval Notes</h3>
                          </div>
                          
                          {req.status === 'pending' && currentEditingNotes?.id === req.id ? (
                            <textarea
                              className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900 transition-colors outline-none text-sm resize-none"
                              placeholder="Enter your approval notes, instructions, or conditions here..."
                              value={currentEditingNotes.notes}
                              onChange={(e) => setCurrentEditingNotes({...currentEditingNotes, notes: e.target.value})}
                            />
                          ) : req.adminNotes ? (
                            <div className="p-3 bg-white rounded border border-gray-200 min-h-[10rem]">
                              <p className="text-sm text-gray-900 leading-relaxed">{req.adminNotes}</p>
                            </div>
                          ) : (
                            <div className="p-3 bg-white rounded border border-gray-200 min-h-[10rem] flex items-center justify-center">
                              <p className="text-sm text-gray-400 italic">No notes added yet</p>
                            </div>
                          )}
                        </div>
                        
                        {req.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            {currentEditingNotes?.id === req.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveRequest(req)}
                                  disabled={!currentEditingNotes.notes}
                                  className={cn(
                                    "flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2",
                                    currentEditingNotes.notes
                                      ? "bg-slate-900 text-white hover:bg-slate-800"
                                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  )}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Approve & Forward
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCurrentEditingNotes(null)}
                                  className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setCurrentEditingNotes({ id: req.id, notes: req.adminNotes })}
                                  className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm transition-colors"
                                >
                                  Review & Add Notes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReject(req.id)}
                                  className="px-4 py-2.5 bg-white border border-red-300 text-red-600 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Approved Status */}
                      {(req.status === 'approved' || req.status === 'in_progress') && (
                        <div className="bg-slate-900 rounded-lg p-4 text-white">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <div>
                              <p className="font-semibold text-sm">Approved by Admin</p>
                              {req.forwardedAt && (
                                <p className="text-xs text-slate-300 mt-0.5">{new Date(req.forwardedAt).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column 3: Forward to Department */}
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                        <ArrowRight className="w-5 h-5 text-slate-900" />
                        <h2 className="text-lg font-semibold text-gray-900">Forward to Department</h2>
                      </div>

                      {req.status === 'approved' && !req.forwardedTo ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">Select department(s) to forward:</p>
                          <div className="space-y-2">
                            {['Logistics', 'Inventory', 'Operations', 'Maintenance', 'Procurement'].map((dept) => {
                              const isSelected = selectedDepartments[req.id]?.includes(dept) || false;
                              return (
                                <label 
                                  key={dept}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                    isSelected 
                                      ? "border-slate-900 bg-slate-50" 
                                      : "border-gray-200 hover:bg-gray-50"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleDepartment(req.id, dept)}
                                    className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900 focus:ring-2"
                                  />
                                  <div className="flex items-center gap-2 flex-1">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">{dept}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleForwardMultiple(req)}
                            disabled={
                              !selectedDepartments[req.id]?.length ||
                              forwardingRequestId === req.id
                            }
                            className={cn(
                              "w-full mt-4 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2",
                              (selectedDepartments[req.id]?.length && forwardingRequestId !== req.id)
                                ? "bg-slate-900 text-white hover:bg-slate-800"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            )}
                          >
                            <Send className="w-4 h-4" />
                            {forwardingRequestId === req.id
                              ? 'Forwarding...'
                              : `Forward to Selected Department${selectedDepartments[req.id]?.length > 1 ? 's' : ''}`}
                            {selectedDepartments[req.id]?.length > 0 && (
                              <span className="ml-1">({selectedDepartments[req.id].length})</span>
                            )}
                          </button>
                        </div>
                      ) : req.forwardedTo ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                          <div className="text-center space-y-3">
                            <div className="w-20 h-20 bg-emerald-100 border-2 border-emerald-600 rounded-xl flex items-center justify-center mx-auto">
                              <CheckCircle2 className="w-10 h-10 text-emerald-600" strokeWidth={2.5} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Forwarded to</p>
                              <p className="text-lg font-semibold text-gray-900 mt-1">{req.forwardedTo}</p>
                              {req.receiverName && (
                                <p className="text-sm text-gray-600 mt-1">{req.receiverName}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : req.status === 'rejected' ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                          <div className="text-center space-y-3">
                            <div className="w-20 h-20 bg-red-50 border-2 border-red-200 rounded-xl flex items-center justify-center mx-auto">
                              <X className="w-10 h-10 text-red-500" />
                            </div>
                            <p className="text-sm font-medium text-red-700">Request rejected</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center min-h-[300px]">
                          <div className="text-center space-y-3">
                            <div className="w-20 h-20 bg-gray-100 border-2 border-gray-200 rounded-xl flex items-center justify-center mx-auto">
                              <FileText className="w-10 h-10 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400">Awaiting approval</p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}

            {visibleRequests.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No requests found</p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default AdminRequestPage;