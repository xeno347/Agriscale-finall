export type GrnIncomingOrderItem = {
  id: string;
  itemCode?: string;
  description: string;
  uom: string;
  unitPrice: number;
  billedQty: number;
  receivedQty: number;
  rejectedQty: number;
  shortQty: number;
  gstPercent: number;
  freight?: number;
  pf?: number;
  location?: string;
};

export type GrnIncomingOrder = {
  id: string;
  poNo: string;
  poDate?: string; // yyyy-mm-dd
  prNo?: string;
  prDate?: string;
  prBy?: string;

  vendorName: string;
  vendorAddress?: string;

  department?: string;
  group?: string;

  grnNoHint?: string; // optional external reference

  challanNo?: string;
  challanDate?: string;
  invNo?: string;
  invDate?: string;
  lrNo?: string;
  lrDate?: string;
  geNo?: string;
  geDate?: string;

  createdAt: string;
  status: 'Incoming' | 'GRN Created';
  items: GrnIncomingOrderItem[];
};

export type GRNRecord = {
  grnId: string; // Unique ID (sticker/tag)
  grnNo: string;
  grnDate: string;

  orderId: string;

  vendorName: string;
  vendorAddress?: string;

  poNo: string;
  poDate?: string;

  prNo?: string;
  prDate?: string;
  prBy?: string;

  invNo?: string;
  invDate?: string;
  challanNo?: string;
  challanDate?: string;
  lrNo?: string;
  lrDate?: string;
  geNo?: string;
  geDate?: string;

  department?: string;
  group?: string;

  items: Array<{
    itemId: string;
    itemCode?: string;
    description: string;
    uom: string;

    billedQty: number;
    receivedQty: number;
    rejectedQty: number;
    shortQty: number;

    unitPrice: number;
    basicValue: number;
    discPercent: number;
    freight: number;
    gstPercent: number;
    gstAmount: number;
    valueWithTax: number;
    pf: number;
    totalGrnValue: number;

    location?: string;
  }>;

  remarks?: string;
  createdAt: string;
};

const STORE_KEY = 'farmconnect.grn.v1';

type Store = {
  incoming: Record<string, GrnIncomingOrder>;
  grns: Record<string, GRNRecord>;
  counter: {
    fiscal: string;
    seq: number;
  };
};

const pad3 = (n: number) => String(n).padStart(3, '0');

const fiscalYear = (d = new Date()) => {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const startYear = m >= 4 ? y : y - 1;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
};

export const formatYmd = (isoOrDate: string | Date) => {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const readStore = (): Store => {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) throw new Error('empty');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('bad');

    return {
      incoming: parsed.incoming || {},
      grns: parsed.grns || {},
      counter: parsed.counter || { fiscal: fiscalYear(), seq: 0 },
    };
  } catch {
    return {
      incoming: seedIncoming(),
      grns: {},
      counter: { fiscal: fiscalYear(), seq: 0 },
    };
  }
};

const writeStore = (s: Store) => {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
};

export const getIncomingOrders = () => {
  const s = readStore();
  return Object.values(s.incoming).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getGrnByOrderId = (orderId: string) => {
  const s = readStore();
  return Object.values(s.grns).find((g) => g.orderId === orderId) || null;
};

export const updateIncomingItem = (
  orderId: string,
  itemId: string,
  patch: Partial<Pick<GrnIncomingOrderItem, 'receivedQty' | 'rejectedQty' | 'unitPrice' | 'gstPercent' | 'freight' | 'pf' | 'location'>>,
) => {
  const s = readStore();
  const order = s.incoming[orderId];
  if (!order) return;

  const items = order.items.map((it) => {
    if (it.id !== itemId) return it;

    const receivedQty = patch.receivedQty ?? it.receivedQty;
    const rejectedQty = patch.rejectedQty ?? it.rejectedQty;
    const billedQty = it.billedQty;
    const shortQty = Math.max(0, (billedQty || 0) - (receivedQty || 0) - (rejectedQty || 0));

    return {
      ...it,
      ...patch,
      receivedQty,
      rejectedQty,
      shortQty,
    };
  });

  s.incoming[orderId] = { ...order, items };
  writeStore(s);
};

export const createGrnForOrder = (orderId: string) => {
  const s = readStore();
  const order = s.incoming[orderId];
  if (!order) throw new Error('Order not found');

  const existing = Object.values(s.grns).find((g) => g.orderId === orderId);
  if (existing) return existing;

  const today = new Date();
  const fy = fiscalYear(today);
  const nextSeq = s.counter.fiscal === fy ? (s.counter.seq || 0) + 1 : 1;
  s.counter = { fiscal: fy, seq: nextSeq };

  const grnNo = `GRN/${fy}/${pad3(nextSeq)}`;
  const grnId = `GRNID-${fy.replace('-', '')}-${pad3(nextSeq)}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
  const grnDate = formatYmd(today);

  const items = order.items.map((it) => {
    const basicValue = (it.unitPrice || 0) * (it.receivedQty || 0);
    const discPercent = 0;
    const freight = Number(it.freight || 0) || 0;
    const gstPercent = Number(it.gstPercent || 0) || 0;
    const gstAmount = (basicValue + freight) * (gstPercent / 100);
    const valueWithTax = basicValue + freight + gstAmount;
    const pf = Number(it.pf || 0) || 0;
    const totalGrnValue = valueWithTax + pf;

    return {
      itemId: it.id,
      itemCode: it.itemCode,
      description: it.description,
      uom: it.uom,
      billedQty: it.billedQty || 0,
      receivedQty: it.receivedQty || 0,
      rejectedQty: it.rejectedQty || 0,
      shortQty: Math.max(0, (it.billedQty || 0) - (it.receivedQty || 0) - (it.rejectedQty || 0)),
      unitPrice: it.unitPrice || 0,
      basicValue,
      discPercent,
      freight,
      gstPercent,
      gstAmount,
      valueWithTax,
      pf,
      totalGrnValue,
      location: it.location,
    };
  });

  const grn: GRNRecord = {
    grnId,
    grnNo,
    grnDate,
    orderId,

    vendorName: order.vendorName,
    vendorAddress: order.vendorAddress,

    poNo: order.poNo,
    poDate: order.poDate,

    prNo: order.prNo,
    prDate: order.prDate,
    prBy: order.prBy,

    invNo: order.invNo,
    invDate: order.invDate,
    challanNo: order.challanNo,
    challanDate: order.challanDate,
    lrNo: order.lrNo,
    lrDate: order.lrDate,
    geNo: order.geNo,
    geDate: order.geDate,

    department: order.department,
    group: order.group,

    items,
    remarks: '',
    createdAt: new Date().toISOString(),
  };

  s.grns[grn.grnNo] = grn;
  s.incoming[orderId] = { ...order, status: 'GRN Created' };
  writeStore(s);
  return grn;
};

const seedIncoming = (): Record<string, GrnIncomingOrder> => {
  const now = new Date();
  const baseId = `in-${now.getTime()}`;

  const o1: GrnIncomingOrder = {
    id: `${baseId}-1`,
    poNo: 'SBRPL/PO/BIO-CG/25-26/001',
    poDate: '2025-12-22',
    prNo: '-',
    prDate: '-',
    prBy: '-',

    vendorName: 'MAHAKAL PORTABLE CABIN & FABRICATION',
    vendorAddress: 'Nagar Palika Amleshwar\nCity - Patan\nDist - Durg (CG) 491111',

    department: 'ADMIN',
    group: 'CAPITAL ITEMS',

    invNo: 'INV9',
    invDate: '2026-01-11',
    challanNo: 'INV9',
    challanDate: '2026-01-11',
    lrNo: '-',
    lrDate: '-',
    geNo: '1',
    geDate: '2026-01-11',

    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString(),
    status: 'Incoming',
    items: [
      {
        id: 'GE-01-1',
        itemCode: 'GE-01',
        description: 'Portable Office Cabin Size 20x10x9.2 FT',
        uom: 'Nos',
        unitPrice: 222000,
        billedQty: 1,
        receivedQty: 1,
        rejectedQty: 0,
        shortQty: 0,
        gstPercent: 18,
        freight: 0,
        pf: 0,
        location: 'SBR - Site',
      },
      {
        id: 'GE-01-2',
        itemCode: 'GE-01',
        description: 'A/C Voltage (3 Star) 1.5 Ton',
        uom: 'Nos',
        unitPrice: 35000,
        billedQty: 1,
        receivedQty: 1,
        rejectedQty: 0,
        shortQty: 0,
        gstPercent: 18,
        freight: 0,
        pf: 0,
        location: 'SBR - Site',
      },
      {
        id: 'GE-01-3',
        itemCode: 'GE-01',
        description: 'Workstation Size 3"x2" FT',
        uom: 'Nos',
        unitPrice: 3000,
        billedQty: 5,
        receivedQty: 5,
        rejectedQty: 0,
        shortQty: 0,
        gstPercent: 18,
        freight: 0,
        pf: 0,
        location: 'SBR - Site',
      },
    ],
  };

  return { [o1.id]: o1 };
};
