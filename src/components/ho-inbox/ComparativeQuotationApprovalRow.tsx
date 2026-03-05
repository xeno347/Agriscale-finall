import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { InboxRowShell } from '@/components/ho-inbox/InboxRowShell';
import {
  ComparativeStatementPreview,
  type ComparativeModel,
} from '@/components/purchase/ComparativeStatementPreview';
import { getBaseUrl } from '@/lib/config';
import { MakePurchaseOrderPopup } from '@/components/ho-inbox/MakePurchaseOrderPopup';

type Props = {
  item: ComparativeModel;
  onOpen: (indentId: string) => void;
  onUpdate: (indentId: string, patch: Partial<ComparativeModel>) => void;
};

function StepChip({
  label,
  done,
  sub,
}: {
  label: string;
  done: boolean;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={
          'h-6 px-2 rounded-md border text-[11px] font-semibold flex items-center ' +
          (done
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-muted/40 border-border text-muted-foreground')
        }
      >
        {label}
      </div>
      {sub ? <div className="text-[10px] text-muted-foreground whitespace-nowrap">{sub}</div> : null}
    </div>
  );
}

function TrackingTimeline({
  steps,
}: {
  steps: Array<{ label: string; done: boolean; sub?: string }>;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {steps.map((s, idx) => {
          const last = idx === steps.length - 1;
          return (
            <div key={`${s.label}-${idx}`} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className={
                    'h-7 w-7 rounded-full border flex items-center justify-center text-[11px] font-bold ' +
                    (s.done
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-muted/40 border-border text-muted-foreground')
                  }
                >
                  {idx + 1}
                </div>
                <div className="mt-1 text-[11px] font-semibold text-foreground whitespace-nowrap">{s.label}</div>
                {s.sub ? <div className="text-[10px] text-muted-foreground whitespace-nowrap">{s.sub}</div> : null}
              </div>

              {!last ? (
                <div className="flex items-center">
                  <div
                    className={
                      'h-[2px] w-10 rounded-full ' +
                      (steps[idx]?.done && steps[idx + 1]?.done ? 'bg-green-600' : 'bg-border')
                    }
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ComparativeQuotationApprovalRow({ item, onOpen, onUpdate }: Props) {
  const [approving, setApproving] = useState(false);
  const [makePoOpen, setMakePoOpen] = useState(false);

  const approvedVendorId = String((item as any)?.tcApprovedVendorId ?? '').trim();
  const isApproved = Boolean(approvedVendorId);
  const status = isApproved ? 'Approved' : 'Pending';
  const statusClass = isApproved ? 'text-green-700' : 'text-yellow-700';

  const vendors = useMemo(() => (Array.isArray(item?.vendors) ? item.vendors : []), [item]);
  const techRecId = String((item as any)?.technicalRecommendationVendorId ?? (item as any)?.technicalRecommendedVendorId ?? '').trim();
  const selectedVendorId = String(item?.hoSelectedVendorId ?? '').trim();
  const canApprove = !isApproved;

  // Tracking (UI-only):
  // Step 1 TC = approved
  // Step 2 NFA = HO forwarded to finance (we already store hoForwardedAt in local overrides)
  // Step 3 PO = placeholder (local-only flag, no API)
  const tcAt = String((item as any)?.tcApprovedAt ?? '').trim();
  const hoForwardedAt = String((item as any)?.hoForwardedAt ?? '').trim();
  const poCreatedAt = String((item as any)?.poCreatedAt ?? '').trim();

  const tcDone = Boolean(approvedVendorId);
  const nfaDone = Boolean(hoForwardedAt);
  const poDone = Boolean(poCreatedAt);

  const fmt = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

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

  return (
    <>
      <MakePurchaseOrderPopup
        open={makePoOpen}
        comparative={item}
        onClose={() => setMakePoOpen(false)}
        onConfirm={({ createdAt }) => {
          onUpdate(item.indentId, { poCreatedAt: createdAt } as any);
          toast.success('PO created (local)');
        }}
      />

      <InboxRowShell
        icon={FileText}
        title={item.title || 'Comparative Quotation Approval'}
        preview={`Indent: ${item.indentId}${item.subTitle ? ` • ${item.subTitle}` : ''}`}
        status={<div className={`text-xs font-semibold ${statusClass}`}>{status}</div>}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span>Tech rec: {techRecId ? 'Yes' : 'No'}</span>
            <span className="opacity-60">•</span>
            <span>HO selected: {selectedVendorId ? 'Yes' : 'No'}</span>
            {isApproved ? (
              <>
                <span className="opacity-60">•</span>
                <span className="text-green-700">Approved</span>
              </>
            ) : null}
          </div>
        }
        rightActions={
          <div className="hidden lg:flex items-center gap-3">
            <TrackingTimeline
              steps={[
                { label: 'TC', done: tcDone, sub: tcAt ? fmt(tcAt) : undefined },
                { label: 'NFA', done: nfaDone, sub: hoForwardedAt ? fmt(hoForwardedAt) : undefined },
                { label: 'PO', done: poDone, sub: poCreatedAt ? fmt(poCreatedAt) : undefined },
              ]}
            />
            <Button type="button" size="sm" onClick={openMakePo} disabled={poDone}>
              {poDone ? 'PO Created' : 'Make PO'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Timeline shown on small screens inside body */}
          <div className="lg:hidden">
            <TrackingTimeline
              steps={[
                { label: 'TC', done: tcDone, sub: tcAt ? fmt(tcAt) : undefined },
                { label: 'NFA', done: nfaDone, sub: hoForwardedAt ? fmt(hoForwardedAt) : undefined },
                { label: 'PO', done: poDone, sub: poCreatedAt ? fmt(poCreatedAt) : undefined },
              ]}
            />
            <div className="mt-3">
              <Button type="button" className="w-full" onClick={openMakePo} disabled={poDone}>
                {poDone ? 'PO Created' : 'Make PO'}
              </Button>
            </div>
          </div>

          <ComparativeStatementPreview c={item} />

          {vendors.length ? (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">Select best quote</div>
              <div className="flex flex-wrap gap-2">
                {vendors.map((v) => {
                  const active = String(v.id) === selectedVendorId;
                  return (
                    <Button
                      key={v.id}
                      type="button"
                      variant={active ? 'default' : 'outline'}
                      onClick={() => setSelectedVendor(String(v.id))}
                      disabled={!canApprove || approving}
                    >
                      {v.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={approveNow} disabled={!canApprove || approving}>
              {isApproved ? 'Approved' : approving ? 'Approving…' : 'Approve'}
            </Button>
          </div>
        </div>
      </InboxRowShell>
    </>
  );
}
