import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Building2, Package, Info, Edit2 } from 'lucide-react';
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
  // primary contact
  phone?: string;
  email?: string;
  gst?: string;
  // identity
  pan?: string;
  aadhar?: string;
  // address fields (stored as concatenated string for backward compatibility)
  address?: string;
  placeOfSupplyAddress?: string;
  // bank and contacts
  bankName?: string;
  bankBranch?: string;
  ifsCode?: string;
  accountType?: string;
  accountNumber?: string;
  // primary contact number stored separately
  contactNumber?: string;
  salesContactName?: string;
  salesContactMobile?: string;
  salesContactEmail?: string;
  commercialContactName?: string;
  commercialContactMobile?: string;
  commercialContactEmail?: string;
  masmeUdyamNo?: string;
  // supply contact
  supplyContactNumber?: string;
  supplyContactEmail?: string;
  // documents (store file names)
  panFile?: string;
  aadharFile?: string;
  gstFile?: string;
  cancelledChequeFile?: string;
  udyamCertificateFile?: string;
  // tags
  tags?: string[];
};

const STORAGE_KEY = 'farmconnect.vendorDirectory.v1';

const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultVendors: Vendor[] = [
  {
    id: 'v1',
    name: 'Vishwakarma Engineering',
    type: 'Machinery',
    phone: '080-2345-6789',
    contactNumber: '08023456789',
    email: 'contact@vishwakarma.example',
    gst: '27ABCDE1234F1Z5',
    address: 'Plot 12, Industrial Estate, Pune, Maharashtra - 411001',
    tags: ['machinery', 'services'],
  },
  {
    id: 'v2',
    name: 'GreenSeeds Pvt Ltd',
    type: 'Seeds',
    phone: '091-9988-7766',
    contactNumber: '9199887766',
    email: 'sales@greenseeds.example',
    gst: '27FGHIJ5678K2Z6',
    address: 'Block B, Agro Park, Nashik, Maharashtra - 422001',
    tags: ['seeds', 'agriculture equipments'],
  },
  {
    id: 'v3',
    name: 'AgriTech Solutions',
    type: 'Services',
    phone: '022-4444-5555',
    contactNumber: '2244445555',
    email: 'info@agritech.example',
    gst: '27KLMNO9012P3Z7',
    address: '3rd Floor, Tech Park, Mumbai, Maharashtra - 400001',
    tags: ['IOT devices', 'electronics', 'computer'],
  },
  {
    id: 'v4',
    name: 'Fertico Industries',
    type: 'Fertilizer',
    phone: '033-6677-8899',
    contactNumber: '3366778899',
    email: 'support@fertico.example',
    gst: '19PQRST3456U4Z8',
    address: 'Village Road, Kolkata, West Bengal - 700001',
    tags: ['fertilizer', 'chemicals'],
  },
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
      phone: v?.phone ? String(v.phone) : undefined,
      email: v?.email ? String(v.email) : undefined,
      gst: v?.gst ? String(v.gst) : undefined,
      pan: v?.pan ? String(v.pan) : undefined,
      aadhar: v?.aadhar ? String(v.aadhar) : undefined,
      address: v?.address ? String(v.address) : undefined,
      placeOfSupplyAddress: v?.placeOfSupplyAddress ? String(v.placeOfSupplyAddress) : undefined,
      bankName: v?.bankName ? String(v.bankName) : undefined,
      bankBranch: v?.bankBranch ? String(v.bankBranch) : undefined,
      ifsCode: v?.ifsCode ? String(v.ifsCode) : undefined,
      accountType: v?.accountType ? String(v.accountType) : undefined,
      accountNumber: v?.accountNumber ? String(v.accountNumber) : undefined,
      salesContactName: v?.salesContactName ? String(v.salesContactName) : undefined,
      salesContactMobile: v?.salesContactMobile ? String(v.salesContactMobile) : undefined,
      salesContactEmail: v?.salesContactEmail ? String(v.salesContactEmail) : undefined,
      commercialContactName: v?.commercialContactName ? String(v.commercialContactName) : undefined,
      commercialContactMobile: v?.commercialContactMobile ? String(v.commercialContactMobile) : undefined,
      commercialContactEmail: v?.commercialContactEmail ? String(v.commercialContactEmail) : undefined,
      masmeUdyamNo: v?.masmeUdyamNo ? String(v.masmeUdyamNo) : undefined,
      contactNumber: v?.contactNumber ? String(v.contactNumber) : undefined,
      supplyContactNumber: v?.supplyContactNumber ? String(v.supplyContactNumber) : undefined,
      supplyContactEmail: v?.supplyContactEmail ? String(v.supplyContactEmail) : undefined,
      panFile: v?.panFile ? String(v.panFile) : undefined,
      aadharFile: v?.aadharFile ? String(v.aadharFile) : undefined,
      gstFile: v?.gstFile ? String(v.gstFile) : undefined,
      cancelledChequeFile: v?.cancelledChequeFile ? String(v.cancelledChequeFile) : undefined,
      udyamCertificateFile: v?.udyamCertificateFile ? String(v.udyamCertificateFile) : undefined,
      tags: Array.isArray(v?.tags) ? v.tags.map(String) : undefined,
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
  // step management
  const [step, setStep] = useState(1);

  // step 1 additional fields
  const [nature, setNature] = useState('');
  const [pan, setPan] = useState('');
  const [aadhar, setAadhar] = useState('');
  // primary address split fields (simple strings)
  const [addressPlot, setAddressPlot] = useState('');
  const [addressPremises, setAddressPremises] = useState('');
  const [addressRoad, setAddressRoad] = useState('');
  const [addressLocality, setAddressLocality] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPin, setAddressPin] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  // place of supply address fields
  const [supplyPlot, setSupplyPlot] = useState('');
  const [supplyPremises, setSupplyPremises] = useState('');
  const [supplyRoad, setSupplyRoad] = useState('');
  const [supplyLocality, setSupplyLocality] = useState('');
  const [supplyDistrict, setSupplyDistrict] = useState('');
  const [supplyState, setSupplyState] = useState('');
  const [supplyPin, setSupplyPin] = useState('');
  const [supplyContactNumber, setSupplyContactNumber] = useState('');
  const [supplyContactEmail, setSupplyContactEmail] = useState('');
  const [supplyGst, setSupplyGst] = useState('');

  // step 2 bank/contact details
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [ifsCode, setIfsCode] = useState('');
  const [accountType, setAccountType] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [salesName, setSalesName] = useState('');
  const [salesMobile, setSalesMobile] = useState('');
  const [salesEmail, setSalesEmail] = useState('');
  const [commercialName, setCommercialName] = useState('');
  const [commercialMobile, setCommercialMobile] = useState('');
  const [commercialEmail, setCommercialEmail] = useState('');
  const [masmeUdyamNo, setMasmeUdyamNo] = useState('');

  // step 3 documents (store file names)
  const [panFile, setPanFile] = useState<string | undefined>(undefined);
  const [aadharFile, setAadharFile] = useState<string | undefined>(undefined);
  const [gstFile, setGstFile] = useState<string | undefined>(undefined);
  const [cancelledChequeFile, setCancelledChequeFile] = useState<string | undefined>(undefined);
  const [udyamCertificateFile, setUdyamCertificateFile] = useState<string | undefined>(undefined);

  // step 4 tags
  const availableTags = [
    'computer', 'electronics', 'agriculture equipments', 'IOT devices', 'seeds', 'fertilizer', 'chemicals', 'transport', 'services', 'machinery'
  ];
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsVendor, setDetailsVendor] = useState<Vendor | null>(null);

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
    setStep(1);
    setNature('');
    setPan('');
    setAadhar('');
    setAddressPlot('');
    setAddressPremises('');
    setAddressRoad('');
    setAddressLocality('');
    setAddressDistrict('');
    setAddressState('');
    setAddressPin('');
    setContactNumber('');
    setContactEmail('');
    setSupplyPlot('');
    setSupplyPremises('');
    setSupplyRoad('');
    setSupplyLocality('');
    setSupplyDistrict('');
    setSupplyState('');
    setSupplyPin('');
    setSupplyContactNumber('');
    setSupplyContactEmail('');
    setSupplyGst('');
    setBankName('');
    setBankBranch('');
    setIfsCode('');
    setAccountType('');
    setAccountNumber('');
    setSalesName('');
    setSalesMobile('');
    setSalesEmail('');
    setCommercialName('');
    setCommercialMobile('');
    setCommercialEmail('');
    setMasmeUdyamNo('');
    setPanFile(undefined);
    setAadharFile(undefined);
    setGstFile(undefined);
    setCancelledChequeFile(undefined);
    setUdyamCertificateFile(undefined);
    setSelectedTags([]);
  };

  const addVendor = () => {
    if (!name.trim()) return toast.error('Vendor name is required');
    const next: Vendor = {
      id: genId(),
      name: name.trim(),
      type: vType,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      gst: gst.trim() || undefined,
      pan: pan.trim() || undefined,
      aadhar: aadhar.trim() || undefined,
      // combine address pieces for storage
      address: [addressPlot, addressPremises, addressRoad, addressLocality, addressDistrict, addressState, addressPin].filter(Boolean).join(', ') || address.trim() || undefined,
      placeOfSupplyAddress: [supplyPlot, supplyPremises, supplyRoad, supplyLocality, supplyDistrict, supplyState, supplyPin].filter(Boolean).join(', ') || undefined,
      contactNumber: contactNumber.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      supplyContactNumber: supplyContactNumber.trim() || undefined,
      supplyContactEmail: supplyContactEmail.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankBranch: bankBranch.trim() || undefined,
      ifsCode: ifsCode.trim() || undefined,
      accountType: accountType.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      salesContactName: salesName.trim() || undefined,
      salesContactMobile: salesMobile.trim() || undefined,
      salesContactEmail: salesEmail.trim() || undefined,
      commercialContactName: commercialName.trim() || undefined,
      commercialContactMobile: commercialMobile.trim() || undefined,
      commercialContactEmail: commercialEmail.trim() || undefined,
      masmeUdyamNo: masmeUdyamNo.trim() || undefined,
      panFile: panFile,
      aadharFile: aadharFile,
      gstFile: gstFile,
      cancelledChequeFile: cancelledChequeFile,
      udyamCertificateFile: udyamCertificateFile,
      tags: selectedTags.length ? selectedTags : undefined,
    };
    if (editingId) {
      setVendors((p) => p.map((x) => x.id === editingId ? { ...x, ...next, id: editingId } : x));
      toast.success('Vendor updated');
      setEditingId(null);
    } else {
      setVendors((p) => [next, ...p]);
      toast.success('Vendor added');
    }
    setOpen(false);
    resetForm();
  };

  const openEdit = (v: Vendor) => {
    setEditingId(v.id);
    // populate form fields from vendor
    setName(v.name || '');
    setVType(v.type || 'Other');
    setPhone(v.phone || '');
    setEmail(v.email || '');
    setGst(v.gst || '');
    setPan(v.pan || '');
    setAadhar(v.aadhar || '');
    setAddress(v.address || '');
    // try to split address into first piece for plot if possible
    if (v.address) {
      const parts = String(v.address).split(',');
      setAddressPlot(parts[0] || '');
    }
    setContactNumber(v.contactNumber || '');
    setContactEmail(v.contactEmail || '');
    setSupplyPlot(v.placeOfSupplyAddress || '');
    setSupplyContactNumber(v.supplyContactNumber || '');
    setSupplyContactEmail(v.supplyContactEmail || '');
    setBankName(v.bankName || '');
    setBankBranch(v.bankBranch || '');
    setIfsCode(v.ifsCode || '');
    setAccountType(v.accountType || '');
    setAccountNumber(v.accountNumber || '');
    setSalesName(v.salesContactName || '');
    setSalesMobile(v.salesContactMobile || '');
    setSalesEmail(v.salesContactEmail || '');
    setCommercialName(v.commercialContactName || '');
    setCommercialMobile(v.commercialContactMobile || '');
    setCommercialEmail(v.commercialContactEmail || '');
    setMasmeUdyamNo(v.masmeUdyamNo || '');
    setPanFile(v.panFile || undefined);
    setAadharFile(v.aadharFile || undefined);
    setGstFile(v.gstFile || undefined);
    setCancelledChequeFile(v.cancelledChequeFile || undefined);
    setUdyamCertificateFile(v.udyamCertificateFile || undefined);
    setSelectedTags(v.tags || []);
    setStep(1);
    setOpen(true);
  };

  const openDetails = (v: Vendor) => {
    setDetailsVendor(v);
    setDetailsOpen(true);
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

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="hidden md:flex items-center px-4 py-2 text-xs text-gray-500 border-b">
          <div className="w-1/3">Vendor</div>
          <div className="w-1/6">GST</div>
          <div className="w-1/6">Contact</div>
          <div className="w-1/6">Orders</div>
          <div className="w-1/6 text-right">Actions</div>
        </div>

        {filtered.map((v) => (
          <div key={v.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{v.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{v.type}</p>
            </div>

            <div className="w-36 text-sm text-gray-700">{v.gst || '-'}</div>
            <div className="w-36 text-sm text-gray-700">{v.contactNumber || v.phone || '-'}</div>

            <div className="w-24 text-center text-gray-600">
              <button title="Past orders" className="text-gray-500 hover:text-gray-800">
                <Package className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button title="More details" onClick={() => openDetails(v)} className="text-gray-500 hover:text-gray-800">
                <Info className="w-4 h-4" />
              </button>
              <button title="Edit" onClick={() => openEdit(v)} className="text-gray-500 hover:text-blue-600">
                <Edit2 className="w-4 h-4" />
              </button>
              <button title="Delete" type="button" onClick={() => removeVendor(v.id)} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-10">No vendors found.</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Vendor</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded ${step===1 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>1</div>
                <div className={`px-3 py-1 rounded ${step===2 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>2</div>
                <div className={`px-3 py-1 rounded ${step===3 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>3</div>
                <div className={`px-3 py-1 rounded ${step===4 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>4</div>
              </div>

              {step === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Nature of Vendor</label>
                    <Input value={nature} onChange={(e) => setNature(e.target.value)} placeholder="e.g. Supplier / Service Provider" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Vendor Name *</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vishwakarma" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Income Tax PAN</label>
                      <Input value={pan} onChange={(e) => setPan(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">GST Number</label>
                      <Input value={gst} onChange={(e) => setGst(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Aadhar Card Number</label>
                    <Input value={aadhar} onChange={(e) => setAadhar(e.target.value)} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Address (Primary)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={addressPlot} onChange={(e) => setAddressPlot(e.target.value)} placeholder="Plot/Flat/Unit No. & Floor" />
                      <Input value={addressPremises} onChange={(e) => setAddressPremises(e.target.value)} placeholder="Name of the Premises" />
                      <Input value={addressRoad} onChange={(e) => setAddressRoad(e.target.value)} placeholder="Road" />
                      <Input value={addressLocality} onChange={(e) => setAddressLocality(e.target.value)} placeholder="Taluka / Locality" />
                      <Input value={addressDistrict} onChange={(e) => setAddressDistrict(e.target.value)} placeholder="District" />
                      <Input value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="State" />
                      <Input value={addressPin} onChange={(e) => setAddressPin(e.target.value)} placeholder="Pin Code" />
                      <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Contact Number" />
                      <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="e-mail ID" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Address for Place of Supply of Goods & Services</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={supplyPlot} onChange={(e) => setSupplyPlot(e.target.value)} placeholder="Plot/Flat/Unit No. & Floor" />
                      <Input value={supplyPremises} onChange={(e) => setSupplyPremises(e.target.value)} placeholder="Name of the Premises" />
                      <Input value={supplyRoad} onChange={(e) => setSupplyRoad(e.target.value)} placeholder="Road" />
                      <Input value={supplyLocality} onChange={(e) => setSupplyLocality(e.target.value)} placeholder="Taluka / Locality" />
                      <Input value={supplyDistrict} onChange={(e) => setSupplyDistrict(e.target.value)} placeholder="District" />
                      <Input value={supplyState} onChange={(e) => setSupplyState(e.target.value)} placeholder="State" />
                      <Input value={supplyPin} onChange={(e) => setSupplyPin(e.target.value)} placeholder="Pin Code" />
                      <Input value={supplyContactNumber} onChange={(e) => setSupplyContactNumber(e.target.value)} placeholder="Contact Number" />
                      <Input value={supplyContactEmail} onChange={(e) => setSupplyContactEmail(e.target.value)} placeholder="e-mail ID" />
                      <Input value={supplyGst} onChange={(e) => setSupplyGst(e.target.value)} placeholder="GST Number" />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Bankers Details (RTGS)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Name of the Bank" />
                      <Input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} placeholder="Branch Address (With PIN Code)" />
                      <Input value={ifsCode} onChange={(e) => setIfsCode(e.target.value)} placeholder="IFS Code" />
                      <Input value={accountType} onChange={(e) => setAccountType(e.target.value)} placeholder="Account Type" />
                      <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account Number" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Details of the Sales/Service/Contract Authorised Person</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={salesName} onChange={(e) => setSalesName(e.target.value)} placeholder="Name" />
                      <Input value={salesMobile} onChange={(e) => setSalesMobile(e.target.value)} placeholder="Mobile Number" />
                      <Input value={salesEmail} onChange={(e) => setSalesEmail(e.target.value)} placeholder="e-mail ID" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Details of the Commercial Authorised Person</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={commercialName} onChange={(e) => setCommercialName(e.target.value)} placeholder="Name" />
                      <Input value={commercialMobile} onChange={(e) => setCommercialMobile(e.target.value)} placeholder="Mobile Number" />
                      <Input value={commercialEmail} onChange={(e) => setCommercialEmail(e.target.value)} placeholder="e-mail ID" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">MASME - Udyam No.</label>
                    <Input value={masmeUdyamNo} onChange={(e) => setMasmeUdyamNo(e.target.value)} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">PAN Card</label>
                    <input type="file" onChange={(e) => setPanFile(e.target.files?.[0]?.name)} className="w-full" />
                    {panFile && <div className="text-xs text-gray-500 mt-1">{panFile}</div>}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Aadhar Card</label>
                    <input type="file" onChange={(e) => setAadharFile(e.target.files?.[0]?.name)} className="w-full" />
                    {aadharFile && <div className="text-xs text-gray-500 mt-1">{aadharFile}</div>}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">GST Registration Certificate</label>
                    <input type="file" onChange={(e) => setGstFile(e.target.files?.[0]?.name)} className="w-full" />
                    {gstFile && <div className="text-xs text-gray-500 mt-1">{gstFile}</div>}
                  </div>
 
                  <div>
                    <label className="text-xs font-medium text-gray-500">Cancelled Cheque / Passbook Front Page</label>
                    <input type="file" onChange={(e) => setCancelledChequeFile(e.target.files?.[0]?.name)} className="w-full" />
                    {cancelledChequeFile && <div className="text-xs text-gray-500 mt-1">{cancelledChequeFile}</div>}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Udyam Akansha / MSME Certificate</label>
                    <input type="file" onChange={(e) => setUdyamCertificateFile(e.target.files?.[0]?.name)} className="w-full" />
                    {udyamCertificateFile && <div className="text-xs text-gray-500 mt-1">{udyamCertificateFile}</div>}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Add Tags</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availableTags.map((t) => {
                        const selected = selectedTags.includes(t);
                        return (
                          <button key={t} type="button" onClick={() => {
                            setSelectedTags((s) => selected ? s.filter(x => x !== t) : [...s, t]);
                          }} className={`px-3 py-1 rounded text-sm ${selected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              <div className="flex items-center gap-2">
                {step > 1 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>}
                {step < 4 && <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setStep((s) => Math.min(4, s + 1))}>Next</Button>}
                {step === 4 && <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={addVendor}>{editingId ? 'Update' : 'Save'}</Button>}
              </div>
            </DialogFooter>
          </DialogContent>
      </Dialog>

        <Dialog open={detailsOpen} onOpenChange={(v) => setDetailsOpen(v)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Vendor Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm text-gray-700">
              {detailsVendor ? (
                <>
                  <div><strong>Name:</strong> {detailsVendor.name}</div>
                  <div><strong>Type:</strong> {detailsVendor.type}</div>
                  <div><strong>GST:</strong> {detailsVendor.gst || '-'}</div>
                  <div><strong>Contact:</strong> {detailsVendor.contactNumber || detailsVendor.phone || '-'}</div>
                  <div><strong>Address:</strong> {detailsVendor.address || '-'}</div>
                  <div><strong>Bank:</strong> {detailsVendor.bankName || '-'}</div>
                  <div><strong>Sales contact:</strong> {detailsVendor.salesContactName ? `${detailsVendor.salesContactName} (${detailsVendor.salesContactMobile || ''})` : '-'}</div>
                  <div><strong>Tags:</strong> {(detailsVendor.tags || []).join(', ') || '-'}</div>
                </>
              ) : (
                <div>No details</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default VendorDirectory;
