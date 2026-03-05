import { useMemo, useState } from 'react';
import { FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { InboxRowShell } from '@/components/ho-inbox/InboxRowShell';
import {
  ComparativeStatementPreview,
  type ComparativeModel,
} from '@/components/purchase/ComparativeStatementPreview';
import { getBaseUrl } from '@/lib/config';

type Props = {
  item: ComparativeModel;
  onOpen: (indentId: string) => void;
  onUpdate: (indentId: string, patch: Partial<ComparativeModel>) => void;
};

export function ComparativeQuotationApprovalRow({ item, onOpen, onUpdate }: Props) {
  const [approving, setApproving] = useState(false);

  const approvedVendorId = String((item as any)?.tcApprovedVendorId ?? '').trim();
  const isApproved = Boolean(approvedVendorId);
  const status = isApproved ? 'Approved' : 'Pending';
  const statusClass = isApproved ? 'text-green-700' : 'text-yellow-700';

  const vendors = useMemo(() => (Array.isArray(item?.vendors) ? item.vendors : []), [item]);
  const techRecId = String((item as any)?.technicalRecommendationVendorId ?? (item as any)?.technicalRecommendedVendorId ?? '').trim();
  const selectedVendorId = String(item?.hoSelectedVendorId ?? '').trim();
  const canApprove = !isApproved;

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

  return (
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
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpen(item.indentId);
          }}
        >
          Open <ArrowRight className="w-4 h-4" />
        </Button>
      }
    >
      <div className="space-y-3">
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
          <Button type="button" variant="outline" onClick={() => onOpen(item.indentId)} className="gap-2">
            Open (optional) <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </InboxRowShell>
  );
}
