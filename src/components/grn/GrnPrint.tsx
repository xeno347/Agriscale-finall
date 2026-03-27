import { useMemo, useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type GRNRecord } from '@/lib/grnStore';

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export function GrnPrint({ grn }: { grn: GRNRecord }) {
  const printRef = useRef<HTMLDivElement>(null);

  const totals = useMemo(() => {
    const billed = sum(grn.items.map((x) => x.billedQty || 0));
    const received = sum(grn.items.map((x) => x.receivedQty || 0));
    const rejected = sum(grn.items.map((x) => x.rejectedQty || 0));
    const short = sum(grn.items.map((x) => x.shortQty || 0));

    const basic = sum(grn.items.map((x) => x.basicValue || 0));
    const freight = sum(grn.items.map((x) => x.freight || 0));
    const gst = sum(grn.items.map((x) => x.gstAmount || 0));
    const withTax = sum(grn.items.map((x) => x.valueWithTax || 0));
    const pf = sum(grn.items.map((x) => x.pf || 0));
    const total = sum(grn.items.map((x) => x.totalGrnValue || 0));

    return { billed, received, rejected, short, basic, freight, gst, withTax, pf, total };
  }, [grn]);

  const onPrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`
      <html><head><title>${grn.grnNo}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; color: #111; }
        .sheet { border: 2px solid #111; padding: 10px; }

        .title { text-align: center; font-weight: 700; font-size: 18px; margin: 0; }
        .sub { text-align: center; font-weight: 700; font-size: 12px; margin: 6px 0 10px; }
        .sub span { border: 2px solid #111; padding: 2px 14px; display:inline-block; }

        .top { display: grid; grid-template-columns: 1.05fr 0.95fr; border: 2px solid #111; }
        .right { border-left: 2px solid #111; }
        .pad { padding: 8px; }

        .kv { display: grid; grid-template-columns: 95px 1fr 70px 1fr; gap: 4px 8px; font-size: 11px; }
        .kv .k { font-weight: 700; }

        .vendorGrid { display: grid; grid-template-columns: 95px 1fr; gap: 4px 8px; font-size: 11px; }
        .vendorGrid .k { font-weight: 700; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #111; padding: 4px 5px; font-size: 10.5px; }
        thead th { font-weight: 700; background: #fff; }
        thead tr:first-child th { border-bottom: 2px solid #111; }
        .center { text-align: center; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .hdr2 { font-size: 10px; }
        .total-row td { font-weight: 700; }

        .remarks { border: 2px solid #111; border-top: 0; padding: 8px; font-size: 11px; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);

    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" className="gap-2" onClick={onPrint}>
        <Printer className="h-4 w-4" /> Print GRN
      </Button>

      <div className="hidden">
        <div ref={printRef}>
          <div className="sheet">
            <h1 className="title">Sai Bioresouces Private Limited</h1>
            <div className="sub"><span>Goods Receipt Note (GRN)</span></div>

            <div className="top">
              <div className="pad">
                <div className="vendorGrid">
                  <div className="k">Vendor Name :-</div>
                  <div><b>{grn.vendorName}</b></div>
                  <div className="k">Address :-</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{grn.vendorAddress || ''}</div>
                </div>
              </div>

              <div className="right pad">
                <div className="kv">
                  <div className="k">GRN No :-</div><div>{grn.grnNo}</div>
                  <div className="k">GRN Dt :-</div><div>{grn.grnDate}</div>

                  <div className="k">Inv No :-</div><div>{grn.invNo || '-'}</div>
                  <div className="k">Inv Dt :-</div><div>{grn.invDate || '-'}</div>

                  <div className="k">Challan No :-</div><div>{grn.challanNo || '-'}</div>
                  <div className="k">Challan Dt :-</div><div>{grn.challanDate || '-'}</div>

                  <div className="k">LR No :-</div><div>{grn.lrNo || '-'}</div>
                  <div className="k">LR Dt :-</div><div>{grn.lrDate || '-'}</div>

                  <div className="k">GE No :-</div><div>{grn.geNo || '-'}</div>
                  <div className="k">GE Dt :-</div><div>{grn.geDate || '-'}</div>

                  <div className="k">PO No :-</div><div>{grn.poNo}</div>
                  <div className="k">PO Dt :-</div><div>{grn.poDate || '-'}</div>

                  <div className="k">PR No :-</div><div>{grn.prNo || '-'}</div>
                  <div className="k">PR Dt :-</div><div>{grn.prDate || '-'}</div>

                  <div className="k">PR By :-</div><div>{grn.prBy || '-'}</div>
                  <div className="k">Department :-</div><div>{grn.department || '-'}</div>

                  <div className="k">Group :-</div><div>{grn.group || '-'}</div>
                  <div className="k"></div><div></div>
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th rowSpan={2} className="center" style={{ width: 38 }}>S.<br/>No.</th>
                  <th rowSpan={2} className="center" style={{ width: 80 }}>ITEM CODE</th>
                  <th rowSpan={2} className="center">ITEM DESCRIPTION</th>
                  <th rowSpan={2} className="center" style={{ width: 80 }}>UNIT<br/>PRICE</th>
                  <th rowSpan={2} className="center" style={{ width: 52 }}>UOM</th>
                  <th colSpan={4} className="center">QUANTITY WISE DETAILS</th>
                  <th colSpan={7} className="center">VALUE WISE DETAILS</th>
                  <th rowSpan={2} className="center" style={{ width: 78 }}>Location</th>
                </tr>
                <tr>
                  <th className="center hdr2" style={{ width: 58 }}>BILLED<br/>QTY</th>
                  <th className="center hdr2" style={{ width: 58 }}>RECEIVE<br/>D QTY</th>
                  <th className="center hdr2" style={{ width: 58 }}>REJECT<br/>ED QTY</th>
                  <th className="center hdr2" style={{ width: 58 }}>SHORT<br/>AGE QTY</th>

                  <th className="center hdr2" style={{ width: 84 }}>BASIC VALUE</th>
                  <th className="center hdr2" style={{ width: 50 }}>DISC %</th>
                  <th className="center hdr2" style={{ width: 64 }}>FREIGHT</th>
                  <th className="center hdr2" style={{ width: 64 }}>GST @ 18%</th>
                  <th className="center hdr2" style={{ width: 92 }}>VALUE<br/>WITH TAX</th>
                  <th className="center hdr2" style={{ width: 55 }}>P & F</th>
                  <th className="center hdr2" style={{ width: 92 }}>TOTAL GRN<br/>VALUE</th>
                </tr>
              </thead>

              <tbody>
                {grn.items.map((it, idx) => (
                  <tr key={it.itemId}>
                    <td className="center">{idx + 1}</td>
                    <td className="center">{it.itemCode || ''}</td>
                    <td>{it.description}</td>
                    <td className="num">{(it.unitPrice || 0).toFixed(2)}</td>
                    <td className="center">{it.uom}</td>

                    <td className="num">{it.billedQty}</td>
                    <td className="num">{it.receivedQty}</td>
                    <td className="num">{(it.rejectedQty || 0).toFixed(2)}</td>
                    <td className="num">{(it.shortQty || 0).toFixed(2)}</td>

                    <td className="num">{(it.basicValue || 0).toFixed(2)}</td>
                    <td className="center">{it.discPercent ? `${it.discPercent}` : '-'}</td>
                    <td className="num">{(it.freight || 0).toFixed(2)}</td>
                    <td className="center">@ {it.gstPercent || 0}%</td>
                    <td className="num">{(it.gstAmount || 0).toFixed(2)}</td>
                    <td className="num">{(it.valueWithTax || 0).toFixed(2)}</td>
                    <td className="num">{(it.pf || 0).toFixed(2)}</td>
                    <td className="num">{(it.totalGrnValue || 0).toFixed(2)}</td>
                    <td className="center">{it.location || ''}</td>
                  </tr>
                ))}

                <tr className="total-row">
                  <td className="center" colSpan={5}>TOTAL</td>
                  <td className="num">{totals.billed}</td>
                  <td className="num">{totals.received}</td>
                  <td className="num">{totals.rejected.toFixed(2)}</td>
                  <td className="num">{totals.short.toFixed(2)}</td>
                  <td className="num">{totals.basic.toFixed(2)}</td>
                  <td className="center">-</td>
                  <td className="num">{totals.freight ? totals.freight.toFixed(2) : '-'}</td>
                  <td className="center">-</td>
                  <td className="num">{totals.gst.toFixed(2)}</td>
                  <td className="num">{totals.withTax.toFixed(2)}</td>
                  <td className="num">{totals.pf.toFixed(2)}</td>
                  <td className="num">{totals.total.toFixed(2)}</td>
                  <td />
                </tr>
              </tbody>
            </table>

            <div className="remarks"><b>Remarks :-</b> {grn.remarks || ''}</div>
          </div>
        </div>
      </div>
    </div>
  );
}