import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Building2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { getBaseUrl } from '@/lib/config';
import { toast } from 'sonner';

type VendorType = 'Machinery' | 'Seeds' | 'Fertilizer' | 'Chemicals' | 'Services' | 'Transport' | 'Other';

type Vendor = {
  id: string;
  name: string;
  type: VendorType;
  // primary contact
  phone?: string;
  contactEmail?: string;
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

const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getApiBaseUrl = () => String(getBaseUrl() ?? '').replace(/\/$/, '');

const VENDOR_TYPES: VendorType[] = ['Machinery', 'Seeds', 'Fertilizer', 'Chemicals', 'Services', 'Transport', 'Other'];

const asVendorType = (value: unknown): VendorType => {
  const s = String(value ?? '').trim();
  return (VENDOR_TYPES as readonly string[]).includes(s) ? (s as VendorType) : 'Other';
};

const str = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
};

const formatAddress = (addr: any): string | undefined => {
  if (!addr || typeof addr !== 'object') return undefined;
  const parts = [
    addr.plot_flat_unit_no_and_floor,
    addr.name_of_premises,
    addr.road,
    addr.taluka_locality,
    addr.district,
    addr.state,
    addr.pin_code,
  ]
    .map((x) => str(x))
    .filter(Boolean) as string[];

  return parts.length ? parts.join(', ') : undefined;
};

const mapVendorRawToVendor = (raw: any): Vendor => {
  const vendorDetails = raw?.vendor_details ?? {};
  const bankDetails = raw?.bank_details ?? {};
  const documentUrl = raw?.document_url ?? {};
  const supply = vendorDetails?.address_for_place_of_supply_of_goods_services ?? {};

  const tags = Array.isArray(raw?.tags) ? raw.tags.map(String) : undefined;

  return {
    id: String(raw?.vendor_id ?? raw?.id ?? genId()),
    name: String(vendorDetails?.vendor_name ?? '').trim(),
    type: asVendorType(vendorDetails?.nature_of_vendor),
    contactNumber: str(vendorDetails?.vendor_contact),
    phone: str(vendorDetails?.vendor_contact),
    contactEmail: str(vendorDetails?.e_mail_id),
    gst: str(vendorDetails?.gst_number),
    pan: str(vendorDetails?.income_tax_pan),
    aadhar: str(vendorDetails?.aadhar_card_number),
    address: str(vendorDetails?.vendor_address) ?? formatAddress(vendorDetails?.address),
    placeOfSupplyAddress: formatAddress(vendorDetails?.address_for_place_of_supply_of_goods_services),
    supplyContactNumber: str(supply?.contact_number),
    supplyContactEmail: str(supply?.e_mail_id),
    bankName: str(bankDetails?.name_of_bank),
    bankBranch: str(bankDetails?.branch_address_with_pin_code),
    ifsCode: str(bankDetails?.ifs_code),
    accountType: str(bankDetails?.account_type),
    accountNumber: str(bankDetails?.account_number),
    salesContactName: str(bankDetails?.sales_service_contract_authorised_person?.name),
    salesContactMobile: str(bankDetails?.sales_service_contract_authorised_person?.mobile_number),
    salesContactEmail: str(bankDetails?.sales_service_contract_authorised_person?.e_mail_id),
    commercialContactName: str(bankDetails?.commercial_authorised_person?.name),
    commercialContactMobile: str(bankDetails?.commercial_authorised_person?.mobile_number),
    commercialContactEmail: str(bankDetails?.commercial_authorised_person?.e_mail_id),
    masmeUdyamNo: str(bankDetails?.masme_udyam_no),
    panFile: str(documentUrl?.pan_card),
    aadharFile: str(documentUrl?.aadhar_card),
    gstFile: str(documentUrl?.gst_registration_certificate),
    cancelledChequeFile: str(documentUrl?.cancelled_cheque_or_passbook_front_page),
    udyamCertificateFile: str(documentUrl?.udyam_akansha_msme_certificate),
    tags,
  };
};

const defaultVendors: Vendor[] = [
  {
    id: 'v1',
    name: 'Vishwakarma Engineering Pvt Ltd',
    type: 'Machinery',
    phone: '080-2345-6789',
    contactNumber: '08023456789',
    contactEmail: 'contact@vishwakarma.example',
    gst: '27ABCDE1234F1Z5',
    address: 'Plot 12, Industrial Estate, Pune, Maharashtra - 411001',
    bankName: 'State Bank of India',
    bankBranch: 'Pune Main Branch, 411001',
    ifsCode: 'SBIN0001234',
    accountType: 'Current',
    accountNumber: '123456789012',
    masmeUdyamNo: 'UDYAM-MH-12-0012345',
    tags: ['machinery', 'services'],
  },
  {
    id: 'v2',
    name: 'GreenSeeds Pvt Ltd',
    type: 'Seeds',
    phone: '091-9988-7766',
    contactNumber: '9199887766',
    contactEmail: 'sales@greenseeds.example',
    gst: '27FGHIJ5678K2Z6',
    address: 'Block B, Agro Park, Nashik, Maharashtra - 422001',
    bankName: 'HDFC Bank',
    bankBranch: 'Nashik City Branch, 422001',
    ifsCode: 'HDFC0000456',
    accountType: 'Current',
    accountNumber: '045612340987',
    masmeUdyamNo: 'UDYAM-MH-15-0098765',
    tags: ['seeds', 'agriculture equipments'],
  },
  {
    id: 'v3',
    name: 'AgriTech Solutions',
    type: 'Services',
    phone: '022-4444-5555',
    contactNumber: '2244445555',
    contactEmail: 'info@agritech.example',
    gst: '27KLMNO9012P3Z7',
    address: '3rd Floor, Tech Park, Mumbai, Maharashtra - 400001',
    bankName: 'ICICI Bank',
    bankBranch: 'Mumbai Fort Branch, 400001',
    ifsCode: 'ICIC0000789',
    accountType: 'Current',
    accountNumber: '078912340056',
    masmeUdyamNo: 'UDYAM-MH-22-0045678',
    tags: ['IOT devices', 'electronics', 'computer'],
  },
  {
    id: 'v4',
    name: 'Fertico Industries',
    type: 'Fertilizer',
    phone: '033-6677-8899',
    contactNumber: '3366778899',
    contactEmail: 'support@fertico.example',
    gst: '19PQRST3456U4Z8',
    address: 'Village Road, Kolkata, West Bengal - 700001',
    bankName: 'Axis Bank',
    bankBranch: 'Kolkata Central Branch, 700001',
    ifsCode: 'UTIB0000123',
    accountType: 'Current',
    accountNumber: '012300987654',
    masmeUdyamNo: 'UDYAM-WB-10-0076543',
    tags: ['fertilizer', 'chemicals'],
  },
  {
    id: 'v5',
    name: 'Rapid Agro Logistics',
    type: 'Transport',
    phone: '044-5566-7788',
    contactNumber: '4455667788',
    contactEmail: 'ops@rapidlogistics.example',
    gst: '33UVWXY6789Z5Z1',
    address: 'Warehouse 7, Outer Ring Road, Chennai, Tamil Nadu - 600001',
    bankName: 'Canara Bank',
    bankBranch: 'Chennai Main Branch, 600001',
    ifsCode: 'CNRB0000567',
    accountType: 'Current',
    accountNumber: '056712349999',
    masmeUdyamNo: 'UDYAM-TN-02-0032109',
    tags: ['transport', 'services'],
  },
];

const fetchVendorsFromApi = async (): Promise<Vendor[]> => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error('API base URL is not set');

  const url = `${baseUrl}/purchase_flow/get_vendors_raw`;

  const doFetch = (method: 'GET' | 'POST') =>
    fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
      },
    });

  let res = await doFetch('GET');
  if (res.status === 405) res = await doFetch('POST');

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }

  const data: any = await res.json().catch(() => null);
  const list = Array.isArray(data?.vendors) ? data.vendors : [];
  const mapped = list.map(mapVendorRawToVendor).filter((v: Vendor) => v.name.trim());
  return mapped;
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const refreshVendors = async () => {
    try {
      const serverVendors = await fetchVendorsFromApi();
      setVendors(serverVendors);
    } catch (e: any) {
      const message = e?.message ? String(e.message) : 'Failed to fetch vendors';
      toast.error(`Failed to load vendors${message ? `: ${message}` : ''}`);
      setVendors((prev) => (prev.length ? prev : defaultVendors));
    }
  };

  useEffect(() => {
    void refreshVendors();
  }, []);

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
        : [v.name, v.phone, v.contactEmail, v.gst, v.address, v.type].some((x) => String(x ?? '').toLowerCase().includes(query));
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

  const addVendor = async () => {
    if (!name.trim()) return toast.error('Vendor name is required');
    const next: Vendor = {
      id: genId(),
      name: name.trim(),
      type: vType,
      phone: phone.trim() || undefined,
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
      const baseUrl = getApiBaseUrl();
      if (!baseUrl) return toast.error('API base URL is not set');

      const payload = {
        vendor_details: {
          nature_of_vendor: nature,
          vendor_name: name,
          income_tax_pan: pan,
          gst_number: gst,
          aadhar_card_number: aadhar,
          vendor_contact: contactNumber || phone,
          e_mail_id: contactEmail,
          address: {
            plot_flat_unit_no_and_floor: addressPlot,
            name_of_premises: addressPremises,
            road: addressRoad,
            taluka_locality: addressLocality,
            district: addressDistrict,
            state: addressState,
            pin_code: addressPin,
          },
          address_for_place_of_supply_of_goods_services: {
            plot_flat_unit_no_and_floor: supplyPlot,
            name_of_premises: supplyPremises,
            road: supplyRoad,
            taluka_locality: supplyLocality,
            district: supplyDistrict,
            state: supplyState,
            pin_code: supplyPin,
            contact_number: supplyContactNumber,
            e_mail_id: supplyContactEmail,
            gst_number: supplyGst,
          },
          vendor_address: next.address ?? '',
        },
        bank_details: {
          name_of_bank: bankName,
          branch_address_with_pin_code: bankBranch,
          ifs_code: ifsCode,
          account_type: accountType,
          account_number: accountNumber,
          sales_service_contract_authorised_person: {
            name: salesName,
            mobile_number: salesMobile,
            e_mail_id: salesEmail,
          },
          commercial_authorised_person: {
            name: commercialName,
            mobile_number: commercialMobile,
            e_mail_id: commercialEmail,
          },
          masme_udyam_no: masmeUdyamNo,
        },
        document_url: {
          pan_card: panFile ?? '',
          aadhar_card: aadharFile ?? '',
          gst_registration_certificate: gstFile ?? '',
          cancelled_cheque_or_passbook_front_page: cancelledChequeFile ?? '',
          udyam_akansha_msme_certificate: udyamCertificateFile ?? '',
        },
        tags: selectedTags,
      };

      setIsSaving(true);
      try {
        const res = await fetch(`${baseUrl}/purchase_flow/add_new_vendor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          toast.error(`Failed to add vendor${errText ? `: ${errText}` : ''}`);
          return;
        }

        const data: any = await res.json().catch(() => null);
        const returnedId = data?.vendor_id ?? data?.id;
        const vendorToAdd = returnedId ? { ...next, id: String(returnedId) } : next;
        setVendors((p) => [vendorToAdd, ...p]);
        toast.success('Vendor added');
        void refreshVendors();
      } catch (e: any) {
        toast.error(`Failed to add vendor${e?.message ? `: ${e.message}` : ''}`);
        return;
      } finally {
        setIsSaving(false);
      }
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
    setEmail(v.contactEmail || '');
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
    setDeleteConfirmId(null);
    toast.success('Vendor removed');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Directory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all your vendors in one place.</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }} className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <Plus className="w-4 h-4" /> New Vendor
        </Button>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9 bg-white h-10" placeholder="Search by name, GST, contact…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 min-w-[160px]"
        >
          <option value="All">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Directory card grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
          <Building2 className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No vendors found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all p-4 flex flex-col items-center text-center cursor-pointer"
              onClick={() => openDetails(v)}
            >
              {/* Hover action icons */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(v); }} className="p-1.5 rounded-md bg-white/90 text-gray-400 hover:text-blue-600 hover:bg-blue-50 shadow-sm transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button title="Delete" type="button" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(v.id); }} className="p-1.5 rounded-md bg-white/90 text-gray-400 hover:text-red-600 hover:bg-red-50 shadow-sm transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xl font-bold mb-3">
                {v.name.charAt(0).toUpperCase()}
              </div>

              {/* Name + type */}
              <p className="font-semibold text-gray-900 truncate w-full">{v.name}</p>
              <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-medium border border-green-200">
                {v.type}
              </span>

              {/* GST */}
              <p className="mt-2.5 text-xs text-gray-400 font-mono truncate w-full">{v.gst || '—'}</p>

              {/* Contact */}
              <div className="mt-2 w-full space-y-0.5 border-t border-gray-50 pt-2.5">
                <p className="text-xs text-gray-600 truncate">{v.contactNumber || v.phone || '—'}</p>
                {v.contactEmail && <p className="text-[11px] text-gray-400 truncate">{v.contactEmail}</p>}
              </div>

              {/* Tags */}
              {(v.tags || []).length > 0 && (
                <div className="mt-2.5 flex flex-wrap justify-center gap-1">
                  {(v.tags || []).slice(0, 2).map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium truncate max-w-[80px]">{t}</span>
                  ))}
                  {(v.tags || []).length > 2 && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px]">+{(v.tags || []).length - 2}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">{filtered.length} vendor{filtered.length !== 1 ? 's' : ''} shown</p>

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
                <div className="max-h-[55vh] overflow-y-auto pr-2 pb-2 space-y-3">
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
                {step === 4 && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={addVendor}
                    disabled={isSaving}
                  >
                    {editingId ? 'Update' : (isSaving ? 'Saving…' : 'Save')}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
      </Dialog>

        <Dialog open={detailsOpen} onOpenChange={(v) => setDetailsOpen(v)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Vendor Details</DialogTitle>
            </DialogHeader>
            {detailsVendor ? (
              <div className="space-y-5 text-sm">
                {/* Identity */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                    {detailsVendor.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{detailsVendor.name}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">{detailsVendor.type}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">GST</p>
                    <p className="font-mono text-gray-800">{detailsVendor.gst || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">PAN</p>
                    <p className="font-mono text-gray-800">{detailsVendor.pan || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">Contact Number</p>
                    <p className="text-gray-800">{detailsVendor.contactNumber || detailsVendor.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">Email</p>
                    <p className="text-gray-800 break-all">{detailsVendor.contactEmail || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">Address</p>
                    <p className="text-gray-800">{detailsVendor.address || '—'}</p>
                  </div>
                  {detailsVendor.placeOfSupplyAddress && (
                    <div className="col-span-2">
                      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">Place of Supply Address</p>
                      <p className="text-gray-800">{detailsVendor.placeOfSupplyAddress}</p>
                    </div>
                  )}
                </div>

                {(detailsVendor.bankName || detailsVendor.accountNumber) && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bank Details</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">Bank</p>
                        <p className="text-gray-800">{detailsVendor.bankName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">Branch</p>
                        <p className="text-gray-800">{detailsVendor.bankBranch || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">IFSC Code</p>
                        <p className="font-mono text-gray-800">{detailsVendor.ifsCode || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">Account No.</p>
                        <p className="font-mono text-gray-800">{detailsVendor.accountNumber || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {(detailsVendor.salesContactName || detailsVendor.commercialContactName) && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contacts</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {detailsVendor.salesContactName && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">Sales Contact</p>
                          <p className="text-gray-800">{detailsVendor.salesContactName}</p>
                          <p className="text-xs text-gray-500">{detailsVendor.salesContactMobile}</p>
                        </div>
                      )}
                      {detailsVendor.commercialContactName && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">Commercial Contact</p>
                          <p className="text-gray-800">{detailsVendor.commercialContactName}</p>
                          <p className="text-xs text-gray-500">{detailsVendor.commercialContactMobile}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(detailsVendor.tags || []).length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(detailsVendor.tags || []).map((t) => (
                        <span key={t} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>No details</div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(v) => { if (!v) setDeleteConfirmId(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Vendor</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{' '}
                <strong>{vendors.find(v => v.id === deleteConfirmId)?.name ?? 'this vendor'}</strong>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteConfirmId && removeVendor(deleteConfirmId)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default VendorDirectory;
