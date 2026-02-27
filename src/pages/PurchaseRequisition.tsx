import { useEffect, useMemo, useState } from 'react';
import { Plus, CheckCircle, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { readSignatureDiary, type SignatureDiary } from '@/lib/signatureDiary';

// Simple types used by this page
type PRLineItem = {
  id: string;
  srNo: number;
  partName: string;
  uom: string;
  totalQtyRequired: number;
  ratePerItem?: number;
};

type Indent = {
  id: string;
  project: string;
  prNo: string;
  date: string;
  department?: string;
  indentedBy: string;
  forwardedBy: string;
  directorsApproval: string;
  remarksNotes?: string;
  budgetHead?: string;
  items: PRLineItem[];
  status: 'draft' | 'signed' | 'raised';
};

const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = () => new Date().toISOString().split('T')[0];

const sample: Indent[] = [
  {
    id: 'pr-1',
    project: 'Chhattisgarh 2250 Acres',
    prNo: 'SBR/PR/26/001',
    date: today(),
    department: 'Cultivation',
    indentedBy: 'SUKHDEEP SINGH',
    forwardedBy: 'RAJINDER SINGH PADDA',
    directorsApproval: 'RAJENDRA SHRINGARPUTALE',
    remarksNotes: '',
    budgetHead: 'Machinery',
    items: [
      { id: 'pr-li-1', srNo: 1, partName: 'Chisel Plough', uom: 'No', totalQtyRequired: 4, ratePerItem: 45000 },
    ],
    status: 'draft',
  },
];

const PRPreview = ({ indent, attachments }: { indent: Omit<Indent, 'id' | 'status'>; attachments?: SignatureDiary }) => {
  const sigFor = (name: string) => attachments?.[name] ?? null;
  const total = indent.items.reduce((s, it) => s + (it.totalQtyRequired || 0) * (it.ratePerItem || 0), 0);
  return (
    <div className="min-w-[720px] border border-gray-200 bg-white rounded">
      <div className="p-3 text-sm font-semibold text-center border-b">PURCHASE REQUISITION</div>
      <div className="p-3 text-xs">
        <div className="flex justify-between mb-2">
          <div><strong>Project:</strong> {indent.project}</div>
          <div><strong>PR No:</strong> {indent.prNo}</div>
          <div><strong>Date:</strong> {indent.date}</div>
        </div>
        <table className="w-full text-sm border-collapse mb-3">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-1">Sr.</th>
              <th className="border p-1">Part Name</th>
              <th className="border p-1">Qty</th>
              <th className="border p-1">UoM</th>
              <th className="border p-1 text-right">Rate</th>
              <th className="border p-1 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {indent.items.map((it) => (
              <tr key={it.id}>
                <td className="border p-1 text-center">{it.srNo}</td>
                <td className="border p-1">{it.partName}</td>
                <td className="border p-1 text-center">{it.totalQtyRequired}</td>
                <td className="border p-1 text-center">{it.uom}</td>
                <td className="border p-1 text-right">{it.ratePerItem ? it.ratePerItem.toLocaleString() : ''}</td>
                <td className="border p-1 text-right">{it.ratePerItem ? (it.totalQtyRequired * it.ratePerItem).toLocaleString() : ''}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} className="border p-1 text-right font-semibold">TOTAL</td>
              <td className="border p-1 text-right font-semibold">{total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="font-semibold">Indented By</div>
            <div className="mt-2 text-gray-600">{indent.indentedBy}</div>
            {sigFor(indent.indentedBy)?.signature && (
              <img src={sigFor(indent.indentedBy)!.signature} alt="sig" className="h-8 mt-1 object-contain" />
            )}
          </div>
          <div>
            <div className="font-semibold">Forwarded By</div>
            <div className="mt-2 text-gray-600">{indent.forwardedBy}</div>
            {sigFor(indent.forwardedBy)?.signature && (
              <img src={sigFor(indent.forwardedBy)!.signature} alt="sig" className="h-8 mt-1 object-contain" />
            )}
          </div>
          <div>
            <div className="font-semibold">Director's Approval</div>
            <div className="mt-2 text-gray-600">{indent.directorsApproval}</div>
            {sigFor(indent.directorsApproval)?.signature && (
              <img src={sigFor(indent.directorsApproval)!.signature} alt="sig" className="h-8 mt-1 object-contain" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PurchaseRequisition = () => {
  const [indents, setIndents] = useState<Indent[]>(sample);
  const [open, setOpen] = useState(false);
  const [diary, setDiary] = useState<SignatureDiary>({});
  const [newProject, setNewProject] = useState('');
  const [newPrNo, setNewPrNo] = useState('');
  const [newDate, setNewDate] = useState(today());
  const [newIndentedBy, setNewIndentedBy] = useState('');
  const [newForwardedBy, setNewForwardedBy] = useState('');
  const [newDirectorsApproval, setNewDirectorsApproval] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [previewIndent, setPreviewIndent] = useState<Indent | null>(null);

  useEffect(() => {
    setDiary(readSignatureDiary());
  }, []);

  const signaturesPresent = (it: Indent) => {
    const d = readSignatureDiary();
    return {
      indented: Boolean(it.indentedBy && d[it.indentedBy]?.signature),
      forwarded: Boolean(it.forwardedBy && d[it.forwardedBy]?.signature),
      director: Boolean(it.directorsApproval && d[it.directorsApproval]?.signature),
    };
  };

  const canRaise = (it: Indent) => {
    const s = signaturesPresent(it);
    return s.indented && s.forwarded && s.director;
  };

  const raisePR = (id: string) => {
    setIndents((prev) => prev.map((x) => x.id === id ? { ...x, status: 'raised' } : x));
    toast.success('Purchase Requisition raised');
  };

  const saveNew = () => {
    if (!newProject.trim()) return toast.error('Project required');
    if (!newPrNo.trim()) return toast.error('PR No required');
    if (!newIndentedBy.trim()) return toast.error('Indented By required');
    if (!newForwardedBy.trim()) return toast.error('Forwarded By required');
    if (!newDirectorsApproval.trim()) return toast.error("Director's name required");
    const id = genId();
    const item: PRLineItem = { id: genId(), srNo: 1, partName: newItemName || 'Item', uom: 'No', totalQtyRequired: newItemQty };
    const next: Indent = {
      id,
      project: newProject.trim(),
      prNo: newPrNo.trim(),
      date: newDate,
      department: undefined,
      indentedBy: newIndentedBy.trim(),
      forwardedBy: newForwardedBy.trim(),
      directorsApproval: newDirectorsApproval.trim(),
      remarksNotes: '',
      budgetHead: '',
      items: [item],
      status: 'draft',
    };
    setIndents((p) => [next, ...p]);
    setOpen(false);
    toast.success('Indent created');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Purchase Requisition</h1>
          <p className="text-sm text-gray-500">Raise PRs and manage received indents once all signatures are present.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setOpen(true)} className="bg-green-600 text-white gap-2">
            <Plus className="w-4 h-4" /> New Indent
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {indents.map((it) => {
          const s = signaturesPresent(it);
          return (
            <div key={it.id} className="bg-white border rounded p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{it.prNo} — {it.project}</div>
                <div className="text-xs text-gray-500">Indented by {it.indentedBy} · Forwarded by {it.forwardedBy} · Director {it.directorsApproval}</div>
                <div className="mt-2 text-xs flex gap-3">
                  <div className={`px-2 py-1 rounded ${s.indented ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>Indented {s.indented ? '✓' : '✕'}</div>
                  <div className={`px-2 py-1 rounded ${s.forwarded ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>Forwarded {s.forwarded ? '✓' : '✕'}</div>
                  <div className={`px-2 py-1 rounded ${s.director ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>Director {s.director ? '✓' : '✕'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setPreviewIndent(it)} className="gap-2">
                  <FilePlus className="w-4 h-4" /> Preview
                </Button>
                <Button onClick={() => canRaise(it) ? raisePR(it.id) : toast.error('All signatures required to raise PR')} className={`gap-2 ${it.status === 'raised' ? 'bg-gray-200 text-gray-700' : 'bg-green-600 text-white'}`} disabled={it.status === 'raised'}>
                  <CheckCircle className="w-4 h-4" /> {it.status === 'raised' ? 'Raised' : 'Raise PR'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Indent</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Project</label>
              <Input value={newProject} onChange={(e) => setNewProject(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">PR No</label>
              <Input value={newPrNo} onChange={(e) => setNewPrNo(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Date</label>
                <Input value={newDate} onChange={(e) => setNewDate(e.target.value)} type="date" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Indented By</label>
                <Input value={newIndentedBy} onChange={(e) => setNewIndentedBy(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Forwarded By</label>
                <Input value={newForwardedBy} onChange={(e) => setNewForwardedBy(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Director</label>
                <Input value={newDirectorsApproval} onChange={(e) => setNewDirectorsApproval(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Item Name</label>
                <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Qty</label>
                <Input type="number" value={String(newItemQty)} onChange={(e) => setNewItemQty(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">UoM</label>
                <Input value={"No"} disabled />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-green-600 text-white" onClick={saveNew}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewIndent)} onOpenChange={(v) => { if (!v) setPreviewIndent(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>PR Preview</DialogTitle>
          </DialogHeader>
          {previewIndent && (
            <PRPreview indent={{
              project: previewIndent.project,
              prNo: previewIndent.prNo,
              date: previewIndent.date,
              indentedBy: previewIndent.indentedBy,
              forwardedBy: previewIndent.forwardedBy,
              directorsApproval: previewIndent.directorsApproval,
              remarksNotes: previewIndent.remarksNotes || '',
              budgetHead: previewIndent.budgetHead || '',
              items: previewIndent.items,
            }} attachments={diary} />
          )}

          <DialogFooter>
            <Button onClick={() => setPreviewIndent(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseRequisition;
