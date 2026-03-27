import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  createGrnForOrder,
  getGrnByOrderId,
  getIncomingOrders,
  updateIncomingItem,
  type GrnIncomingOrder,
} from '@/lib/grnStore';
import { GrnPrint } from '@/components/grn/GrnPrint';
import { GrnStickerPrint } from '@/components/grn/GrnStickerPrint';

export function GRNModule() {
  const [q, setQ] = useState('');
  const [active, setActive] = useState<GrnIncomingOrder | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const orders = useMemo(() => {
    const all = getIncomingOrders();
    const query = q.trim().toLowerCase();
    if (!query) return all;
    return all.filter((o) => {
      return (
        o.poNo.toLowerCase().includes(query) ||
        o.vendorName.toLowerCase().includes(query) ||
        (o.invNo || '').toLowerCase().includes(query) ||
        (o.challanNo || '').toLowerCase().includes(query)
      );
    });
  }, [q, refreshTick]);

  const onOpenOrder = (o: GrnIncomingOrder) => {
    setActive(o);
    setOpen(true);
  };

  const onGenerateGrn = () => {
    if (!active) return;
    try {
      const grn = createGrnForOrder(active.id);
      toast.success(`GRN created: ${grn.grnNo}`);
      setRefreshTick((x) => x + 1);
      setActive(getIncomingOrders().find((x) => x.id === active.id) || null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create GRN');
    }
  };

  const created = active ? getGrnByOrderId(active.id) : null;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-2xl font-bold">GRN Module</div>
          <div className="text-xs text-muted-foreground">
            Incoming orders + generate GRN + unique tag id + print GRN/sticker.
          </div>
        </div>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by PO No / Vendor / Invoice / Challan..."
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefreshTick((x) => x + 1)}
          >
            Refresh
          </Button>
        </div>
      </Card>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold">Incoming Orders</div>
          <div className="text-xs text-muted-foreground">
            Total: {orders.length}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO No</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Challan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.poNo}</TableCell>
                <TableCell>{o.vendorName}</TableCell>
                <TableCell>{o.invNo || '—'}</TableCell>
                <TableCell>{o.challanNo || '—'}</TableCell>
                <TableCell>
                  <span
                    className={
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ' +
                      (o.status === 'GRN Created'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700')
                    }
                  >
                    {o.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenOrder(o)}
                  >
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-sm text-muted-foreground py-10"
                >
                  No incoming orders.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setActive(null);
        }}
      >
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>GRN Module</DialogTitle>
          </DialogHeader>

          {!active ? null : (
            <div className="space-y-4">
              <div className="grid gap-0 lg:grid-cols-[1.7fr_1fr]">
                {/* Left big panel */}
                <div className="border-2 border-foreground/80 p-4">
                  <div className="inline-flex items-center gap-2 border-2 border-foreground/80 px-3 py-2 text-sm w-fit">
                    <span className="text-muted-foreground">order number</span>
                    <span className="font-semibold">{active.poNo}</span>
                  </div>

                  <div className="mt-4 grid gap-4 grid-cols-[1fr_160px]">
                    <div className="border-2 border-foreground/80 p-3 min-h-[170px]">
                      <div className="text-xs text-muted-foreground mb-2">
                        ordered products and its details with quantity to be recived
                      </div>
                      <div className="space-y-2">
                        {active.items.map((it) => (
                          <div key={it.id} className="text-sm">
                            <div className="font-medium">{it.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {it.itemCode || ''} · {it.uom} · Billed: {it.billedQty}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-2 border-foreground/80 p-3">
                      <div className="text-xs text-muted-foreground mb-2">
                        Quantity recived
                      </div>
                      <div className="space-y-2">
                        {active.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-xs text-muted-foreground truncate max-w-[86px]">
                              {it.itemCode || 'Item'}
                            </span>
                            <Input
                              className="h-8 w-20 text-right tabular-nums"
                              inputMode="numeric"
                              value={String(it.receivedQty)}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                updateIncomingItem(active.id, it.id, {
                                  receivedQty: Number.isFinite(n) ? n : 0,
                                });
                                setRefreshTick((x) => x + 1);
                                setActive(
                                  getIncomingOrders().find((x) => x.id === active.id) ||
                                    null
                                );
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right stacked panels */}
                <div className="border-2 border-foreground/80 border-l-0 p-4 space-y-4">
                  {/* Top box */}
                  <div className="border-2 border-foreground/80 p-3 h-[62px] overflow-hidden">
                    <div className="text-xs text-muted-foreground">Vendor</div>
                    <div className="text-sm font-semibold truncate">
                      {active.vendorName}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {active.vendorAddress || '—'}
                    </div>
                  </div>

                  {/* Middle box */}
                  <div className="border-2 border-foreground/80 p-3 h-[122px] overflow-hidden">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Invoice No</div>
                        <div className="font-semibold">{active.invNo || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Invoice Date</div>
                        <div className="font-semibold">{active.invDate || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Challan No</div>
                        <div className="font-semibold">{active.challanNo || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Challan Date</div>
                        <div className="font-semibold">{active.challanDate || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">LR No</div>
                        <div className="font-semibold">{active.lrNo || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">GE No</div>
                        <div className="font-semibold">{active.geNo || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom box */}
                  <div className="border-2 border-foreground/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">Generate GRN</div>
                        <div className="text-xs text-muted-foreground">
                          One sticker per GRN (unique roll/tag id)
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={onGenerateGrn}
                        disabled={!!created}
                      >
                        {created ? 'GRN Created' : 'Generate GRN'}
                      </Button>
                    </div>

                    {created ? (
                      <div className="mt-3 space-y-2">
                        <div className="border-2 border-foreground/80 p-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">GRN No:</span>{' '}
                            <span className="font-semibold">{created.grnNo}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Roll/Tag ID:</span>{' '}
                            <span className="font-semibold">{created.grnId}</span>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-[70px_1fr] gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() => toast.message('Forward flow not wired yet')}
                          >
                            Forward
                          </Button>

                          <div className="flex items-center justify-end gap-2">
                            <GrnPrint grn={created} />
                            <GrnStickerPrint
                              payload={{
                                tagId: created.grnId,
                                grnNo: created.grnNo,
                                grnDate: created.grnDate,
                                poNo: created.poNo,
                                vendorName: created.vendorName,
                                totalItems: created.items.length,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GRNModule;