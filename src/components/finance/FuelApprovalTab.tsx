import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, Fuel, Printer, Droplets, Eye, Smartphone, Edit3,
  CheckSquare, Square, Building2, Truck, Phone, MapPin, User,
  FileText, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import getBaseUrl from '@/lib/config';

const BASE_URL = getBaseUrl().replace(/\/$/, '');

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type RequestStatus = 'pending' | 'sent_to_director' | 'approved' | 'rejected';
type RequestSource = 'driver_app' | 'manual' | 'vendor';

type StaffDetails  = { staff_name: string; staff_contact: string; staff_id: string };
type VehicleDetails = {
  owned_by?: string; company: string; model: string;
  type: string; last_service_date?: string; vehicle_number: string;
};
type VendorDetails = {
  vendor_name: string; vendor_contact: string;
  vendor_id: string; order_number: string;
};

type FuelRequest = {
  request_id: string;
  source: RequestSource;
  requestor_status: string;
  admin_ops_status: string;
  director_status: string;
  date: string;
  purpose: string;
  fuel_requested: number;
  staff_details?: StaffDetails;
  vehicle_details: VehicleDetails;
  vendor_details?: VendorDetails;
  receipt_no?: string;
  issue_type?: string;
  vendor_name?: string;
  vendor_code?: string;
  vendor_phone?: string;
  vendor_address?: string;
  location?: string;
  rate_per_ltr?: number;
  total_amount?: number;
  odometer_reading?: string;
  remarks?: string;
  issued_by?: string;
  reference_wo?: string;
};

const deriveStatus = (r: FuelRequest): RequestStatus => {
  if (r.admin_ops_status === 'rejected' || r.director_status === 'rejected') return 'rejected';
  if (r.director_status === 'approved' || r.director_status === 'approved_and_forwarded') return 'approved';
  if (r.admin_ops_status !== 'pending') return 'sent_to_director';
  return 'pending';
};

type ActiveTab = 'all' | RequestStatus;

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<RequestStatus, { label: string; pill: string; tabActive: string }> = {
  pending:          { label: 'Pending',           pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   tabActive: 'bg-amber-500 text-white border-amber-500'   },
  sent_to_director: { label: 'Sent to Director',  pill: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',     tabActive: 'bg-blue-600 text-white border-blue-600'     },
  approved:         { label: 'Approved',           pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', tabActive: 'bg-emerald-600 text-white border-emerald-600' },
  rejected:         { label: 'Rejected',           pill: 'bg-red-50 text-red-700 ring-1 ring-red-200',       tabActive: 'bg-red-600 text-white border-red-600'       },
};

const TAB_LIST: { key: ActiveTab; label: string; tabActive: string }[] = [
  { key: 'all',              label: 'All',              tabActive: 'bg-gray-800 text-white border-gray-800' },
  { key: 'pending',          label: 'Pending',          tabActive: STATUS_CONFIG.pending.tabActive          },
  { key: 'sent_to_director', label: 'Sent to Director', tabActive: STATUS_CONFIG.sent_to_director.tabActive },
  { key: 'approved',         label: 'Approved',         tabActive: STATUS_CONFIG.approved.tabActive         },
  { key: 'rejected',         label: 'Rejected',         tabActive: STATUS_CONFIG.rejected.tabActive         },
];

const genReceiptNo = () => `DIS-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
};

const fmtCurrency = (n: number) =>
  `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const FuelApprovalTab = () => {
  const [requests, setRequests]           = useState<FuelRequest[]>([]);
  const [loading, setLoading]             = useState(false);
  const [search, setSearch]               = useState('');
  const [activeTab, setActiveTab]         = useState<ActiveTab>('all');
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [viewRequest, setViewRequest]     = useState<FuelRequest | null>(null);
  const [receiptRequest, setReceiptRequest] = useState<FuelRequest | null>(null);
  const [allocating, setAllocating]       = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/fuels_consumables/get_director_pending_requests`)
      .then(r => r.json())
      .then((data: any) => {
        console.log('[FuelApprovalTab] API response:', data);
        const list = data?.pending_requests ?? data?.fuel_requests ?? data?.requests ?? data;
        if (Array.isArray(list)) setRequests(list);
        else toast.error(data?.message || 'Failed to load fuel requests');
      })
      .catch((err) => { console.error('[FuelApprovalTab] fetch error:', err); toast.error('Failed to load fuel requests'); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter(r => {
      const matchSearch = !q ||
        r.request_id.toLowerCase().includes(q) ||
        (r.staff_details?.staff_name ?? '').toLowerCase().includes(q) ||
        (r.vehicle_details?.vehicle_number ?? '').toLowerCase().includes(q) ||
        (r.vehicle_details?.model ?? '').toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q);
      const matchTab = activeTab === 'all' || deriveStatus(r) === activeTab;
      return matchSearch && matchTab;
    });
  }, [requests, search, activeTab]);

  const pendingInFiltered   = filtered.filter(r => deriveStatus(r) === 'pending');
  const allPendingSelected  = pendingInFiltered.length > 0 && pendingInFiltered.every(r => selectedIds.has(r.request_id));
  const selectedPendingIds  = [...selectedIds].filter(id => deriveStatus(requests.find(r => r.request_id === id)!) === 'pending');

  const countFor = (tab: ActiveTab) =>
    tab === 'all' ? requests.length : requests.filter(r => deriveStatus(r) === tab).length;

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(prev => { const n = new Set(prev); pendingInFiltered.forEach(r => n.delete(r.request_id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); pendingInFiltered.forEach(r => n.add(r.request_id)); return n; });
    }
  };

  const handleAllocateFuel = async () => {
    if (selectedPendingIds.length === 0) return;
    setAllocating(true);
    try {
      // TODO: replace with the actual fuel allocation endpoint when confirmed
      const res = await fetch(`${BASE_URL}/fuels_consumables/allocate_fuel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: selectedPendingIds }),
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Fuel allocation failed');
      setRequests(prev =>
        prev.map(r => selectedPendingIds.includes(r.request_id) ? { ...r, director_status: 'approved' } : r)
      );
      setSelectedIds(new Set());
      toast.success(`Fuel allocated for ${selectedPendingIds.length} request${selectedPendingIds.length > 1 ? 's' : ''}`);
    } catch (e: any) {
      toast.error(e?.message || 'Fuel allocation failed');
    } finally {
      setAllocating(false);
    }
  };

  const totalQty   = requests.filter(r => deriveStatus(r) !== 'rejected').reduce((s, r) => s + r.fuel_requested, 0);
  const totalValue = requests.filter(r => (r.total_amount ?? 0) > 0).reduce((s, r) => s + (r.total_amount ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary + action row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          {[
            { label: 'Total',        value: requests.length,                    color: 'text-gray-800'    },
            { label: 'Pending',      value: countFor('pending'),                color: 'text-amber-600'   },
            { label: 'Total (Ltrs)', value: totalQty.toLocaleString('en-IN'),   color: 'text-orange-600'  },
            { label: 'Total Value',  value: fmtCurrency(totalValue),            color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={cn('text-lg font-bold truncate mt-0.5', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {selectedPendingIds.length > 0 && (
          <Button
            onClick={handleAllocateFuel}
            disabled={allocating}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-sm shrink-0"
          >
            <Droplets className="w-4 h-4" />
            {allocating ? 'Allocating…' : `Allocate Fuel (${selectedPendingIds.length})`}
          </Button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {TAB_LIST.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()); }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors',
                isActive ? tab.tabActive : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              {tab.label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', isActive ? 'bg-white/25 text-current' : 'bg-gray-100 text-gray-600')}>
                {countFor(tab.key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by person, vehicle, purpose, request ID…"
          className="pl-9 bg-white border-gray-200 shadow-sm h-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <RefreshCw className="w-7 h-7 animate-spin opacity-40" />
          <p className="text-sm">Loading requests…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Fuel className="w-10 h-10 opacity-25" />
          <p className="text-sm font-medium">No fuel requests found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-700 transition-colors" title="Select all pending">
                      {allPendingSelected
                        ? <CheckSquare className="w-4 h-4 text-blue-600" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  {['Request ID', 'Source', 'Person / Vehicle', 'Purpose', 'Qty (Ltrs)', 'Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(req => {
                  const status      = deriveStatus(req);
                  const isSelected  = selectedIds.has(req.request_id);
                  const isPending   = status === 'pending';
                  const vehicleLabel = [req.vehicle_details?.type, req.vehicle_details?.vehicle_number].filter(Boolean).join(' · ');
                  return (
                    <tr key={req.request_id} className={cn('hover:bg-gray-50/80 transition-colors', isSelected && 'bg-blue-50/50')}>
                      <td className="px-4 py-3">
                        {isPending && (
                          <button onClick={() => toggleSelect(req.request_id)} className="text-gray-400 hover:text-blue-600 transition-colors">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold text-gray-900">{req.request_id}</p>
                        {req.receipt_no && <p className="text-[10px] text-gray-400 mt-0.5">{req.receipt_no}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
                          req.source === 'driver_app'
                            ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                            : req.source === 'vendor'
                              ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                              : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                        )}>
                          {req.source === 'driver_app'
                            ? <><Smartphone className="w-2.5 h-2.5" /> Driver App</>
                            : req.source === 'vendor'
                              ? <><Building2 className="w-2.5 h-2.5" /> Vendor</>
                              : <><Edit3 className="w-2.5 h-2.5" /> Manual</>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[150px]">
                          {req.source === 'vendor'
                            ? (req.vendor_details?.vendor_name || '—')
                            : (req.staff_details?.staff_name || '—')}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[150px] mt-0.5">{vehicleLabel || req.vehicle_details?.model || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[130px]">{req.purpose || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-orange-600">{(req.fuel_requested ?? 0).toLocaleString('en-IN')} L</span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-400 whitespace-nowrap">{fmtDate(req.date)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap', STATUS_CONFIG[status].pill)}>
                          {STATUS_CONFIG[status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewRequest(req)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="View details">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {status === 'approved' && (
                            <button onClick={() => setReceiptRequest(req)} className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors" title="Print receipt">
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewRequest && (
        <ViewRequestModal
          request={viewRequest}
          onClose={() => setViewRequest(null)}
          onPrintReceipt={deriveStatus(viewRequest) === 'approved' ? () => { setReceiptRequest(viewRequest); setViewRequest(null); } : undefined}
        />
      )}
      {receiptRequest && <ReceiptModal request={receiptRequest} onClose={() => setReceiptRequest(null)} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VIEW REQUEST MODAL
// ─────────────────────────────────────────────────────────────
const ViewRequestModal = ({ request: req, onClose, onPrintReceipt }: {
  request: FuelRequest; onClose: () => void; onPrintReceipt?: () => void;
}) => (
  <Dialog open onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-500" />
          Request Details — {req.request_id}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-1">
        {(() => {
          const status = deriveStatus(req);
          return (
            <div className="flex items-center justify-between">
              <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', STATUS_CONFIG[status].pill)}>
                {STATUS_CONFIG[status].label}
              </span>
              <div className="flex items-center gap-2.5">
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  req.source === 'driver_app' ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                )}>
                  {req.source === 'driver_app' ? <><Smartphone className="w-3 h-3" /> Driver App</> : <><Edit3 className="w-3 h-3" /> Manual</>}
                </span>
                <span className="text-xs text-gray-400">{fmtDate(req.date)}</span>
              </div>
            </div>
          );
        })()}

        {req.vendor_details && (
          <Section title="Vendor Details" color="orange">
            <div className="grid grid-cols-2 gap-2">
              <DetailRow icon={Building2} label="Vendor Name" value={req.vendor_details.vendor_name} />
              <DetailRow icon={FileText}  label="Vendor ID"   value={req.vendor_details.vendor_id} />
              <DetailRow icon={Phone}     label="Contact"     value={req.vendor_details.vendor_contact} />
              <DetailRow icon={FileText}  label="PO / WO No." value={req.vendor_details.order_number} />
            </div>
          </Section>
        )}

        {req.staff_details ? (
          <Section title="Issued To" color="blue">
            <div className="grid grid-cols-2 gap-2">
              <DetailRow icon={User}     label="Person Name" value={req.staff_details.staff_name} />
              <DetailRow icon={Phone}    label="Contact"     value={req.staff_details.staff_contact} />
              <DetailRow icon={FileText} label="Purpose"     value={req.purpose} />
              <DetailRow icon={MapPin}   label="Location"    value={req.location ?? '—'} />
            </div>
          </Section>
        ) : (
          <Section title="Request Info" color="blue">
            <div className="grid grid-cols-2 gap-2">
              <DetailRow icon={FileText} label="Purpose"  value={req.purpose} />
              {req.location && <DetailRow icon={MapPin} label="Location" value={req.location} />}
            </div>
          </Section>
        )}

        <Section title="Vehicle Details" color="gray">
          <div className="grid grid-cols-2 gap-2">
            <DetailRow icon={Truck}     label="Type"         value={req.vehicle_details?.type ?? '—'} />
            <DetailRow icon={Truck}     label="Model"        value={req.vehicle_details?.model ?? '—'} />
            <DetailRow icon={FileText}  label="Vehicle No."  value={req.vehicle_details?.vehicle_number ?? '—'} />
            <DetailRow icon={Building2} label="Company"      value={req.vehicle_details?.company ?? '—'} />
            <DetailRow icon={FileText}  label="Owned By"     value={req.vehicle_details?.owned_by ?? '—'} />
            <DetailRow icon={FileText}  label="Last Service" value={req.vehicle_details?.last_service_date ?? '—'} />
          </div>
        </Section>

        <Section title="Fuel Issue Details" color="green">
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: 'Quantity',         value: `${req.fuel_requested.toLocaleString('en-IN')} Ltr`, highlight: true  },
              { label: 'Rate (Per Ltr)',   value: (req.rate_per_ltr ?? 0) > 0 ? fmtCurrency(req.rate_per_ltr!) : '—',  highlight: false },
              { label: 'Total Amount',     value: (req.total_amount ?? 0) > 0 ? fmtCurrency(req.total_amount!) : '—',  highlight: false },
              { label: 'Odometer / Hours', value: req.odometer_reading || '—',                                          highlight: false },
            ].map(d => (
              <div key={d.label} className="rounded-lg bg-white border border-gray-100 p-3 shadow-sm">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{d.label}</p>
                <p className={cn('text-base font-bold mt-1', d.highlight ? 'text-emerald-600' : 'text-gray-800')}>{d.value}</p>
              </div>
            ))}
          </div>
        </Section>

        {(req.remarks || req.issued_by || req.reference_wo) && (
          <Section title="Additional Information" color="gray">
            <div className="grid grid-cols-2 gap-2">
              {req.issued_by    && <DetailRow icon={User}     label="Issued By"  value={req.issued_by} />}
              {req.reference_wo && <DetailRow icon={FileText} label="Reference"  value={req.reference_wo} />}
              {req.remarks      && <div className="col-span-2"><DetailRow icon={FileText} label="Remarks" value={req.remarks} /></div>}
            </div>
          </Section>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
        {onPrintReceipt && (
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={onPrintReceipt}>
            <Printer className="w-4 h-4" /> Print Receipt
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ─────────────────────────────────────────────────────────────
// RECEIPT MODAL
// ─────────────────────────────────────────────────────────────
const ReceiptModal = ({ request: req, onClose }: { request: FuelRequest; onClose: () => void }) => {
  const receiptNo = req.receipt_no || genReceiptNo();
  const printRef  = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank', 'width=820,height=1000');
    if (!win) { toast.error('Pop-up blocked — please allow pop-ups to print'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Diesel Issue Receipt — ${receiptNo}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:28px;max-width:780px;margin:0 auto}
        h1{font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em}
        .subtitle{font-size:12px;color:#666;margin-top:4px}
        .meta{display:flex;justify-content:space-between;font-size:13px;margin-bottom:12px}
        .box{border:1px solid #ccc;border-radius:6px;margin-bottom:12px;overflow:hidden}
        .box-title{background:#f3f4f6;border-bottom:1px solid #ccc;padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em}
        .box-body{padding:12px 14px}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}
        .grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0;border-top:1px solid #eee}
        .grid4-cell{padding:10px 12px;text-align:center;border-right:1px solid #eee}
        .grid4-cell:last-child{border-right:none}
        .label{font-size:11px;color:#666}
        .val-big{font-size:20px;font-weight:700;color:#059669;margin-top:4px}
        .val-med{font-size:16px;font-weight:700;margin-top:4px}
        .sig{text-align:right;margin-top:16px;font-size:12px;color:#666}
        .sig-line{letter-spacing:0.15em;font-size:16px;color:#bbb;margin-top:20px}
        .footer{border-top:1px solid #ddd;margin-top:16px;padding-top:10px;text-align:center;font-size:11px;color:#999}
        b{font-weight:600}
      </style>
    </head><body>
      <div style="text-align:center;border-bottom:2px solid #111;padding-bottom:12px">
        <h1>Diesel Issue Receipt</h1>
        <p class="subtitle">SBR Agri Management System</p>
      </div>
      <div class="meta" style="margin-top:12px">
        <div><p><b>Receipt No:</b> ${receiptNo}</p><p style="margin-top:4px"><b>Date:</b> ${fmtDate(req.date)}</p></div>
        <div style="text-align:right"><p><b>Issue Type:</b> ${req.issue_type || 'Diesel Issue'}</p></div>
      </div>
      <div class="box">
        <div class="box-title">Diesel Vendor Details</div>
        <div class="box-body grid2">
          <p><b>Vendor Name:</b> ${req.vendor_details?.vendor_name || req.vendor_name || '—'}</p>
          <p><b>Vendor ID:</b> ${req.vendor_details?.vendor_id || req.vendor_code || '—'}</p>
          <p><b>Contact:</b> ${req.vendor_details?.vendor_contact || req.vendor_phone || '—'}</p>
          <p><b>PO / WO No.:</b> ${req.vendor_details?.order_number || req.reference_wo || '—'}</p>
        </div>
      </div>
      <div class="box">
        <div class="box-title">Diesel Issued To</div>
        <div class="box-body grid2">
          <p><b>Person Name:</b> ${req.staff_details?.staff_name || '—'}</p>
          <p><b>Purpose (For What):</b> ${req.purpose || '—'}</p>
          <p><b>Contact:</b> ${req.staff_details?.staff_contact || '—'}</p>
          <p><b>Vehicle:</b> ${[req.vehicle_details?.type, req.vehicle_details?.vehicle_number].filter(Boolean).join(' · ') || '—'}</p>
          <p><b>Model:</b> ${req.vehicle_details?.model || '—'}</p>
          <p><b>Location:</b> ${req.location || '—'}</p>
        </div>
      </div>
      <div class="box">
        <div class="box-title">Diesel Issue Details</div>
        <div class="grid4">
          <div class="grid4-cell"><p class="label">Diesel Quantity</p><p class="val-big">${req.fuel_requested.toFixed(2)} Ltr</p></div>
          <div class="grid4-cell"><p class="label">Rate (Per Ltr)</p><p class="val-med">${(req.rate_per_ltr ?? 0) > 0 ? fmtCurrency(req.rate_per_ltr!) : '—'}</p></div>
          <div class="grid4-cell"><p class="label">Total Amount</p><p class="val-med">${(req.total_amount ?? 0) > 0 ? fmtCurrency(req.total_amount!) : '—'}</p></div>
          <div class="grid4-cell"><p class="label">Odometer/Hour Reading</p><p class="val-med">${req.odometer_reading || '—'}</p></div>
        </div>
      </div>
      <div class="box">
        <div class="box-title">Additional Information</div>
        <div class="box-body grid2">
          <p><b>Remarks:</b> ${req.remarks || '—'}</p>
          <p><b>Issue Date &amp; Time:</b> ${fmtDate(req.date)}</p>
          <p><b>Issued By:</b> ${req.issued_by || '—'}</p>
          <p><b>Reference:</b> ${req.reference_wo || '—'}</p>
        </div>
      </div>
      <div class="sig"><p>Received By (Name &amp; Signature)</p><p class="sig-line">— — — — — — — — — — — — — — —</p></div>
      <div class="footer">
        <p>This is a computer-generated receipt and does not require a signature.</p>
        <p>For queries, contact: support@sbragri.com</p>
      </div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            Diesel Issue Receipt — {receiptNo}
          </DialogTitle>
        </DialogHeader>
        <div ref={printRef} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 text-sm">
          <div className="text-center pb-4 border-b-2 border-gray-800">
            <h2 className="text-2xl font-black tracking-wide uppercase text-gray-900">Diesel Issue Receipt</h2>
            <p className="text-xs text-gray-500 mt-1">SBR Agri Management System</p>
          </div>
          <div className="flex justify-between text-sm">
            <div className="space-y-1">
              <p><span className="font-bold">Receipt No:</span> {receiptNo}</p>
              <p><span className="font-bold">Date:</span> {fmtDate(req.date)}</p>
            </div>
            <div className="text-right">
              <p><span className="font-bold">Issue Type:</span> {req.issue_type || 'Diesel Issue'}</p>
            </div>
          </div>
          <RBox title="Diesel Vendor Details">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <p><span className="font-semibold">Vendor Name:</span> {req.vendor_details?.vendor_name || req.vendor_name || '—'}</p>
              <p><span className="font-semibold">Vendor ID:</span> {req.vendor_details?.vendor_id || req.vendor_code || '—'}</p>
              <p><span className="font-semibold">Contact:</span> {req.vendor_details?.vendor_contact || req.vendor_phone || '—'}</p>
              <p><span className="font-semibold">PO / WO No.:</span> {req.vendor_details?.order_number || req.reference_wo || '—'}</p>
            </div>
          </RBox>
          <RBox title="Diesel Issued To">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <p><span className="font-semibold">Person Name:</span> {req.staff_details?.staff_name || '—'}</p>
              <p><span className="font-semibold">Purpose (For What):</span> {req.purpose || '—'}</p>
              <p><span className="font-semibold">Contact:</span> {req.staff_details?.staff_contact || '—'}</p>
              <p><span className="font-semibold">Vehicle:</span> {[req.vehicle_details?.type, req.vehicle_details?.vehicle_number].filter(Boolean).join(' · ') || '—'}</p>
              <p><span className="font-semibold">Model:</span> {req.vehicle_details?.model || '—'}</p>
              <p><span className="font-semibold">Location:</span> {req.location || '—'}</p>
            </div>
          </RBox>
          <RBox title="Diesel Issue Details">
            <div className="grid grid-cols-4 divide-x divide-gray-200">
              {[
                { label: 'Diesel Quantity',       val: `${req.fuel_requested.toFixed(2)} Ltr`,                                          big: true  },
                { label: 'Rate (Per Ltr)',         val: (req.rate_per_ltr ?? 0) > 0 ? fmtCurrency(req.rate_per_ltr!) : '—',             big: false },
                { label: 'Total Amount',           val: (req.total_amount ?? 0) > 0 ? fmtCurrency(req.total_amount!) : '—',             big: false },
                { label: 'Odometer/Hour Reading',  val: req.odometer_reading || '—',                                                    big: false },
              ].map(d => (
                <div key={d.label} className="px-3 py-3 text-center">
                  <p className="text-[11px] text-gray-500">{d.label}</p>
                  <p className={cn('font-bold mt-1', d.big ? 'text-2xl text-emerald-600 leading-none' : 'text-xl text-gray-800')}>{d.val}</p>
                </div>
              ))}
            </div>
          </RBox>
          <RBox title="Additional Information">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <p><span className="font-semibold">Remarks:</span> {req.remarks || '—'}</p>
              <p><span className="font-semibold">Issue Date &amp; Time:</span> {fmtDate(req.date)}</p>
              <p><span className="font-semibold">Issued By:</span> {req.issued_by || '—'}</p>
              <p><span className="font-semibold">Reference:</span> {req.reference_wo || '—'}</p>
            </div>
          </RBox>
          <div className="flex justify-end pt-2">
            <div className="text-right text-sm">
              <p className="text-gray-500 text-xs">Received By (Name &amp; Signature)</p>
              <p className="text-gray-300 mt-5 tracking-[0.2em] text-base">— — — — — — — — — — — — —</p>
            </div>
          </div>
          <div className="text-center text-[11px] text-gray-400 border-t border-gray-200 pt-3">
            <p>This is a computer-generated receipt and does not require a signature.</p>
            <p>For queries, contact: support@sbragri.com</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────
// LOCAL SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────
type SectionColor = 'orange' | 'blue' | 'green' | 'gray';
const COLORS: Record<SectionColor, { wrapper: string; title: string }> = {
  orange: { wrapper: 'border-orange-200 bg-orange-50/30',   title: 'text-orange-700'  },
  blue:   { wrapper: 'border-blue-200 bg-blue-50/30',       title: 'text-blue-700'    },
  green:  { wrapper: 'border-emerald-200 bg-emerald-50/30', title: 'text-emerald-700' },
  gray:   { wrapper: 'border-gray-200 bg-gray-50/30',       title: 'text-gray-600'    },
};
const Section = ({ title, color = 'gray', children }: { title: string; color?: SectionColor; children: React.ReactNode }) => (
  <div className={cn('rounded-xl border p-4', COLORS[color].wrapper)}>
    <p className={cn('text-[11px] font-bold uppercase tracking-wider mb-3', COLORS[color].title)}>{title}</p>
    {children}
  </div>
);
const RBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-gray-300 overflow-hidden">
    <div className="bg-gray-100 border-b border-gray-300 px-4 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-700">{title}</p>
    </div>
    <div className="p-4">{children}</div>
  </div>
);
const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-start gap-2 min-w-0">
    <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-800 break-words">{value || '—'}</p>
    </div>
  </div>
);

export default FuelApprovalTab;
