import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, ClipboardList, FileText, Lock, SendHorizonal, ShoppingCart, Unlock, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ComparativeStatementPreview,
  type ComparativeModel,
} from '@/components/purchase/ComparativeStatementPreview';
import { PRPreview, type PRPreviewIndent, type PRPreviewLineItem } from '@/components/purchase/PRPreview';
import { getBaseUrl } from '@/lib/config';
import { MakePurchaseOrderPopup } from '@/components/ho-inbox/MakePurchaseOrderPopup';

type Props = {
  item: ComparativeModel;
  onOpen: (indentId: string) => void;
  onUpdate: (indentId: string, patch: Partial<ComparativeModel>) => void;
  defaultOpen?: boolean;
  defaultTab?: 'indent' | 'comparative' | 'po';
};

type ApiIndentPerson = {
  name_id?: unknown;
  signature?: unknown;
  timestamp?: unknown;
};

type ApiIndentItemRow = {
  sr_no?: unknown;
  part_name?: unknown;
  item_code?: unknown;
  uom?: unknown;
  total_qty_required?: unknown;
  less_qty_available_in_stock?: unknown;
  net_pr_qty?: unknown;
  rate_per_item?: unknown;
  approx_value?: unknown;
  procurement_lead_time_weeks?: unknown;
  indigenous_or_imported?: unknown;
  preferred_vendor_name?: unknown;
  validity_of_warranty_and_guarantee?: unknown;
  full_life_hr?: unknown;
  actual_life_hr?: unknown;
  reason_for_replacement?: unknown;
  repairing_possibility?: unknown;
  material_required_by_date?: unknown;
  specification?: unknown;
};

type ApiIndentPayload = {
  project?: unknown;
  item_row?: unknown;
};

type ApiIndent = {
  pr_number?: unknown;
  department?: unknown;
  created_at?: unknown;
  notes?: unknown;
  indent_data?: unknown;
  indented_by?: unknown;
  forwarded_by?: unknown;
  approved_by?: unknown;
};

const PO_NEXT_PROCESS_OPTIONS = [
  { id: 'po_acceptance_wo_acceptance', label: 'PO acceptance / WO Acceptance (WO: Work order)' },
  { id: 'delivery_timeline_work_completion', label: 'Delivery timeline (PO) / Work completion timeline (WO)' },
  { id: 'proforma_invoice', label: 'Proforma invoice' },
  { id: 'progress_inspection_report', label: 'Progress (WO) / Inspection report (PO)' },
  { id: 'grn_completion_certificate', label: 'GRN (PO) / Completion certificate (WO)' },
  { id: 'prr', label: 'PRR (payment requisition receipt)' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'e_way_bill', label: 'E way bill' },
  { id: 'warranty_guarantee_card', label: 'Warranty / Guarantee card' },
] as const;

type PoNextProcessId = (typeof PO_NEXT_PROCESS_OPTIONS)[number]['id'];

const PO_DOC_BY_STEP: Record<PoNextProcessId, string> = {
  po_acceptance_wo_acceptance: 'po acceptance',
  delivery_timeline_work_completion: 'delivery timeline',
  proforma_invoice: 'proforma invoice',
  progress_inspection_report: 'inspection report',
  grn_completion_certificate: 'grn',
  prr: 'prr',
  invoice: 'invoice',
  e_way_bill: 'e way bill',
  warranty_guarantee_card: 'warranty / guarantee card',
};

const buildPurchaseFlowStage = (series: PoNextProcessId[]) => {
  const stage: Record<
    string,
    {
      document: string;
      status: 'empty';
      doc_link: string;
    }
  > = {};

  series.forEach((id, idx) => {
    stage[`step_${idx + 1}`] = {
      document: PO_DOC_BY_STEP[id] || String(id).replace(/_/g, ' '),
      status: 'empty',
      doc_link: '',
    };
  });

  return stage;
};

const safeTrim = (v: unknown) => String(v ?? '').trim();

const numOr0 = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
};

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const normalizeIndigenousOrImported = (v: unknown): 'Indigenous' | 'Imported' => {
  const s = safeTrim(v).toLowerCase();
  if (s.includes('import')) return 'Imported';
  return 'Indigenous';
};

const normalizeRepairing = (v: unknown): 'Yes' | 'No' | 'NA' => {
  const s = safeTrim(v).toLowerCase();
  if (s === 'yes') return 'Yes';
  if (s === 'no') return 'No';
  return 'NA';
};

function StepPill({
  label,
  done,
  sub,
}: {
  label: string;
  done: boolean;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <div
        className={
          'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold border ' +
          (done
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-slate-50 border-slate-200 text-slate-500')
        }
      >
        {done ? <Check className="h-3 w-3 shrink-0" /> : null}
        {label}
      </div>
      {sub ? (
        <span className="text-[10px] text-slate-400 tabular-nums">{sub}</span>
      ) : null}
    </div>
  );
}

function InlineTracker({
  steps,
}: {
  steps: Array<{ label: string; done: boolean; sub?: string }>;
}) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, idx) => (
        <div key={s.label} className="flex items-center gap-1">
          <StepPill label={s.label} done={s.done} sub={s.sub} />
          {idx < steps.length - 1 ? (
            <div className={
              'h-px w-5 shrink-0 ' +
              (s.done ? 'bg-emerald-300' : 'bg-slate-200')
            } />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ComparativeQuotationApprovalRow({ item, onUpdate, defaultOpen, defaultTab }: Props) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [approving, setApproving] = useState(false);
  const [makePoOpen, setMakePoOpen] = useState(false);
  const [poForwardDialogOpen, setPoForwardDialogOpen] = useState(false);
  const [poForwarding, setPoForwarding] = useState(false);
  const didCheckPoRef = useRef<string>('');

  const [poNextProcessSeries, setPoNextProcessSeries] = useState<PoNextProcessId[]>(() => {
    const existing = (item as any)?.poNextProcessSeries;
    if (Array.isArray(existing) && existing.length) return existing as PoNextProcessId[];
    return PO_NEXT_PROCESS_OPTIONS.map((x) => x.id) as PoNextProcessId[];
  });

  const [activeTab, setActiveTab] = useState<'indent' | 'comparative' | 'po'>(() => defaultTab ?? 'comparative');

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  const [indentLoading, setIndentLoading] = useState(false);
  const [indentError, setIndentError] = useState<string | null>(null);
  const [indent, setIndent] = useState<ApiIndent | null>(null);
  const [indentLoadedFor, setIndentLoadedFor] = useState<string>('');

  const normStatus = (v: unknown) => String(v ?? '').trim().toLowerCase();

  const tcStatusLower = normStatus((item as any)?.tcStatus ?? (item as any)?.TC_status);
  const nfaStatusLower = normStatus((item as any)?.nfaStatus ?? (item as any)?.NFA_status);

  const approvedVendorId = String((item as any)?.tcApprovedVendorId ?? '').trim();
  const isApproved = tcStatusLower === 'approved' || Boolean(approvedVendorId);

  const vendors = useMemo(() => (Array.isArray(item?.vendors) ? item.vendors : []), [item]);
  const selectedVendorId = String(item?.hoSelectedVendorId ?? '').trim();
  const canApprove = !isApproved;

  const tcAt = String((item as any)?.tcApprovedAt ?? '').trim();
  const poCreatedAt = String((item as any)?.poCreatedAt ?? '').trim();
  const poNo = String((item as any)?.poNo ?? (item as any)?.order_number ?? '').trim();
  const poStatus = String((item as any)?.poStatus ?? '').trim().toLowerCase();

  const hoLocked = Boolean((item as any)?.hoLocked);

  const tcDone = tcStatusLower === 'approved' || Boolean(approvedVendorId);
  const nfaDone = nfaStatusLower === 'approved';
  const poDone = poStatus === 'created' || poStatus === 'forwarded' || Boolean(poNo) || Boolean(poCreatedAt);
  const poForwarded = poStatus === 'forwarded';

  useEffect(() => {
    // Best-effort: detect existing PO from backend so button states are correct on refresh.
    const prNo = safeTrim((item as any)?.pr_number) || safeTrim(item.indentId);
    if (!prNo) return;
    if (poDone && poStatus) return;

    if (didCheckPoRef.current === prNo) return;
    didCheckPoRef.current = prNo;

    const baseUrl = String(getBaseUrl() ?? '').replace(/\/$/, '');
    if (!baseUrl) return;

    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${baseUrl}/purchase_flow/get_purchase_orders/`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pr_number: prNo }),
          signal: ac.signal,
        });

        if (!res.ok) return;
        const data: any = await res.json().catch(() => null);
        const list: any[] = Array.isArray(data?.purchase_orders)
          ? data.purchase_orders
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.orders)
              ? data.orders
              : Array.isArray(data)
                ? data
                : [];

        const ts = (x: any) => {
          const raw = safeTrim(x?.updated_at) || safeTrim(x?.created_at) || safeTrim(x?.saved_at);
          const t = raw ? Date.parse(raw) : NaN;
          return Number.isFinite(t) ? t : 0;
        };

        const latest = [...list].sort((a, b) => ts(b) - ts(a))[0] ?? null;
        if (!latest) return;

        const orderNo = safeTrim(latest?.order_number) || safeTrim(latest?.orderNo) || safeTrim(latest?.poNo);
        const status = safeTrim(latest?.status).toLowerCase();
        if (!orderNo && !status) return;

        const createdAt = safeTrim(latest?.created_at) || safeTrim(latest?.updated_at) || safeTrim(latest?.saved_at);
        onUpdate(
          item.indentId,
          {
            poNo: orderNo || undefined,
            poStatus: status || undefined,
            poCreatedAt: createdAt || (orderNo || status ? new Date().toISOString() : undefined),
          } as any
        );
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        // silent
      }
    })();

    return () => ac.abort();
  }, [item, onUpdate, poDone, poStatus]);

  const fmt = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const mapIndentToPreview = (apiIndent: ApiIndent): PRPreviewIndent => {
    const indentData = ((apiIndent as any)?.indent_data ?? null) as ApiIndentPayload | null;
    const rows = asArray<ApiIndentItemRow>((indentData as any)?.item_row);

    const project = safeTrim((indentData as any)?.project);
    const prNo = safeTrim((apiIndent as any)?.pr_number) || safeTrim(item.indentId);
    const department = safeTrim((apiIndent as any)?.department);
    const createdAt = safeTrim((apiIndent as any)?.created_at);
    const notes = safeTrim((apiIndent as any)?.notes);

    const indentedBy = ((apiIndent as any)?.indented_by ?? null) as ApiIndentPerson | null;
    const forwardedBy = ((apiIndent as any)?.forwarded_by ?? null) as ApiIndentPerson | null;
    const approvedBy = ((apiIndent as any)?.approved_by ?? null) as ApiIndentPerson | null;

    const items: PRPreviewLineItem[] = rows.map((r, idx) => {
      const srNo = numOr0((r as any)?.sr_no) || idx + 1;
      return {
        id: `prli-${prNo || 'x'}-${srNo}-${idx}`,
        srNo,
        itemCode: safeTrim((r as any)?.item_code),
        partName: safeTrim((r as any)?.part_name),
        specification: safeTrim((r as any)?.specification),
        uom: safeTrim((r as any)?.uom),
        totalQtyRequired: numOr0((r as any)?.total_qty_required),
        lessQtyAvailableInStock: numOr0((r as any)?.less_qty_available_in_stock),
        procurementLeadTimeWeeks: numOr0((r as any)?.procurement_lead_time_weeks),
        materialRequiredByDate: safeTrim((r as any)?.material_required_by_date),
        indigenousOrImported: normalizeIndigenousOrImported((r as any)?.indigenous_or_imported),
        ratePerItem: numOr0((r as any)?.rate_per_item),
        preferredVendorName: safeTrim((r as any)?.preferred_vendor_name),
        validityOfWarrantyAndGuarantee: safeTrim((r as any)?.validity_of_warranty_and_guarantee),
        fullLifeHr: safeTrim((r as any)?.full_life_hr),
        actualLifeHr: safeTrim((r as any)?.actual_life_hr),
        reasonForReplacement: safeTrim((r as any)?.reason_for_replacement),
        repairingPossibility: normalizeRepairing((r as any)?.repairing_possibility),
      };
    });

    return {
      project,
      prNo,
      date: fmt(createdAt) || createdAt || '',
      department,
      indentedBy: safeTrim((indentedBy as any)?.name_id),
      indentedBySignature: safeTrim((indentedBy as any)?.signature) || undefined,
      indentedByTimestamp: fmt(safeTrim((indentedBy as any)?.timestamp)) || undefined,
      forwardedBy: safeTrim((forwardedBy as any)?.name_id),
      forwardedBySignature: safeTrim((forwardedBy as any)?.signature) || undefined,
      forwardedByTimestamp: fmt(safeTrim((forwardedBy as any)?.timestamp)) || undefined,
      directorsApproval: safeTrim((approvedBy as any)?.name_id),
      directorsApprovalSignature: safeTrim((approvedBy as any)?.signature) || undefined,
      directorsApprovalTimestamp: fmt(safeTrim((approvedBy as any)?.timestamp)) || undefined,
      remarksNotes: notes,
      budgetHead: '—',
      items,
    };
  };

  useEffect(() => {
    if (!open) return;
    if (activeTab !== 'indent') return;

    const prNumber = safeTrim(item.indentId);
    if (!prNumber) return;
    if (indentLoadedFor === prNumber && indent) return;
    if (indentLoading) return;

    const ac = new AbortController();
    const load = async () => {
      const baseUrl = String(getBaseUrl() ?? '').replace(/\/$/, '');
      if (!baseUrl) {
        setIndentError('Missing API base URL');
        return;
      }

      setIndentLoading(true);
      setIndentError(null);

      try {
        const url = `${baseUrl}/purchase_flow/get_indent`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pr_number: prNumber }),
          signal: ac.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(errText || `HTTP ${res.status}`);
        }

        const json: any = await res.json().catch(() => null);
        const nextIndent = (json && typeof json === 'object' ? (json as any).indent : null) as ApiIndent | null;
        if (!nextIndent) {
          setIndent(null);
          setIndentLoadedFor(prNumber);
          return;
        }

        setIndent(nextIndent);
        setIndentLoadedFor(prNumber);
      } catch (e: any) {
        if (ac.signal.aborted || e?.name === 'AbortError') return;
        const msg = safeTrim(e?.message ?? e);
        setIndentError(msg || 'Failed to load indent');
        toast.error(`Failed to load indent${msg ? `: ${msg}` : ''}`);
      } finally {
        setIndentLoading(false);
      }
    };

    void load();
    return () => ac.abort();
  }, [open, activeTab, item.indentId, indentLoadedFor]);

  const setSelectedVendor = (vendorId: string) => {
    onUpdate(item.indentId, { hoSelectedVendorId: vendorId });
  };

  const approveNow = async () => {
    if (!canApprove || approving) return;

    const comparisonId = String((item as any)?.comparisonId ?? '').trim();
    if (!comparisonId) {
      toast.error('Missing comparison id for this TC');
      return;
    }

    if (!selectedVendorId) {
      toast.error('Select a vendor first');
      return;
    }

    const baseUrl = String(getBaseUrl() ?? '').replace(/\/$/, '');
    if (!baseUrl) {
      toast.error('Missing API base URL');
      return;
    }

    setApproving(true);
    try {
      const url = `${baseUrl}/purchase_flow/approve_TC`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comparison_id: comparisonId,
          approved_vendor_id: selectedVendorId,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const json: any = await res.json().catch(() => null);
      const success = Boolean(json && (json.success === true || String(json.success).toLowerCase() === 'true'));
      if (!success) throw new Error('Approval failed');

      const nowIso = new Date().toISOString();
      onUpdate(item.indentId, {
        hoSelectedVendorId: selectedVendorId,
        tcApprovedVendorId: selectedVendorId,
        tcApprovedAt: nowIso,
        technicalRecommendationVendorId: undefined,
        technicalRecommendedVendorId: undefined,
      });

      toast.success('TC approved');
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? '').trim();
      toast.error(`Failed to approve TC${msg ? `: ${msg}` : ''}`);
    } finally {
      setApproving(false);
    }
  };

  const openMakePo = () => {
    const selectedVendorId = String(item?.hoSelectedVendorId ?? '').trim();
    if (!selectedVendorId) return toast.error('Select a vendor first');
    if (!tcDone) return toast.error('Approve TC first');
    setMakePoOpen(true);
  };

  const openEditPo = () => {
    if (!poDone) return;
    const selectedVendorId = String(item?.hoSelectedVendorId ?? '').trim();
    if (!selectedVendorId) return toast.error('Select a vendor first');
    setMakePoOpen(true);
  };

  const forwardPo = () => {
    if (!poDone) return;
    if (poForwarded) return toast.message('PO already forwarded');
    const existing = (item as any)?.poNextProcessSeries;
    if (Array.isArray(existing) && existing.length) setPoNextProcessSeries(existing as PoNextProcessId[]);
    else setPoNextProcessSeries(PO_NEXT_PROCESS_OPTIONS.map((x) => x.id) as PoNextProcessId[]);
    setPoForwardDialogOpen(true);
  };

  const trackerSteps = [
    {
      label: 'TC',
      done: tcDone,
      sub: tcAt ? fmt(tcAt) : (item.lastSavedAt ? fmt(item.lastSavedAt) : undefined),
    },
    {
      label: 'NFA',
      done: nfaDone,
      sub: nfaDone ? (item.lastSavedAt ? fmt(item.lastSavedAt) : undefined) : undefined,
    },
    {
      label: 'PO',
      done: poDone,
      sub: poCreatedAt ? fmt(poCreatedAt) : undefined,
    },
  ];

  return (
    <>
      <Dialog open={poForwardDialogOpen} onOpenChange={setPoForwardDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0">

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="px-6 pt-6 pb-4 border-b border-border bg-muted/30">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                <SendHorizonal className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-bold tracking-tight">Forward Purchase Order</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Define the document workflow that must be completed after this PO is forwarded. Arrange the steps in the required sequence.
                </DialogDescription>
              </div>
            </div>

            {/* PO meta strip */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-muted-foreground uppercase tracking-widest">PR No.</span>
                <span className="font-semibold text-foreground">{item.indentId}</span>
              </div>
              {poNo && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-muted-foreground uppercase tracking-widest">PO No.</span>
                  <span className="font-semibold text-foreground">{poNo}</span>
                </div>
              )}
              {(item as any).hoSelectedVendorId && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-muted-foreground uppercase tracking-widest">Vendor</span>
                  <span className="font-semibold text-foreground">{String((item as any).hoSelectedVendorId)}</span>
                </div>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                  poNextProcessSeries.length > 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {poNextProcessSeries.length > 0 ? <Check className="h-3 w-3" /> : null}
                  {poNextProcessSeries.length} step{poNextProcessSeries.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
          </div>

          {/* ── Body ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] divide-y md:divide-y-0 md:divide-x divide-border max-h-[60vh] overflow-hidden">

            {/* Left – available checklist */}
            <div className="flex flex-col">
              <div className="px-5 py-3 border-b border-border bg-muted/20">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Available Processes</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Check to add to the workflow.</div>
              </div>
              <div className="overflow-y-auto px-3 py-3 space-y-1.5">
                {PO_NEXT_PROCESS_OPTIONS.map((opt, optIdx) => {
                  const checked = poNextProcessSeries.includes(opt.id);
                  const stepPos = poNextProcessSeries.indexOf(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className={`group flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                        checked
                          ? 'bg-background border-foreground/20 shadow-sm'
                          : 'bg-transparent border-transparent hover:bg-muted/40 hover:border-border'
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const add = Boolean(v);
                          setPoNextProcessSeries((prev) => {
                            if (add && !prev.includes(opt.id)) return [...prev, opt.id];
                            if (!add) return prev.filter((x) => x !== opt.id);
                            return prev;
                          });
                        }}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-[12px] leading-4 font-medium ${
                          checked ? 'text-foreground' : 'text-muted-foreground'
                        }`}>{opt.label}</div>
                      </div>
                      {checked ? (
                        <div className="shrink-0 h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center tabular-nums">
                          {stepPos + 1}
                        </div>
                      ) : (
                        <div className="shrink-0 h-5 w-5 rounded-full border border-dashed border-muted-foreground/30 text-[10px] text-muted-foreground/40 flex items-center justify-center">
                          {optIdx + 1}
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Right – ordered workflow */}
            <div className="flex flex-col">
              <div className="px-5 py-3 border-b border-border bg-muted/20">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Document Workflow</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">The steps in sequence as they must be completed.</div>
              </div>
              <div className="overflow-y-auto px-4 py-4">
                {poNextProcessSeries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">No steps added yet</div>
                    <div className="text-xs text-muted-foreground/70">Select processes from the left panel to build the workflow.</div>
                  </div>
                ) : (
                  <ol className="relative space-y-0">
                    {poNextProcessSeries.map((id, idx) => {
                      const opt = PO_NEXT_PROCESS_OPTIONS.find((x) => x.id === id);
                      const isFirst = idx === 0;
                      const isLast = idx === poNextProcessSeries.length - 1;
                      return (
                        <li key={id} className="flex gap-3">
                          {/* Connector column */}
                          <div className="flex flex-col items-center shrink-0 w-7">
                            <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                              'bg-foreground border-foreground text-background'
                            } text-[11px] font-bold tabular-nums`}>
                              {idx + 1}
                            </div>
                            {!isLast && (
                              <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[20px]" />
                            )}
                          </div>

                          {/* Card */}
                          <div className={`flex-1 min-w-0 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 mb-2 shadow-sm`}>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-semibold text-foreground leading-4">{opt?.label || id}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() =>
                                  setPoNextProcessSeries((prev) => {
                                    if (idx <= 0) return prev;
                                    const next = [...prev];
                                    const tmp = next[idx - 1]; next[idx - 1] = next[idx]; next[idx] = tmp;
                                    return next;
                                  })
                                }
                                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Move up"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() =>
                                  setPoNextProcessSeries((prev) => {
                                    if (idx >= prev.length - 1) return prev;
                                    const next = [...prev];
                                    const tmp = next[idx + 1]; next[idx + 1] = next[idx]; next[idx] = tmp;
                                    return next;
                                  })
                                }
                                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Move down"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPoNextProcessSeries((prev) => prev.filter((x) => x !== id))}
                                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Remove step"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-4">
            <div className="text-[11px] text-muted-foreground leading-4">
              Forwarding will initiate the procurement workflow and notify the relevant team.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setPoForwardDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={poNextProcessSeries.length === 0 || poForwarding}
                className="gap-1.5"
                onClick={async () => {
                  const orderNumber = safeTrim(poNo);
                  const prNumber = safeTrim(item?.indentId);
                  const comparisonId = safeTrim((item as any)?.comparisonId ?? (item as any)?.comparison_id ?? (item as any)?.comparision_id);
                  if (!orderNumber) return toast.error('Missing PO number');
                  if (!prNumber) return toast.error('Missing PR number');
                  if (!comparisonId) return toast.error('Missing comparison id');

                  const baseUrl = String(getBaseUrl() ?? '').replace(/\/$/, '');
                  if (!baseUrl) return toast.error('Missing base URL');

                  setPoForwarding(true);
                  try {
                    const res = await fetch(`${baseUrl}/purchase_flow/forward_purchase_order`, {
                      method: 'POST',
                      headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        order_number: orderNumber,
                        pr_number: prNumber,
                        comparison_id: comparisonId,
                        purchase_flow_stage: buildPurchaseFlowStage(poNextProcessSeries),
                      }),
                    });

                    if (!res.ok) {
                      const errText = await res.text().catch(() => '');
                      throw new Error(errText || `HTTP ${res.status}`);
                    }

                    const json: any = await res.json().catch(() => null);
                    const success = Boolean(
                      json &&
                      (json.success === true || String(json.success).toLowerCase() === 'true')
                    );
                    if (!success) throw new Error('Forward failed');

                    onUpdate(item.indentId, { poStatus: 'forwarded', poNextProcessSeries: poNextProcessSeries } as any);
                    setPoForwardDialogOpen(false);
                    toast.success('PO forwarded — procurement workflow initiated');
                  } catch (e: any) {
                    const msg = safeTrim(e?.message ?? e);
                    toast.error(`Failed to forward PO${msg ? `: ${msg}` : ''}`);
                  } finally {
                    setPoForwarding(false);
                  }
                }}
              >
                <SendHorizonal className="h-3.5 w-3.5" />
                Forward PO
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MakePurchaseOrderPopup
        open={makePoOpen}
        comparative={item}
        onClose={() => {
          setMakePoOpen(false);
          didCheckPoRef.current = '';
        }}
        onConfirm={({ createdAt, poNo }) => {
          onUpdate(item.indentId, { poCreatedAt: createdAt, poNo, poStatus: 'created' } as any);
          toast.success('PO saved');
        }}
      />

      <Collapsible open={open} onOpenChange={setOpen}>
        {/* ── Always-visible row ─────────────────────────────────── */}
        <CollapsibleTrigger asChild>
          <div
            className="group relative flex cursor-pointer items-center gap-4 overflow-hidden px-4 py-3 transition-colors hover:bg-muted/30"
            role="button"
            tabIndex={0}
          >
            {poForwarded ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                <div className="border-4 border-green-800/30 text-green-800/30 rounded-lg px-10 py-4 font-extrabold text-5xl tracking-[0.25em] select-none">
                  FORWARDED
                </div>
              </div>
            ) : null}

            {/* Icon */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* PR No + title */}
            <div className="w-48 min-w-0 shrink-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {item.indentId}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                Price Comparative Statement
              </div>
            </div>

            {/* Tracker — always visible */}
            <div className="flex-1 min-w-0">
              <InlineTracker steps={trackerSteps} />
            </div>

            {/* Toolbox (lock + PO actions + collapse) */}
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/20 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const next = !hoLocked;
                    onUpdate(item.indentId, { hoLocked: next } as any);
                    toast.message(next ? 'Locked (editing disabled)' : 'Unlocked (editing enabled)');
                  }}
                  aria-label={hoLocked ? 'Unlock row' : 'Lock row'}
                  title={hoLocked ? 'Unlock to enable editing' : 'Lock to disable editing'}
                >
                  {hoLocked ? (
                    <Lock className="h-4 w-4 text-destructive" aria-hidden="true" />
                  ) : (
                    <Unlock className="h-4 w-4 text-muted-foreground opacity-50" aria-hidden="true" />
                  )}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={poDone ? 'outline' : 'default'}
                  onClick={openMakePo}
                  disabled={poDone || hoLocked}
                >
                  Make PO
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={openEditPo}
                  disabled={!poDone || hoLocked}
                >
                  Edit PO
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={forwardPo}
                  disabled={!poDone}
                >
                  Forward PO
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setOpen((v) => !v)}
                  aria-label={open ? 'Collapse' : 'Expand'}
                  title={open ? 'Collapse' : 'Expand'}
                >
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* ── Expanded content ───────────────────────────────────── */}
        <CollapsibleContent>
          <div className="border-t border-border bg-muted/10 px-4 py-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="indent">
                  <span className="inline-flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" aria-hidden="true" />
                    <span>Indent</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="comparative">
                  <span className="inline-flex items-center gap-2">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    <span>Comparative Statement</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="po">
                  <span className="inline-flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    <span>Purchase Order</span>
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="indent">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-foreground">Indent Details</div>
                    <div className="text-xs text-muted-foreground">Format matches Finance Admin Ops.</div>
                  </div>

                  {indentLoading ? (
                    <div className="text-sm text-muted-foreground">Loading indent…</div>
                  ) : indentError ? (
                    <div className="text-sm text-destructive">{indentError}</div>
                  ) : !indent ? (
                    <div className="text-sm text-muted-foreground">No indent data found for this PR.</div>
                  ) : (
                    <div className="overflow-auto rounded-md border border-gray-300 bg-white">
                      <PRPreview indent={mapIndentToPreview(indent)} />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="comparative">
                <div className="space-y-4">
                  <ComparativeStatementPreview c={item} />

                  {vendors.length && canApprove ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Select vendor to approve
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {vendors.map((v) => {
                          const active = String(v.id) === selectedVendorId;
                          return (
                            <Button
                              key={v.id}
                              type="button"
                              size="sm"
                              variant={active ? 'default' : 'outline'}
                              onClick={() => setSelectedVendor(String(v.id))}
                              disabled={approving}
                            >
                              {v.name}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {canApprove ? (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={approveNow}
                        disabled={approving}
                      >
                        {approving ? 'Approving…' : 'Approve TC'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="po">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-foreground">Purchase Order</div>
                    <div className="text-xs text-muted-foreground">
                      {poDone
                        ? 'Purchase order document.'
                        : 'No purchase order created yet.'}
                    </div>
                  </div>

                  {poDone ? (
                    <>
                      {/* Inline PO preview (same layout as Make PO popup, rendered in-place) */}
                      <div className="h-[600px] overflow-y-auto">
                        <MakePurchaseOrderPopup
                          open={open && activeTab === 'po'}
                          comparative={item}
                          vendorId={item.hoSelectedVendorId}
                          onClose={() => { /* inline preview */ }}
                          variant="inline"
                          inlineSimulatePrint
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Create a PO using the <span className="font-semibold text-foreground">Make PO</span> button in the row.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
