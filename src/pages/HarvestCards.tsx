import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import logo3f from '@/Assets/3f-logo.png';
import { jsPDF } from 'jspdf';
import getBaseUrl from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type HarvestCard = {
  id: string;
  card_id: string;
  card_number: string;
  holder_name: string;
  valid_till: string; // YYYY-MM-DD
  status?: string;
  meta_data?: unknown;
  emergency_contact_designation: string;
  emergency_contact: string;
  emergency_contact_name: string;
  created_at?: string;
};

const HOLDER_NAME = 'Sai Bio Resources Pvt Ltd';

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const generateCardNumber = () => {
  const y = new Date().getFullYear();
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `HC-${y}-${suffix}`;
};

const toDateInputValue = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const buildQrPayload = (
  card: Pick<
    HarvestCard,
    | 'card_id'
    | 'card_number'
    | 'holder_name'
    | 'valid_till'
    | 'emergency_contact_designation'
    | 'emergency_contact'
    | 'emergency_contact_name'
  >,
) => {
  return JSON.stringify({
    card_id: card.card_id,
    card_number: card.card_number,
    name: card.holder_name,
    valid_till: card.valid_till,
    emergency_contact: {
      designation: card.emergency_contact_designation,
      name: card.emergency_contact_name,
      contact: card.emergency_contact,
    },
  });
};

const getQrImageUrl = (payload: string, size = 140) => {
  // Uses a simple public QR image generator endpoint to avoid extra client dependencies.
  // If you later want fully offline QR rendering, we can swap this to a local QR library.
  const encoded = encodeURIComponent(payload);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
};

const parseYmdLocal = (ymd: string) => {
  const match = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(ymd);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
};

const isCardActive = (validTill: string) => {
  const endDate = parseYmdLocal(validTill);
  if (!endDate) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return endDate.getTime() >= today.getTime();
};

const safePrettyJson = (rawJson: string) => {
  try {
    return JSON.stringify(JSON.parse(rawJson), null, 2);
  } catch {
    return rawJson;
  }
};

const blobToDataUrl = (blob: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
};

const fetchImageDataUrl = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const blob = await res.blob();
  return blobToDataUrl(blob);
};

const PX_TO_PT = 0.75; // 96 CSS px ~= 72 pt
const CARD_W_PX = 320;
const CARD_H_PX = 180;

const drawPdfFront = (pdf: jsPDF, args: {
  x: number;
  y: number;
  w: number;
  h: number;
  logoDataUrl: string;
  qrDataUrl: string;
  holderName: string;
  cardNumber: string;
  validTill: string;
}) => {
  const { x, y, w, h, logoDataUrl, qrDataUrl, holderName, cardNumber, validTill } = args;

  pdf.setFillColor(15, 23, 42);
  pdf.setDrawColor(30, 41, 59);
  const radius = Math.max(8, Math.round(16 * PX_TO_PT));
  pdf.roundedRect(x, y, w, h, radius, radius, 'FD');

  const pad = Math.round(16 * PX_TO_PT);
  const headerY = y + pad;

  const logoSize = Math.round(16 * PX_TO_PT);
  pdf.addImage(logoDataUrl, 'PNG', x + pad, headerY, logoSize, logoSize);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Harvest Card', x + pad + logoSize + Math.round(8 * PX_TO_PT), headerY + Math.round(12 * PX_TO_PT));

  const qrSize = Math.round(80 * PX_TO_PT);
  pdf.addImage(qrDataUrl, 'PNG', x + w - pad - qrSize, headerY, qrSize, qrSize);

  const bodyTop = headerY + Math.round(26 * PX_TO_PT);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(203, 213, 225);
  pdf.text("HOLDER'S NAME", x + pad, bodyTop);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(255, 255, 255);
  const nameMaxW = w - pad * 2 - qrSize - Math.round(10 * PX_TO_PT);
  const nameLines = pdf.splitTextToSize(holderName, Math.max(40, nameMaxW));
  pdf.text(nameLines, x + pad, bodyTop + Math.round(12 * PX_TO_PT));

  const footerY = y + h - pad - Math.round(24 * PX_TO_PT);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(203, 213, 225);
  pdf.text('CARD NUMBER', x + pad, footerY);
  const rightColW = Math.round(90 * PX_TO_PT);
  pdf.text('VALID TILL', x + w - pad - rightColW, footerY);

  pdf.setFont('courier', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text(String(cardNumber || '—'), x + pad, footerY + Math.round(12 * PX_TO_PT));

  pdf.setFont('helvetica', 'bold');
  pdf.text(String(validTill || '—'), x + w - pad - rightColW, footerY + Math.round(12 * PX_TO_PT));
};

const drawPdfBack = (pdf: jsPDF, args: {
  x: number;
  y: number;
  w: number;
  h: number;
  designation: string;
  name: string;
  contact: string;
}) => {
  const { x, y, w, h, designation, name, contact } = args;

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  const radius = Math.max(8, Math.round(16 * PX_TO_PT));
  pdf.roundedRect(x, y, w, h, radius, radius, 'FD');

  const pad = Math.round(16 * PX_TO_PT);
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Emergency Contact', x + w / 2, y + pad + Math.round(12 * PX_TO_PT), { align: 'center' });

  pdf.setDrawColor(30, 41, 59);
  pdf.setLineWidth(1);
  const lineHalf = Math.round(20 * PX_TO_PT);
  const lineY = y + pad + Math.round(18 * PX_TO_PT);
  pdf.line(x + w / 2 - lineHalf, lineY, x + w / 2 + lineHalf, lineY);

  const rowTop = y + pad + Math.round(34 * PX_TO_PT);
  const rowH = Math.round(22 * PX_TO_PT);
  const labelX = x + pad;
  const valueX = x + w - pad;

  const drawRow = (i: number, label: string, value: string) => {
    const ry = rowTop + i * (rowH + Math.round(10 * PX_TO_PT));
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(241, 245, 249);
    const rowRadius = Math.round(10 * PX_TO_PT);
    pdf.roundedRect(x + pad - Math.round(6 * PX_TO_PT), ry - Math.round(14 * PX_TO_PT), w - (pad - Math.round(6 * PX_TO_PT)) * 2, rowH, rowRadius, rowRadius, 'FD');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text(label, labelX, ry);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(value || '—', valueX, ry, { align: 'right' });
  };

  drawRow(0, 'Designation', designation);
  drawRow(1, 'Name', name);
  drawRow(2, 'Contact', contact);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Keep this card safe and secure', x + w / 2, y + h - Math.round(20 * PX_TO_PT), { align: 'center' });
  pdf.setTextColor(148, 163, 184);
  pdf.text('Property of Sai Bio Resources Pvt Ltd', x + w / 2, y + h - Math.round(10 * PX_TO_PT), { align: 'center' });
};

const HarvestCards = () => {
  const [cards, setCards] = useState<HarvestCard[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [generatingCardNumber, setGeneratingCardNumber] = useState(false);
  const [creatingCard, setCreatingCard] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState(generateCardNumber());
  const [validTill, setValidTill] = useState(() => toDateInputValue(new Date(new Date().setFullYear(new Date().getFullYear() + 1))));
  const [emergencyContactDesignation, setEmergencyContactDesignation] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');

  const fetchAllCards = async () => {
    try {
      setLoadingCards(true);
      setCardsError(null);

      const base = getBaseUrl().replace(/\/$/, '');
      const url = `${base}/Harvest_management/get_all_cards`;

      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`Failed to fetch cards: ${res.status}`);

      const json: any = await res.json().catch(() => null);
      const list = Array.isArray(json?.cards) ? json.cards : [];

      const mapped: HarvestCard[] = list
        .map((c: any) => {
          const cardId = typeof c?.card_id === 'string' ? c.card_id.trim() : '';
          const cardNumber = typeof c?.card_number === 'string' ? c.card_number.trim() : '';
          const holderName = typeof c?.holder_name === 'string' ? c.holder_name : HOLDER_NAME;
          const validTill = typeof c?.valid_till === 'string' ? c.valid_till : '';
          const emergencyContactDesignation = typeof c?.emergency_contact_designation === 'string' ? c.emergency_contact_designation : '';
          const emergencyContactName = typeof c?.emergency_contact_name === 'string' ? c.emergency_contact_name : '';
          const emergencyContact = typeof c?.emergency_contact === 'string' ? c.emergency_contact : '';
          const status = typeof c?.status === 'string' ? c.status : undefined;

          if (!cardId || !cardNumber) return null;

          const next: HarvestCard = {
            id: cardId,
            card_id: cardId,
            card_number: cardNumber,
            holder_name: holderName,
            valid_till: validTill,
            status,
            meta_data: c?.meta_data,
            emergency_contact_designation: emergencyContactDesignation,
            emergency_contact: emergencyContact,
            emergency_contact_name: emergencyContactName,
          };
          return next;
        })
        .filter(Boolean) as HarvestCard[];

      setCards(mapped);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch cards';
      setCardsError(message);
    } finally {
      setLoadingCards(false);
    }
  };

  const generateCardNumberFromApi = async () => {
    try {
      setGeneratingCardNumber(true);
      const base = getBaseUrl().replace(/\/$/, '');
      const url = `${base}/Harvest_management/generate_harvest_card_number`;

      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`Failed to generate card number: ${res.status}`);

      const contentType = res.headers.get('content-type') || '';
      const extractFromJson = (obj: any): string | null => {
        if (!obj) return null;
        if (typeof obj === 'string') return obj;
        const candidates = [
          obj.harvest_card_number,
          obj.harvestCardNumber,
          obj.card_number,
          obj.cardNumber,
          obj.number,
          obj.data,
          obj.result,
          obj.message,
        ];
        for (const c of candidates) {
          if (typeof c === 'string' && c.trim()) return c.trim();
        }
        return null;
      };

      let nextNumber: string | null = null;
      if (contentType.includes('application/json')) {
        const json = await res.json().catch(() => null);
        nextNumber = extractFromJson(json);
      } else {
        const text = (await res.text()).trim();
        nextNumber = text || null;
      }

      if (!nextNumber) {
        throw new Error('API did not return a valid card number');
      }

      setCardNumber(nextNumber);
      toast.success('Card number generated');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to generate card number';
      toast.error(message);
    } finally {
      setGeneratingCardNumber(false);
    }
  };

  useEffect(() => {
    fetchAllCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewPayload = useMemo(() => {
    return buildQrPayload({
      card_id: '—',
      card_number: cardNumber || '—',
      holder_name: HOLDER_NAME,
      valid_till: validTill || '—',
      emergency_contact_designation: emergencyContactDesignation || '—',
      emergency_contact: emergencyContact || '—',
      emergency_contact_name: emergencyContactName || '—',
    });
  }, [cardNumber, validTill, emergencyContactDesignation, emergencyContact, emergencyContactName]);

  const resetForm = () => {
    setCardNumber(generateCardNumber());
    setValidTill(toDateInputValue(new Date(new Date().setFullYear(new Date().getFullYear() + 1))));
    setEmergencyContactDesignation('');
    setEmergencyContact('');
    setEmergencyContactName('');
  };

  const createCard = async () => {
    if (!cardNumber.trim()) {
      toast.error('Please enter card number');
      return;
    }
    if (!validTill.trim()) {
      toast.error('Please select valid till date');
      return;
    }
    if (!emergencyContactDesignation.trim()) {
      toast.error('Please enter emergency contact designation');
      return;
    }
    if (!emergencyContactName.trim()) {
      toast.error('Please enter emergency contact name');
      return;
    }
    if (!emergencyContact.trim()) {
      toast.error('Please enter emergency contact number');
      return;
    }

    try {
      setCreatingCard(true);

      const base = getBaseUrl().replace(/\/$/, '');
      const url = `${base}/Harvest_management/save_new_card`;

      const body = {
        card_number: cardNumber.trim(),
        holder_name: HOLDER_NAME,
        valid_till: validTill.trim(),
        emergency_contact: emergencyContact.trim(),
        emergency_contact_designation: emergencyContactDesignation.trim(),
        emergency_contact_name: emergencyContactName.trim(),
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Failed to create harvest card: ${res.status}`);
      }

      const json: any = await res.json().catch(() => null);
      const success = json?.success === true || json?.success === 'True' || json?.success === 1;
      const apiCardId = typeof json?.card_id === 'string' ? json.card_id.trim() : '';
      if (!success || !apiCardId) {
        throw new Error('Create API did not return a valid card_id');
      }

      await fetchAllCards();
      setIsCreateOpen(false);
      toast.success('Harvest Card created');
      resetForm();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create harvest card';
      toast.error(message);
    } finally {
      setCreatingCard(false);
    }
  };

  const downloadPdf = async (card: HarvestCard) => {
    try {
      setDownloadingId(card.id);

      const payload = buildQrPayload(card);
      const [logoDataUrl, qrDataUrl] = await Promise.all([
        fetchImageDataUrl(logo3f),
        fetchImageDataUrl(getQrImageUrl(payload, 220)),
      ]);

      const cardW = Math.round(CARD_W_PX * PX_TO_PT);
      const cardH = Math.round(CARD_H_PX * PX_TO_PT);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [cardW, cardH] });

      drawPdfFront(pdf, {
        x: 0,
        y: 0,
        w: cardW,
        h: cardH,
        logoDataUrl,
        qrDataUrl,
        holderName: card.holder_name,
        cardNumber: card.card_number,
        validTill: card.valid_till,
      });

      pdf.addPage([cardW, cardH], 'landscape');
      drawPdfBack(pdf, {
        x: 0,
        y: 0,
        w: cardW,
        h: cardH,
        designation: card.emergency_contact_designation,
        name: card.emergency_contact_name,
        contact: card.emergency_contact,
      });

      const filename = `${card.card_number || 'harvest-card'}.pdf`;
      pdf.save(filename);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to generate PDF';
      toast.error(message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Harvest Cards</h1>
          <p className="text-muted-foreground mt-1">Create Harvest Cards with QR codes</p>
        </div>

        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) {
              setCardNumber((v) => v || generateCardNumber());
              setValidTill((v) => v || toDateInputValue(new Date(new Date().setFullYear(new Date().getFullYear() + 1))));
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Create Harvest Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create Harvest Card</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Card ID (auto-generated)</div>
                  <Input value="Generated after create" readOnly />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">Card Number</div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="HC-2026-123456"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateCardNumberFromApi}
                      disabled={generatingCardNumber}
                    >
                      {generatingCardNumber ? 'Generating…' : 'Generate'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">Holder Name</div>
                  <Input value={HOLDER_NAME} readOnly />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">Valid Till</div>
                  <Input type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">Emergency Contact Designation</div>
                  <Input
                    value={emergencyContactDesignation}
                    onChange={(e) => setEmergencyContactDesignation(e.target.value)}
                    placeholder="e.g. Manager"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">Emergency Contact Name</div>
                  <Input
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="e.g. Harry"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">Emergency Contact</div>
                  <Input
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold">Preview</div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-[11px] text-muted-foreground mb-3 truncate">Card ID: —</div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-3">Front</div>
                      <div className="w-[320px] h-[180px] rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 flex flex-col justify-between overflow-hidden shadow-2xl border border-slate-700/50">
                        <div className="flex items-start justify-between gap-6">
                          <div className="min-w-0 flex-1">
                            <div className="inline-flex items-center gap-2 mb-3">
                              <div className="inline-flex items-center rounded-lg bg-white/90 px-1.5 py-1 shadow-sm">
                                <img src={logo3f} alt="3F Logo" className="h-4 w-auto" />
                              </div>
                              <span className="text-base font-bold tracking-wide text-white/95">Harvest Card</span>
                            </div>
                            <div className="space-y-2">
                              <div className="text-[10px] font-medium text-white/70 uppercase tracking-wider">Holder's Name</div>
                              <div className="text-sm font-semibold leading-snug text-white whitespace-normal break-words">{HOLDER_NAME}</div>
                            </div>
                          </div>
                          <div className="shrink-0 rounded-xl bg-white p-2 shadow-lg">
                            <img
                              src={getQrImageUrl(previewPayload, 100)}
                              alt="Harvest Card QR"
                              className="w-[80px] h-[80px] rounded"
                            />
                          </div>
                        </div>

                        <div className="flex items-end justify-between gap-6">
                          <div className="min-w-0">
                            <div className="text-[10px] font-medium text-white/70 uppercase tracking-wider mb-1">Card Number</div>
                            <div className="font-mono text-sm font-bold text-white truncate">{cardNumber || '—'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-medium text-white/70 uppercase tracking-wider mb-1">Valid Till</div>
                            <div className="text-sm font-bold text-white truncate">{validTill || '—'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-3">Back</div>
                      <div className="w-[320px] h-[180px] rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/80 p-4 flex flex-col justify-between overflow-hidden shadow-lg">
                        <div className="space-y-4">
                          <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">Emergency Contact</h3>
                            <div className="w-10 h-0.5 bg-slate-800 mx-auto mt-2 rounded-full"></div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center py-1 px-3 bg-white/60 rounded-lg">
                              <span className="text-xs font-medium text-gray-600">Designation</span>
                              <span className="text-xs font-bold text-gray-900 truncate">{emergencyContactDesignation || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 px-3 bg-white/60 rounded-lg">
                              <span className="text-xs font-medium text-gray-600">Name</span>
                              <span className="text-xs font-bold text-gray-900 truncate">{emergencyContactName || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 px-3 bg-white/60 rounded-lg">
                              <span className="text-xs font-medium text-gray-600">Contact</span>
                              <span className="text-xs font-bold text-gray-900 truncate">{emergencyContact || '—'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-gray-500 font-medium">Keep this card safe and secure</div>
                          <div className="text-[10px] text-gray-400 mt-1">Property of Sai Bio Resources Pvt Ltd</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  resetForm();
                }}
                disabled={creatingCard}
              >
                Cancel
              </Button>
              <Button onClick={createCard} disabled={creatingCard}>
                {creatingCard ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loadingCards ? (
          <div className="border border-dashed border-muted-foreground/30 rounded-xl p-8 text-sm text-muted-foreground italic">
            Loading Harvest Cards...
          </div>
        ) : cardsError ? (
          <div className="border border-dashed border-muted-foreground/30 rounded-xl p-8 text-sm text-muted-foreground italic">
            {cardsError}
          </div>
        ) : cards.length === 0 ? (
          <div className="border border-dashed border-muted-foreground/30 rounded-xl p-8 text-sm text-muted-foreground italic">
            No Harvest Cards created yet.
          </div>
        ) : (
          cards.map((card) => {
            const payload = buildQrPayload(card);
            const active = (typeof card.status === 'string' ? card.status.toLowerCase() === 'active' : null) ?? isCardActive(card.valid_till);
            return (
              <div key={card.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-[11px] text-muted-foreground truncate">Card ID: {card.card_id}</div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        active
                          ? 'text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800'
                          : 'text-[10px] font-semibold px-2 py-1 rounded-full bg-rose-100 text-rose-800'
                      }
                    >
                      {active ? 'Active' : 'Expired'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadPdf(card)}
                      disabled={downloadingId === card.id}
                    >
                      {downloadingId === card.id ? 'Downloading…' : 'Download PDF'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-3">Front</div>
                    <div className="w-[320px] h-[180px] rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 flex flex-col justify-between overflow-hidden shadow-2xl border border-slate-700/50">
                      <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0 flex-1">
                          <div className="inline-flex items-center gap-2 mb-3">
                            <div className="inline-flex items-center rounded-lg bg-white/90 px-1.5 py-1 shadow-sm">
                              <img src={logo3f} alt="3F Logo" className="h-4 w-auto" />
                            </div>
                            <span className="text-base font-bold tracking-wide text-white/95">Harvest Card</span>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[10px] font-medium text-white/70 uppercase tracking-wider">Holder's Name</div>
                            <div className="text-sm font-semibold leading-snug text-white whitespace-normal break-words">{card.holder_name}</div>
                          </div>
                        </div>
                        <div className="shrink-0 rounded-xl bg-white p-2 shadow-lg">
                          <img
                            src={getQrImageUrl(payload, 100)}
                            alt="Harvest Card QR"
                            className="w-[80px] h-[80px] rounded"
                          />
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-6">
                        <div className="min-w-0">
                          <div className="text-[10px] font-medium text-white/70 uppercase tracking-wider mb-1">Card Number</div>
                          <div className="font-mono text-sm font-bold text-white truncate">{card.card_number}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-medium text-white/70 uppercase tracking-wider mb-1">Valid Till</div>
                          <div className="text-sm font-bold text-white truncate">{card.valid_till || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-3">Back</div>
                    <div className="w-[320px] h-[180px] rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/80 p-4 flex flex-col justify-between overflow-hidden shadow-lg">
                      <div className="space-y-4">
                        <div className="text-center">
                          <h3 className="text-base font-bold text-gray-900">Emergency Contact</h3>
                          <div className="w-10 h-0.5 bg-slate-800 mx-auto mt-2 rounded-full"></div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-1 px-3 bg-white/60 rounded-lg">
                            <span className="text-xs font-medium text-gray-600">Designation</span>
                            <span className="text-xs font-bold text-gray-900 truncate">{card.emergency_contact_designation || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 px-3 bg-white/60 rounded-lg">
                            <span className="text-xs font-medium text-gray-600">Name</span>
                            <span className="text-xs font-bold text-gray-900 truncate">{card.emergency_contact_name || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 px-3 bg-white/60 rounded-lg">
                            <span className="text-xs font-medium text-gray-600">Contact</span>
                            <span className="text-xs font-bold text-gray-900 truncate">{card.emergency_contact || '—'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-gray-500 font-medium">Keep this card safe and secure</div>
                        <div className="text-[10px] text-gray-400 mt-1">Property of Sai Bio Resources Pvt Ltd</div>
                      </div>
                    </div>
                  </div>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">QR Data</summary>
                  <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-border bg-muted p-3 text-[11px] text-foreground whitespace-pre-wrap break-words">
                    {safePrettyJson(payload)}
                  </pre>
                </details>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HarvestCards;
