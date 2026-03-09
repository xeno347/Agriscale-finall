import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ClipboardList, FileText, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

export function ComparativeQuotationApprovalRow({ item, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [makePoOpen, setMakePoOpen] = useState(false);
  const didCheckPoRef = useRef<string>('');

  const [activeTab, setActiveTab] = useState<'indent' | 'comparative' | 'po'>('comparative');

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
    toast.message('Forward PO is not wired yet');
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
            className="group flex cursor-pointer items-center gap-4 overflow-hidden px-4 py-3 transition-colors hover:bg-muted/30"
            role="button"
            tabIndex={0}
          >
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

            {/* PO actions */}
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={poDone ? 'outline' : 'default'}
                  onClick={openMakePo}
                  disabled={poDone}
                >
                  Make PO
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={openEditPo}
                  disabled={!poDone}
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
              </div>
            </div>

            {/* Chevron */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
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
                        ? 'Purchase order details.'
                        : 'No purchase order created yet.'}
                    </div>
                  </div>

                  {poDone ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">PO Created On</div>
                          <div className="text-sm text-foreground">{fmt(poCreatedAt) || poCreatedAt}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Vendor</div>
                          <div className="text-sm text-foreground">
                            {String((item as any)?.tcApprovedVendorId || item.hoSelectedVendorId || '—')}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">PO Number</div>
                          <div className="text-sm text-foreground">{poNo || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</div>
                          <div className="text-sm text-foreground">{poStatus ? poStatus[0].toUpperCase() + poStatus.slice(1) : 'Created'}</div>
                        </div>
                      </div>

                      {/* Inline PO preview (same layout as Make PO popup, rendered in-place) */}
                      <div className="mt-4">
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
