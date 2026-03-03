import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const KEY = 'farmconnect.prComparative.v1';

type ComparativeLite = {
  indentId: string;
  title?: string;
  subTitle?: string;
  hoSelectedVendorId?: string;
  hoForwardedAt?: string;
  technicalRecommendedVendorId?: string;
};

const readAll = (): Record<string, ComparativeLite> => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export default function HOInbox() {
  const navigate = useNavigate();
  const [all, setAll] = useState<Record<string, ComparativeLite>>({});

  useEffect(() => {
    setAll(readAll());
  }, []);

  const rows = useMemo(() => {
    return Object.values(all)
      .filter((x) => x && x.indentId)
      .sort((a, b) => (b.indentId || '').localeCompare(a.indentId || ''));
  }, [all]);

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-2xl font-bold">HO Module</div>
          <div className="text-xs text-muted-foreground">Select an indent to review quotations and forward to Finance Admin Ops.</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <div className="text-sm font-semibold">Inbox</div>
          <div className="ml-auto text-xs text-muted-foreground">Total: {rows.length}</div>
        </div>

        {rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No comparatives found. Create quotations first to see items here.</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((x) => {
              const status = x.hoForwardedAt ? 'Forwarded' : 'Pending';
              return (
                <button
                  key={x.indentId}
                  type="button"
                  onClick={() => navigate(`/ho/${x.indentId}`)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{x.title || 'Price Comparative Statement'}</div>
                      <div className="text-xs text-muted-foreground truncate">Indent: {x.indentId}{x.subTitle ? ` • ${x.subTitle}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`text-xs font-semibold ${status === 'Forwarded' ? 'text-blue-700' : 'text-yellow-700'}`}>{status}</div>
                      <Button variant="outline" className="gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/ho/${x.indentId}`); }}>
                        Open <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Tech rec: {x.technicalRecommendedVendorId ? 'Yes' : 'No'}</span>
                    <span className="opacity-60">•</span>
                    <span>HO selected: {x.hoSelectedVendorId ? 'Yes' : 'No'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
