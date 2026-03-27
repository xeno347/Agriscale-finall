import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, Plus, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import getBaseUrl from '@/lib/config';
import { toast } from 'sonner';

type ApiPurchaseFlowStageEntry = {
  document?: unknown;
  status?: unknown;
  doc_link?: unknown;
};

type ApiPurchaseFlow = {
  comparison_id?: unknown;
  flow_id?: unknown;
  order_number?: unknown;
  pr_number?: unknown;
  purchase_flow_stage?: unknown;
  timestamp?: unknown;
};

type ApiGetPurchaseFlowsResponse = {
  purchase_flows?: unknown;
};

type PurchaseFlowStep = {
  key: string;
  index: number;
  document: string;
  status: string;
  docLink: string;
};

const safeTrim = (v: unknown) => String(v ?? '').trim();

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

const parseStepIndex = (key: string): number | null => {
  const m = String(key).match(/step_(\d+)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
};

const parseSteps = (stageUnknown: unknown): PurchaseFlowStep[] => {
  const stage = asRecord(stageUnknown);
  const out: PurchaseFlowStep[] = [];
  for (const [key, entryUnknown] of Object.entries(stage)) {
    const index = parseStepIndex(key);
    if (!index) continue;
    const entry = asRecord(entryUnknown) as ApiPurchaseFlowStageEntry;
    out.push({
      key,
      index,
      document: safeTrim(entry.document) || key,
      status: safeTrim(entry.status) || 'empty',
      docLink: safeTrim(entry.doc_link),
    });
  }
  return out.sort((a, b) => a.index - b.index);
};

const isUploaded = (s: PurchaseFlowStep) => {
  const st = safeTrim(s.status).toLowerCase();
  if (s.docLink) return true;
  if (!st) return false;
  return st !== 'empty';
};

const formatDateTime = (raw?: string) => {
  const v = safeTrim(raw);
  if (!v) return '';
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return v;
  try {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
};

async function fetchPurchaseFlows(signal?: AbortSignal): Promise<ApiPurchaseFlow[]> {
  const baseUrl = String(getBaseUrl() ?? '').replace(/\/$/, '');
  if (!baseUrl) throw new Error('API base URL is not set');

  const url = `${baseUrl}/purchase_flow/get_purchase_flows`;
  const doFetch = (method: 'GET' | 'POST') =>
    fetch(url, {
      method,
      headers: { Accept: 'application/json' },
      signal,
    });

  let res = await doFetch('GET');
  if (res.status === 405) res = await doFetch('POST');

  const text = await res.text().catch(() => '');
  let data: ApiGetPurchaseFlowsResponse | null = null;
  try {
    data = text ? (JSON.parse(text) as ApiGetPurchaseFlowsResponse) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      safeTrim((data as any)?.message) ||
      safeTrim((data as any)?.error) ||
      text ||
      `Failed to load purchase flows (HTTP ${res.status})`;
    throw new Error(message);
  }

  const list = (data as any)?.purchase_flows;
  return Array.isArray(list) ? (list as ApiPurchaseFlow[]) : [];
}

function UploadStepDocPopup({
  title,
  onClose,
  onUpload,
}: {
  title: string;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return toast.error('Select a file');
    setUploading(true);
    try {
      await onUpload(file);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e ?? 'Upload failed');
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-semibold text-sm">Upload Document</div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div className="text-xs text-muted-foreground">Step</div>
            <div className="text-sm font-semibold">{title}</div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">File</label>
            <label className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-border bg-background px-4 py-6 cursor-pointer hover:bg-muted transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{file ? file.name : 'Click to select file'}</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} className="gap-2" disabled={uploading}>
            <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseFlow() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<ApiPurchaseFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{
    flow: ApiPurchaseFlow;
    step: PurchaseFlowStep;
  } | null>(null);

  const openHoInboxView = (prNumberRaw: string, tab: 'po' | 'indent' | 'comparative') => {
    const prNumber = safeTrim(prNumberRaw);
    if (!prNumber) {
      toast.error('Missing PR number');
      return;
    }
    const qs = new URLSearchParams({ open: prNumber, tab }).toString();
    navigate(`/ho?${qs}`);
  };

  useEffect(() => {
    const ac = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchPurchaseFlows(ac.signal);
        setFlows(list);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e ?? 'Failed to load purchase flows');
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => ac.abort();
  }, []);

  const rows = useMemo(() => {
    const copy = [...flows];
    copy.sort((a, b) => safeTrim((b as any)?.timestamp).localeCompare(safeTrim((a as any)?.timestamp)));
    return copy;
  }, [flows]);

  const handleUploadStep = async (flow: ApiPurchaseFlow, step: PurchaseFlowStep, file: File) => {
    // Upload endpoint is backend-defined; once provided, wire it here using multipart/FormData.
    // For now, keep UX unblocked and explain what is missing.
    void file;
    throw new Error(
      'Upload API not wired: please share the backend endpoint + payload (flow_id/comparison_id + step key) for uploading purchase flow documents.'
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {uploadTarget ? (
        <UploadStepDocPopup
          title={uploadTarget.step.document}
          onClose={() => setUploadTarget(null)}
          onUpload={(file) => handleUploadStep(uploadTarget.flow, uploadTarget.step, file)}
        />
      ) : null}

      <div className="mb-6">
        <div className="text-2xl font-bold">Purchase Flow</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Each purchase flow is a row. Steps come from the API as step_1, step_2, … — upload the required document in the empty step.
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground text-center">
            Loading purchase flows…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground text-center">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground text-center">
            No purchase flows found.
          </div>
        ) : (
          rows.map((flow, idx) => {
            const flowId = safeTrim((flow as any)?.flow_id) || safeTrim((flow as any)?.comparison_id) || `row-${idx}`;
            const prNumber = safeTrim((flow as any)?.pr_number);
            const orderNumber = safeTrim((flow as any)?.order_number);
            const comparisonId = safeTrim((flow as any)?.comparison_id);
            const ts = safeTrim((flow as any)?.timestamp);
            const steps = parseSteps((flow as any)?.purchase_flow_stage);

            return (
              <div key={flowId} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-stretch gap-0 flex-wrap">
                  <div className="w-[260px] shrink-0 border-r border-border px-4 py-4 bg-muted/30 flex flex-col justify-center">
                    <div className="font-semibold text-sm leading-snug">{prNumber || 'Purchase Requisition'}</div>
                    <div className="text-xs text-muted-foreground mt-1">PO: {orderNumber || '—'}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Comparison: {comparisonId || '—'}</div>
                    {ts ? (
                      <div className="text-[11px] text-muted-foreground mt-2">Updated: {formatDateTime(ts)}</div>
                    ) : null}

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openHoInboxView(prNumber, 'po')}
                        disabled={!prNumber}
                      >
                        View PO / WO
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openHoInboxView(prNumber, 'indent')}
                        disabled={!prNumber}
                      >
                        View Indent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openHoInboxView(prNumber, 'comparative')}
                        disabled={!prNumber}
                      >
                        View Comparative Approval
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 px-4 py-4 overflow-x-auto">
                    {steps.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No steps found for this flow.</div>
                    ) : (
                      <div className="min-w-max flex items-center gap-3">
                        {steps.map((s, stepIdx) => {
                          const uploaded = isUploaded(s);
                          const canOpen = Boolean(s.docLink);
                          return (
                            <div key={s.key} className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (canOpen) {
                                    window.open(s.docLink, '_blank');
                                    return;
                                  }
                                  setUploadTarget({ flow, step: s });
                                }}
                                className="group flex flex-col items-center gap-1"
                                title={canOpen ? 'Open document' : 'Upload document'}
                              >
                                <div
                                  className={
                                    'w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center transition-colors ' +
                                    (uploaded
                                      ? 'border-green-500 bg-green-50'
                                      : 'border-dashed border-border bg-background hover:bg-muted')
                                  }
                                >
                                  {uploaded ? (
                                    <FileText className="w-5 h-5 text-green-700" />
                                  ) : (
                                    <Plus className="w-7 h-7 text-muted-foreground group-hover:text-foreground" />
                                  )}
                                  <div className="text-[10px] mt-1 font-semibold text-muted-foreground">
                                    {uploaded ? 'Uploaded' : 'Upload'}
                                  </div>
                                </div>
                                <div className="text-[10px] font-medium text-center max-w-[88px] leading-tight">
                                  {s.document}
                                </div>
                              </button>

                              {stepIdx < steps.length - 1 ? (
                                <div className="text-muted-foreground">
                                  <ArrowRight className="w-4 h-4" />
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
