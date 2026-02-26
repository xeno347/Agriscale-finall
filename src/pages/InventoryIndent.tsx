import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Send, Settings, Trash2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  readInventoryIndentConfig,
  writeInventoryIndentConfig,
} from '@/lib/inventoryIndentConfig';
import { readSignatureDiary, type SignatureDiary } from '@/lib/signatureDiary';

type PRLineItem = {
  id: string;
  srNo: number;
  itemCode: string;
  partName: string;
  specification: string;
  uom: string;
  totalQtyRequired: number;
  lessQtyAvailableInStock: number;
  procurementLeadTimeWeeks: number;
  materialRequiredByDate: string;
  indigenousOrImported: 'Indigenous' | 'Imported';
  ratePerItem: number;
  preferredVendorName: string;
  validityOfWarrantyAndGuarantee: string;
  fullLifeHr: string;
  actualLifeHr: string;
  reasonForReplacement: string;
  repairingPossibility: 'Yes' | 'No' | 'NA';
};

type Indent = {
  id: string;
  // Header
  project: string;
  prNo: string; // will be auto-generated via API later
  date: string;

  // Footer
  indentedBy: string;
  forwardedBy: string;
  directorsApproval: string;
  remarksNotes: string;
  budgetHead: string;

  // Body
  items: PRLineItem[];

  // workflow
  status: 'open' | 'approved' | 'rejected';
};

const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = () => new Date().toISOString().split('T')[0];

const netPrQty = (it: PRLineItem) => Math.max(0, (it.totalQtyRequired || 0) - (it.lessQtyAvailableInStock || 0));
const approxValue = (it: PRLineItem) => netPrQty(it) * (it.ratePerItem || 0);
const totalValue = (items: PRLineItem[]) => items.reduce((sum, it) => sum + approxValue(it), 0);

const formatInr = (value: number) => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  } catch {
    return `₹ ${Math.round(value).toLocaleString()}`;
  }
};

const emptyLineItem = (srNo: number): PRLineItem => ({
  id: genId(),
  srNo,
  itemCode: '',
  partName: '',
  specification: '',
  uom: 'No',
  totalQtyRequired: 0,
  lessQtyAvailableInStock: 0,
  procurementLeadTimeWeeks: 0,
  materialRequiredByDate: today(),
  indigenousOrImported: 'Indigenous',
  ratePerItem: 0,
  preferredVendorName: '',
  validityOfWarrantyAndGuarantee: 'NA',
  fullLifeHr: 'NA',
  actualLifeHr: 'NA',
  reasonForReplacement: 'NA',
  repairingPossibility: 'NA',
});

const initialIndents: Indent[] = [
  {
    id: 'i1',
    project: 'Chhattisgarh 2250 Acres',
    prNo: 'SBR/NF/25-26/03',
    date: '2026-02-09',
    indentedBy: 'SUKHDEEP SINGH',
    forwardedBy: 'RAJINDER SINGH PADDA',
    directorsApproval: 'RAJENDRA SHRINGARPUTALE',
    remarksNotes: '',
    budgetHead: 'Machinery - Cultivation',
    status: 'open',
    items: [
      {
        id: 'li1',
        srNo: 1,
        itemCode: '',
        partName: 'Chisel Plough',
        specification: '5 - Tynes/W - 4 ft',
        uom: 'No',
        totalQtyRequired: 4,
        lessQtyAvailableInStock: 0,
        procurementLeadTimeWeeks: 2,
        materialRequiredByDate: '2026-02-09',
        indigenousOrImported: 'Indigenous',
        ratePerItem: 45000,
        preferredVendorName: 'Vishwakarma',
        validityOfWarrantyAndGuarantee: 'NA',
        fullLifeHr: 'NA',
        actualLifeHr: 'NA',
        reasonForReplacement: 'Project Item',
        repairingPossibility: 'NA',
      },
    ],
  },
];

const InventoryIndent = () => {
  const [indents, setIndents] = useState<Indent[]>(initialIndents);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  const [previewIndent, setPreviewIndent] = useState<Indent | null>(null);
  const [editIndent, setEditIndent] = useState<Indent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [attachments, setAttachments] = useState<SignatureDiary>({});
  const [directorsAttachedMap, setDirectorsAttachedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setAttachments(readSignatureDiary());
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return indents.filter((it) =>
      (it.project ?? '').toLowerCase().includes(q) ||
      (it.prNo ?? '').toLowerCase().includes(q) ||
      (it.indentedBy ?? '').toLowerCase().includes(q) ||
      (it.items ?? []).some(
        (li) =>
          (li.partName ?? '').toLowerCase().includes(q) ||
          (li.itemCode ?? '').toLowerCase().includes(q),
      ),
    );
  }, [indents, search]);

  const attachDirectorSignature = (id: string, indent: Indent) => {
    const diary = readSignatureDiary();
    const person = indent.directorsApproval?.trim();
    if (!person) { toast.error('No director name set for this indent'); return; }
    const entry = diary[person];
    if (!entry || !entry.signature) { toast.error(`No signature found for ${person} in diary`); return; }
    setDirectorsAttachedMap((p) => ({ ...p, [id]: true }));
    toast.success(`Signature attached for ${person}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Indents</h1>
          <p className="text-sm text-gray-500 mt-0.5">View indents raised and create new indent requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setConfigOpen(true)} className="gap-2">
            <Settings className="w-4 h-4" />
            Configure
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Create Indent
          </Button>
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by PR no, project, item or requester…"
          className="pl-9 bg-white border-gray-200 shadow-sm h-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((it) => (
          <div
            key={it.id}
            className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-gray-200"
            onClick={() => setPreviewIndent(it)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setPreviewIndent(it);
            }}
          >
            <div>
              <div className="flex items-baseline gap-3">
                <h3 className="font-semibold text-gray-800">{it.prNo || 'PR (Draft)'}</h3>
                <span className="text-xs text-gray-400">{it.project}</span>
              </div>
              <p className="text-sm text-gray-500">
                Items: {(it.items ?? []).length} · Total: {formatInr(totalValue(it.items ?? []))} · Indented by {it.indentedBy || '—'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={`text-sm font-semibold ${it.status === 'open' ? 'text-yellow-600' : it.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>{it.status.toUpperCase()}</p>
                <p className="text-xs text-gray-400">{it.date}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditIndent(it);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toast.success('Indent sent');
                  }}
                >
                  <Send className="w-4 h-4" />
                  Send
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); attachDirectorSignature(it.id, it); }}
                  disabled={Boolean(directorsAttachedMap[it.id])}
                >
                  <Paperclip className="w-4 h-4" />
                  {directorsAttachedMap[it.id] ? 'Sig Attached' : 'Attach Sig'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddIndentModal
        open={open}
        onClose={() => setOpen(false)}
        configVersion={configVersion}
        mode="create"
        onSave={(data) => {
          setIndents((p) => [{ ...data, id: genId(), status: 'open' }, ...p]);
          setOpen(false);
          toast.success('Indent created');
        }}
      />

      <AddIndentModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditIndent(null);
        }}
        configVersion={configVersion}
        mode="edit"
        initialData={
          editIndent
            ? {
                project: editIndent.project,
                prNo: editIndent.prNo,
                date: editIndent.date,
                indentedBy: editIndent.indentedBy,
                forwardedBy: editIndent.forwardedBy,
                directorsApproval: editIndent.directorsApproval,
                remarksNotes: editIndent.remarksNotes,
                budgetHead: editIndent.budgetHead,
                items: editIndent.items,
              }
            : null
        }
        onSave={(data) => {
          if (!editIndent) return;
          setIndents((prev) =>
            prev.map((x) =>
              x.id === editIndent.id ? { ...x, ...data } : x,
            ),
          );
          setEditOpen(false);
          setEditIndent(null);
          toast.success('Indent updated');
        }}
      />

      <IndentPreviewModal
        indent={previewIndent}
        attachments={attachments}
        showDirectorSignature={previewIndent ? (previewIndent.status === 'approved' || Boolean(directorsAttachedMap[previewIndent.id])) : false}
        onClose={() => setPreviewIndent(null)}
      />

      <ConfigureIndentModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSaved={() => setConfigVersion((v) => v + 1)}
      />
    </div>
  );
};

const AddIndentModal = ({
  open,
  onClose,
  configVersion,
  mode,
  initialData,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  configVersion: number;
  mode: 'create' | 'edit';
  initialData?: Omit<Indent, 'id' | 'status'> | null;
  onSave: (d: Omit<Indent, 'id' | 'status'>) => void;
}) => {
  // Header
  const [project, setProject] = useState('');
  const [prNo, setPrNo] = useState('');
  const [date, setDate] = useState(today());

  const [configuredProjects, setConfiguredProjects] = useState<string[]>([]);

  // Footer
  const [indentedBy, setIndentedBy] = useState('');
  const [forwardedBy, setForwardedBy] = useState('');
  const [directorsApproval, setDirectorsApproval] = useState('');
  const [remarksNotes, setRemarksNotes] = useState('');
  const [budgetHead, setBudgetHead] = useState('');

  // Items
  const initialRow = useMemo(() => emptyLineItem(1), []);
  const [items, setItems] = useState<PRLineItem[]>([initialRow]);
  const [openRowId, setOpenRowId] = useState<string>(initialRow.id);

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setProject(initialData.project ?? '');
      setPrNo(initialData.prNo ?? '');
      setDate(initialData.date ?? today());

      setIndentedBy(initialData.indentedBy ?? '');
      setForwardedBy(initialData.forwardedBy ?? '');
      setDirectorsApproval(initialData.directorsApproval ?? '');
      setRemarksNotes(initialData.remarksNotes ?? '');
      setBudgetHead(initialData.budgetHead ?? '');

      const nextItems = Array.isArray(initialData.items) && initialData.items.length > 0
        ? initialData.items
        : [emptyLineItem(1)];
      setItems(nextItems.map((x, idx) => ({ ...x, srNo: idx + 1 })));
      setOpenRowId(nextItems[nextItems.length - 1].id);
      setConfiguredProjects(readInventoryIndentConfig().projects ?? []);
      return;
    }

    const cfg = readInventoryIndentConfig();
    setConfiguredProjects(cfg.projects ?? []);

    setIndentedBy((prev) => (prev.trim() ? prev : (cfg.indentedBy ?? '')));
    setForwardedBy((prev) => (prev.trim() ? prev : (cfg.forwardedBy ?? '')));
    setDirectorsApproval((prev) => (prev.trim() ? prev : (cfg.directorsApproval ?? '')));

    setProject((prev) => {
      if (prev.trim()) return prev;
      const first = (cfg.projects ?? [])[0];
      return first ?? '';
    });
  }, [open, configVersion, initialData]);

  const updateItem = <K extends keyof PRLineItem>(id: string, key: K, value: PRLineItem[K]) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [key]: value } : it)));
  };

  const addRow = () => {
    setItems((prev) => {
      const nextRow = emptyLineItem(prev.length + 1);
      setOpenRowId(nextRow.id);
      return [...prev, nextRow];
    });
  };

  const removeRow = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== id);
      const renumbered = next.map((x, idx) => ({ ...x, srNo: idx + 1 }));
      if (openRowId === id) setOpenRowId(renumbered[renumbered.length - 1]?.id ?? '');
      return renumbered;
    });
  };

  const handleSave = () => {
    if (!project.trim()) return toast.error('Project is required');
    if (items.length === 0) return toast.error('Add at least 1 item row');
    if (items.some((i) => !i.partName.trim())) return toast.error('Each row must have Part Name');
    onSave({
      project: project.trim(),
      prNo: prNo.trim(), // API integration later
      date,
      indentedBy: indentedBy.trim(),
      forwardedBy: forwardedBy.trim(),
      directorsApproval: directorsApproval.trim(),
      remarksNotes,
      budgetHead,
      items,
    });

    setProject('');
    setPrNo('');
    setDate(today());
    setIndentedBy('');
    setForwardedBy('');
    setDirectorsApproval('');
    setRemarksNotes('');
    setBudgetHead('');
    const firstRow = emptyLineItem(1);
    setItems([firstRow]);
    setOpenRowId(firstRow.id);
  };

  const previewIndent: Omit<Indent, 'id' | 'status'> = {
    project,
    prNo,
    date,
    indentedBy,
    forwardedBy,
    directorsApproval,
    remarksNotes,
    budgetHead,
    items,
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'edit' ? 'Edit Indent (PR)' : 'Create New Indent (PR)'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Live Preview (PR format table) - placed above form for landscape visibility */}
          <div className="bg-white rounded-lg border border-gray-100 p-4 overflow-x-auto">
            {
              (() => {
                const diary = readSignatureDiary();
                const showDirectorSig = Boolean(previewIndent.directorsApproval && diary[previewIndent.directorsApproval]?.signature);
                return (
                  <PRPreview
                    indent={previewIndent}
                    attachments={diary}
                    showDirectorSignature={showDirectorSig}
                  />
                );
              })()
            }
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-800 mb-3">Header</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Project *</label>
                  {configuredProjects.length > 0 ? (
                    <select
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                    >
                      <option value="">Select project</option>
                      {configuredProjects.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. Chhattisgarh 2250 Acres" />
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">PR No. (API later)</label>
                  <Input value={prNo} onChange={(e) => setPrNo(e.target.value)} placeholder="e.g. SBR/NF/25-26/03" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Date</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-800">Line Items</p>
                <Button type="button" variant="outline" onClick={addRow}>
                  + Add Row
                </Button>
              </div>

              <Accordion type="single" collapsible value={openRowId} onValueChange={(v) => setOpenRowId(v)} className="space-y-2">
                {items.map((it) => (
                  <AccordionItem
                    key={it.id}
                    value={it.id}
                    className="rounded-lg border border-gray-100 bg-gray-50 px-3"
                  >
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex w-full items-center justify-between pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">Row {it.srNo}</span>
                          <span className="text-xs text-gray-400 truncate max-w-[260px]">{it.partName || '—'}</span>
                        </div>
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="text-xs text-gray-400 hover:text-red-600"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeRow(it.id);
                            }}
                            title="Remove row"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pt-0 pb-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Part Name *</label>
                          <Input value={it.partName} onChange={(e) => updateItem(it.id, 'partName', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Item Code</label>
                          <Input value={it.itemCode} onChange={(e) => updateItem(it.id, 'itemCode', e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Specification</label>
                          <Input value={it.specification} onChange={(e) => updateItem(it.id, 'specification', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">UoM</label>
                          <Input value={it.uom} onChange={(e) => updateItem(it.id, 'uom', e.target.value)} placeholder="No / kg / litre" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Total Qty</label>
                          <Input
                            type="number"
                            min={0}
                            value={it.totalQtyRequired}
                            onChange={(e) => updateItem(it.id, 'totalQtyRequired', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Less Qty (Stock)</label>
                          <Input
                            type="number"
                            min={0}
                            value={it.lessQtyAvailableInStock}
                            onChange={(e) => updateItem(it.id, 'lessQtyAvailableInStock', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Net PR Qty</label>
                          <Input value={netPrQty(it)} readOnly />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Lead Time (weeks)</label>
                          <Input
                            type="number"
                            min={0}
                            value={it.procurementLeadTimeWeeks}
                            onChange={(e) => updateItem(it.id, 'procurementLeadTimeWeeks', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Material Required By</label>
                          <Input
                            type="date"
                            value={it.materialRequiredByDate}
                            onChange={(e) => updateItem(it.id, 'materialRequiredByDate', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Indigenous / Imported</label>
                          <select
                            className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={it.indigenousOrImported}
                            onChange={(e) => updateItem(it.id, 'indigenousOrImported', e.target.value as any)}
                          >
                            <option value="Indigenous">Indigenous</option>
                            <option value="Imported">Imported</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Preferred Vendor Name</label>
                          <Input value={it.preferredVendorName} onChange={(e) => updateItem(it.id, 'preferredVendorName', e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Rate / Item</label>
                          <Input
                            type="number"
                            min={0}
                            value={it.ratePerItem}
                            onChange={(e) => updateItem(it.id, 'ratePerItem', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Approx. Value</label>
                          <Input value={formatInr(approxValue(it))} readOnly />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Warranty / Guarantee Validity</label>
                          <Input value={it.validityOfWarrantyAndGuarantee} onChange={(e) => updateItem(it.id, 'validityOfWarrantyAndGuarantee', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Reason for replacement</label>
                          <Input value={it.reasonForReplacement} onChange={(e) => updateItem(it.id, 'reasonForReplacement', e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Full life (Hr)</label>
                          <Input value={it.fullLifeHr} onChange={(e) => updateItem(it.id, 'fullLifeHr', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Actual life (Hr)</label>
                          <Input value={it.actualLifeHr} onChange={(e) => updateItem(it.id, 'actualLifeHr', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Repairing possibility</label>
                          <select
                            className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={it.repairingPossibility}
                            onChange={(e) => updateItem(it.id, 'repairingPossibility', e.target.value as any)}
                          >
                            <option value="NA">NA</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-800 mb-3">Footer</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Indented By</label>
                  <Input value={indentedBy} onChange={(e) => setIndentedBy(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Forwarded By</label>
                  <Input value={forwardedBy} onChange={(e) => setForwardedBy(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Director's Approval</label>
                  <Input value={directorsApproval} onChange={(e) => setDirectorsApproval(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Budget Head</label>
                  <Input value={budgetHead} onChange={(e) => setBudgetHead(e.target.value)} />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs font-medium text-gray-500">Remarks / Notes</label>
                <Input value={remarksNotes} onChange={(e) => setRemarksNotes(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSave}>
            {mode === 'edit' ? 'Save Changes' : 'Create Indent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const IndentPreviewModal = ({
   indent,
   attachments,
   showDirectorSignature,
   onClose,
 }: {
   indent: Indent | null;
   attachments?: SignatureDiary;
   showDirectorSignature?: boolean;
   onClose: () => void;
 }) => {
   return (
     <Dialog
       open={Boolean(indent)}
       onOpenChange={(v) => {
         if (!v) onClose();
       }}
     >
       <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>Indent Preview</DialogTitle>
         </DialogHeader>

         {indent && (
           <div className="bg-white rounded-lg border border-gray-100 p-4 overflow-x-auto">
             <PRPreview
               indent={{
                 project: indent.project,
                 prNo: indent.prNo,
                 date: indent.date,
                 indentedBy: indent.indentedBy,
                 forwardedBy: indent.forwardedBy,
                 directorsApproval: indent.directorsApproval,
                 remarksNotes: indent.remarksNotes,
                 budgetHead: indent.budgetHead,
                 items: indent.items,
               }}
               attachments={attachments}
               showDirectorSignature={showDirectorSignature}
             />
           </div>
         )}

         <DialogFooter>
           <Button onClick={onClose}>Close</Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
};

const PRPreview = ({ indent, attachments, showDirectorSignature }: { indent: Omit<Indent, 'id' | 'status'>; attachments?: SignatureDiary; showDirectorSignature?: boolean }) => {
  const sigFor = (name: string) => attachments?.[name] ?? null;
  return (
    <div className="min-w-[980px]">
      <div className="border border-gray-300">
        {/* Top title */}
        <div className="text-center font-semibold text-sm py-2 border-b border-gray-300">
          SAI BIORESOURCES PRIVATE LIMITED
        </div>

        {/* Header row */}
        <div className="grid grid-cols-12 border-b border-gray-300 text-xs">
          <div className="col-span-4 p-2 border-r border-gray-300">
            <span className="font-semibold">Project:</span> {indent.project || '—'}
          </div>
          <div className="col-span-4 p-2 border-r border-gray-300 text-center font-semibold">
            PURCHASE REQUISITION (PR.)
          </div>
          <div className="col-span-2 p-2 border-r border-gray-300">
            <span className="font-semibold">PR No.</span> {indent.prNo || '—'}
          </div>
          <div className="col-span-2 p-2">
            <span className="font-semibold">Date:</span> {indent.date || '—'}
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-1 py-1 w-[28px]">Sr. Nos.</th>
              <th className="border border-gray-300 px-1 py-1 w-[70px]">Item Code</th>
              <th className="border border-gray-300 px-1 py-1">Part Name</th>
              <th className="border border-gray-300 px-1 py-1">Specification</th>
              <th className="border border-gray-300 px-1 py-1 w-[50px]">UoM</th>
              <th className="border border-gray-300 px-1 py-1 w-[70px]">Total Qty. Required</th>
              <th className="border border-gray-300 px-1 py-1 w-[80px]">Less Qty. Available in Stocks</th>
              <th className="border border-gray-300 px-1 py-1 w-[60px]">Net PR Qty</th>
              <th className="border border-gray-300 px-1 py-1 w-[70px]">Procurement Lead time (weeks)</th>
              <th className="border border-gray-300 px-1 py-1 w-[85px]">Material Required by Date</th>
              <th className="border border-gray-300 px-1 py-1 w-[70px]">Indigenous / Imported</th>
              <th className="border border-gray-300 px-1 py-1 w-[60px]">Rate/Item</th>
              <th className="border border-gray-300 px-1 py-1 w-[85px]">Approx. Value Rs.</th>
              <th className="border border-gray-300 px-1 py-1">Preferred Vendor Name</th>
              <th className="border border-gray-300 px-1 py-1 w-[85px]">Validity of Warranty and Guarantee</th>
              <th className="border border-gray-300 px-1 py-1 w-[60px]">Full life (Hr)</th>
              <th className="border border-gray-300 px-1 py-1 w-[60px]">Actual Life (Hr)</th>
              <th className="border border-gray-300 px-1 py-1 w-[90px]">Reason for replacement</th>
              <th className="border border-gray-300 px-1 py-1 w-[85px]">Repairing possibility Yes/No/NA</th>
            </tr>
          </thead>
          <tbody>
            {indent.items.map((it) => (
              <tr key={it.id}>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.srNo}</td>
                <td className="border border-gray-300 px-1 py-1">{it.itemCode || ''}</td>
                <td className="border border-gray-300 px-1 py-1">{it.partName || ''}</td>
                <td className="border border-gray-300 px-1 py-1">{it.specification || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.uom || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.totalQtyRequired || 0}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.lessQtyAvailableInStock || 0}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{netPrQty(it)}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.procurementLeadTimeWeeks || 0}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.materialRequiredByDate || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.indigenousOrImported}</td>
                <td className="border border-gray-300 px-1 py-1 text-right">{it.ratePerItem ? it.ratePerItem.toLocaleString() : ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-right">{approxValue(it) ? formatInr(approxValue(it)) : ''}</td>
                <td className="border border-gray-300 px-1 py-1">{it.preferredVendorName || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.validityOfWarrantyAndGuarantee || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.fullLifeHr || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.actualLifeHr || ''}</td>
                <td className="border border-gray-300 px-1 py-1">{it.reasonForReplacement || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.repairingPossibility || 'NA'}</td>
              </tr>
            ))}

            <tr>
              <td colSpan={12} className="border border-gray-300 px-1 py-1 text-right font-semibold">TOTAL</td>
              <td colSpan={7} className="border border-gray-300 px-1 py-1 text-right font-semibold">
                {formatInr(totalValue(indent.items))}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer / signatures and remarks */}
        <div className="grid grid-cols-12 text-xs border-t border-gray-300">
          <div className="col-span-8 border-r border-gray-300">
            <div className="grid grid-cols-4 border-b border-gray-300">
              <div className="p-2 font-semibold">SAI BIORESOURCES PRIVATE LIMITED</div>
              <div className="p-2 font-semibold text-center">Name/ID</div>
              <div className="p-2 font-semibold text-center">Signature</div>
              <div className="p-2 font-semibold text-center">Date</div>
            </div>

            <div className="grid grid-cols-4 border-b border-gray-300">
              <div className="p-2 font-semibold">Indented By</div>
              <div className="p-2 text-center">{indent.indentedBy || '—'}</div>
              <div className="p-2 text-center text-gray-400">—</div>
              <div className="p-2 text-center">{indent.date || '—'}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-gray-300">
              <div className="p-2 font-semibold">Forwarded By</div>
              <div className="p-2 text-center">{indent.forwardedBy || '—'}</div>
              <div className="p-2 text-center text-gray-400">—</div>
              <div className="p-2 text-center">{indent.date || '—'}</div>
            </div>
            <div className="grid grid-cols-4">
              <div className="p-2 font-semibold">Director's Approval</div>
              <div className="p-2 text-center">{indent.directorsApproval || '—'}</div>
              <div className="p-2 flex flex-col items-center justify-center gap-0.5">
                {showDirectorSignature && sigFor(indent.directorsApproval)?.signature ? (
                  <img src={sigFor(indent.directorsApproval)!.signature} alt="Signature" className="h-8 object-contain" />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
                {showDirectorSignature && sigFor(indent.directorsApproval)?.stamp ? (
                  <img src={sigFor(indent.directorsApproval)!.stamp} alt="Stamp" className="h-8 object-contain" />
                ) : null}
              </div>
              <div className="p-2 text-center">{indent.date || '—'}</div>
            </div>
          </div>

          <div className="col-span-4">
            <div className="grid grid-cols-1 border-b border-gray-300">
              <div className="p-2 font-semibold">Remarks / Notes</div>
              <div className="p-2 min-h-[56px] text-gray-700">{indent.remarksNotes || ''}</div>
            </div>
            <div className="p-2">
              <div className="font-semibold">Budget Head</div>
              <div className="text-gray-700">{indent.budgetHead || '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConfigureIndentModal = ({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [indentedBy, setIndentedBy] = useState('');
  const [forwardedBy, setForwardedBy] = useState('');
  const [directorsApproval, setDirectorsApproval] = useState('');

  const [projects, setProjects] = useState<string[]>([]);
  const [newProject, setNewProject] = useState('');

  useEffect(() => {
    if (!open) return;
    const cfg = readInventoryIndentConfig();
    setIndentedBy(cfg.indentedBy ?? '');
    setForwardedBy(cfg.forwardedBy ?? '');
    setDirectorsApproval(cfg.directorsApproval ?? '');
    setProjects(cfg.projects ?? []);
    setNewProject('');
  }, [open]);

  const addProject = () => {
    const name = newProject.trim();
    if (!name) return;
    setProjects((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setNewProject('');
  };

  const removeProject = (name: string) => {
    setProjects((prev) => prev.filter((p) => p !== name));
  };

  const save = () => {
    writeInventoryIndentConfig({
      indentedBy: indentedBy.trim(),
      forwardedBy: forwardedBy.trim(),
      directorsApproval: directorsApproval.trim(),
      projects,
    });
    toast.success('Indent configuration saved');
    onSaved();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configure Inventory Indents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-white rounded-lg border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-800 mb-3">Default Names</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Indented by</label>
                <Input value={indentedBy} onChange={(e) => setIndentedBy(e.target.value)} placeholder="e.g. SUKHDEEP SINGH" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Forwarded by</label>
                <Input value={forwardedBy} onChange={(e) => setForwardedBy(e.target.value)} placeholder="e.g. RAJINDER SINGH PADDA" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500">Director's Approval by</label>
                <Input value={directorsApproval} onChange={(e) => setDirectorsApproval(e.target.value)} placeholder="e.g. RAJENDRA SHRINGARPUTALE" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-800 mb-3">Project Categories</p>

            <div className="flex gap-2">
              <Input
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="Add project name (e.g. Chhattisgarh 2250 Acres)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addProject();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addProject}>
                + Add
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {projects.length === 0 ? (
                <p className="text-sm text-gray-400">No projects added yet.</p>
              ) : (
                projects.map((p) => (
                  <div key={p} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <span className="text-sm text-gray-800 truncate">{p}</span>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-600"
                      onClick={() => removeProject(p)}
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryIndent;
