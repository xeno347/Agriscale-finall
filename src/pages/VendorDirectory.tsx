import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Building2 } from 'lucide-react';
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

type VendorType = 'Machinery' | 'Seeds' | 'Fertilizer' | 'Chemicals' | 'Services' | 'Transport' | 'Other';

type Vendor = {
  id: string;
  name: string;
  type: VendorType;
  phone: string;
  email: string;
  gst: string;
  address: string;
};

const STORAGE_KEY = 'farmconnect.vendorDirectory.v1';

const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultVendors: Vendor[] = [
  { id: 'v1', name: 'Vishwakarma', type: 'Machinery', phone: '', email: '', gst: '', address: '' },
];

const readVendors = (): Vendor[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultVendors;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultVendors;
    return parsed.map((v: any) => ({
      id: String(v?.id ?? genId()),
      name: String(v?.name ?? ''),
      type: (String(v?.type ?? 'Other') as VendorType),
      phone: String(v?.phone ?? ''),
      email: String(v?.email ?? ''),
      gst: String(v?.gst ?? ''),
      address: String(v?.address ?? ''),
    })).filter((v: Vendor) => v.name.trim());
  } catch {
    return defaultVendors;
  }
};

const writeVendors = (vendors: Vendor[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors));
  } catch {
    // ignore
  }
};

const VendorDirectory = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [q, setQ] = useState('');
  const [type, setType] = useState<VendorType | 'All'>('All');
  const [open, setOpen] = useState(false);

  // create form
  const [name, setName] = useState('');
  const [vType, setVType] = useState<VendorType>('Other');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gst, setGst] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    setVendors(readVendors());
  }, []);

  useEffect(() => {
    writeVendors(vendors);
  }, [vendors]);

  const types = useMemo(() => {
    const set = new Set<VendorType>();
    vendors.forEach((v) => set.add(v.type));
    return Array.from(set);
  }, [vendors]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return vendors.filter((v) => {
      const matchesType = type === 'All' ? true : v.type === type;
      const matchesQuery = !query
        ? true
        : [v.name, v.phone, v.email, v.gst, v.address, v.type].some((x) => String(x ?? '').toLowerCase().includes(query));
      return matchesType && matchesQuery;
    });
  }, [vendors, q, type]);

  const resetForm = () => {
    setName('');
    setVType('Other');
    setPhone('');
    setEmail('');
    setGst('');
    setAddress('');
  };

  const addVendor = () => {
    if (!name.trim()) return toast.error('Vendor name is required');
    const next: Vendor = {
      id: genId(),
      name: name.trim(),
      type: vType,
      phone: phone.trim(),
      email: email.trim(),
      gst: gst.trim(),
      address: address.trim(),
    };
    setVendors((p) => [next, ...p]);
    setOpen(false);
    resetForm();
    toast.success('Vendor added');
  };

  const removeVendor = (id: string) => {
    setVendors((p) => p.filter((x) => x.id !== id));
    toast.success('Vendor removed');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage vendors by type and add new vendors.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <Plus className="w-4 h-4" /> New Vendor
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9 bg-white" placeholder="Search vendors…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="All">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((v) => (
          <div key={v.id} className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{v.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{v.type}</p>
              </div>
              <button type="button" onClick={() => removeVendor(v.id)} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 text-sm text-gray-700 space-y-1">
              {v.phone && <div><span className="text-gray-500">Phone:</span> {v.phone}</div>}
              {v.email && <div><span className="text-gray-500">Email:</span> {v.email}</div>}
              {v.gst && <div><span className="text-gray-500">GST:</span> {v.gst}</div>}
              {v.address && <div className="text-gray-600">{v.address}</div>}
              {!v.phone && !v.email && !v.gst && !v.address && (
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> No details
                </div>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center text-sm text-gray-400 py-10">No vendors found.</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Vendor Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vishwakarma" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Vendor Type</label>
              <select
                value={vType}
                onChange={(e) => setVType(e.target.value as VendorType)}
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                {(['Machinery','Seeds','Fertilizer','Chemicals','Services','Transport','Other'] as VendorType[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">GST</label>
              <Input value={gst} onChange={(e) => setGst(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={addVendor}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorDirectory;
