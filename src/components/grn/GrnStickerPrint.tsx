import { useRef } from 'react';
import { Sticker, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export type GrnStickerPayload = {
  tagId: string;
  grnNo: string;
  grnDate: string;
  poNo: string;
  vendorName: string;
  totalItems: number;
};

export function GrnStickerPrint({ payload }: { payload: GrnStickerPayload }) {
  const ref = useRef<HTMLDivElement>(null);

  const onPrint = () => {
    const content = ref.current;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`
      <html><head><title>Sticker ${payload.tagId}</title>
      <style>
        @page { size: 80mm 50mm; margin: 4mm; }
        body { font-family: Arial, sans-serif; color: #111; }
        .wrap { border: 2px solid #111; padding: 10px; height: 100%; box-sizing: border-box; display: grid; grid-template-columns: 1fr 90px; gap: 10px; align-items: center; }
        .id { font-size: 14px; font-weight: 800; letter-spacing: 0.4px; }
        .kv { font-size: 10px; line-height: 1.25; }
        .k { font-weight: 700; }
        .qr { width: 90px; height: 90px; border: 2px dashed #111; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #333; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);

    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const onDownloadPdf = async () => {
    const el = ref.current;
    if (!el) return;

    // Ensure layout is measurable even though it may be in a hidden container
    const prevDisplay = el.style.display;
    const prevVisibility = el.style.visibility;
    el.style.visibility = 'hidden';
    el.style.display = 'block';

    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');

      // Sticker size: 80mm x 50mm (same as print)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [80, 50],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 80, 50);
      pdf.save(`sticker-${payload.tagId}.pdf`);
    } finally {
      el.style.display = prevDisplay;
      el.style.visibility = prevVisibility;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="hidden">
        <div ref={ref}>
          <div className="wrap">
            <div>
              <div className="id">{payload.tagId}</div>
              <div className="kv" style={{ marginTop: 6 }}>
                <div><span className="k">GRN:</span> {payload.grnNo}</div>
                <div><span className="k">Date:</span> {payload.grnDate}</div>
                <div><span className="k">PO:</span> {payload.poNo}</div>
                <div><span className="k">Vendor:</span> {payload.vendorName}</div>
                <div><span className="k">Items:</span> {payload.totalItems}</div>
              </div>
            </div>
            <div className="qr">QR</div>
          </div>
        </div>
      </div>

      <Button type="button" size="sm" variant="outline" className="gap-2" onClick={onPrint}>
        <Sticker className="h-4 w-4" /> Print Sticker
      </Button>

      <Button type="button" size="sm" variant="default" className="gap-2" onClick={onDownloadPdf}>
        <Download className="h-4 w-4" /> Download PDF
      </Button>
    </div>
  );
}
