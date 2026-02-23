import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrowserQRCodeReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import getBaseUrl from '@/lib/config';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type HarvestCardQrPayload = {
  card_id?: string;
  card_number?: string;
  name?: string;
  valid_till?: string;
  emergency_contact?: {
    designation?: string;
    name?: string;
    contact?: string;
  };
};

type DriverDetails = {
  driver_name?: string;
  driver_contact?: string;
  vehicle_number?: string;
};

type WeighmentDetailsResponse = {
  weighment_details?: Array<{
    order_id?: string;
    feild_id?: string;
    trip_sheet?: Array<{
      weighment?: {
        gross_weight?: number;
        tare_weight?: number;
        net_weight?: number;
      };
      quality_check?: {
        moisture_percentage?: number;
        foreign_material_percentage?: number;
        chopping_size?: number;
      };
    }>;
  }>;
};

type TripWeighmentRow = {
  row_id: string;
  farm_id: string;
  order_id: string;
  weighment: {
    gross_weight: number;
    tare_weight: number;
    net_weight: number;
  };
  quality_check: {
    moisture_percentage: number;
    foreign_material_percentage: number;
    chopping_size: number;
  };
};

export default function WeighmentQCPage() {
  const [scanOpen, setScanOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('');
  const [scanBusy, setScanBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const [weighmentRows, setWeighmentRows] = useState<TripWeighmentRow[]>([]);
  const [weighmentLoading, setWeighmentLoading] = useState(false);
  const [weighmentError, setWeighmentError] = useState<string | null>(null);
  const weighmentAbortRef = useRef<AbortController | null>(null);

  const [scannedPayload, setScannedPayload] = useState<HarvestCardQrPayload | null>(null);

  const [driverDetails, setDriverDetails] = useState<DriverDetails | null>(null);
  const [driverLoading, setDriverLoading] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);
  const driverAbortRef = useRef<AbortController | null>(null);

  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const netWeight = useMemo(() => {
    const g = Number(grossWeight);
    const t = Number(tareWeight);
    if (!Number.isFinite(g) || !Number.isFinite(t)) return '';
    return String(Math.max(0, g - t));
  }, [grossWeight, tareWeight]);

  const [moisturePercentage, setMoisturePercentage] = useState('');
  const [foreignMaterialPercentage, setForeignMaterialPercentage] = useState('');
  const [choppingSize, setChoppingSize] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopScanner = () => {
    readerRef.current = null;
    setScanBusy(false);

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActiveCameraLabel('');
  };

  const downloadTripReceipt = (row: TripWeighmentRow) => {
    const header = 'Sai Bio Resources Private Limited , Weighment Slipt';

    const escapeHtml = (value: string) =>
      value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(header)}</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; color: #111; }
      h1 { font-size: 18px; margin: 0 0 16px; }
      .meta { font-size: 12px; color: #444; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 10px 8px; border: 1px solid #ddd; font-size: 14px; vertical-align: top; }
      th { background: #f5f5f5; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(header)}</h1>
    <div class="meta">Generated on: ${escapeHtml(new Date().toLocaleString())}</div>

    <table>
      <tbody>
        <tr><th>farm_id</th><td>${escapeHtml(row.farm_id)}</td></tr>
        <tr><th>order_id</th><td>${escapeHtml(row.order_id)}</td></tr>
      </tbody>
    </table>

    <h2 style="font-size: 16px; margin: 18px 0 10px;">Weighment</h2>
    <table>
      <thead>
        <tr><th>Gross Weight</th><th>Tare Weight</th><th>Net Weight</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${row.weighment.gross_weight}</td>
          <td>${row.weighment.tare_weight}</td>
          <td>${row.weighment.net_weight}</td>
        </tr>
      </tbody>
    </table>

    <h2 style="font-size: 16px; margin: 18px 0 10px;">QC</h2>
    <table>
      <thead>
        <tr><th>Moisture (%)</th><th>Foreign Material (%)</th><th>Chopping Size</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${row.quality_check.moisture_percentage}</td>
          <td>${row.quality_check.foreign_material_percentage}</td>
          <td>${row.quality_check.chopping_size}</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const safe = (value: string) => value.replaceAll(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
    const fileName = `weighment_receipt_${safe(row.order_id)}_${safe(row.farm_id)}.html`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const fetchWeighmentDetails = async () => {
    weighmentAbortRef.current?.abort();
    const controller = new AbortController();
    weighmentAbortRef.current = controller;

    setWeighmentLoading(true);
    setWeighmentError(null);

    try {
      const base = getBaseUrl().replace(/\/$/, '');
      const url = `${base}/Harvest_management/get_weighment_details`;
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      if (!res.ok) throw new Error(`Failed to fetch weighment details: ${res.status}`);

      const json = (await res.json().catch(() => null)) as WeighmentDetailsResponse | null;
      const details = Array.isArray(json?.weighment_details) ? json!.weighment_details! : [];

      const rows: TripWeighmentRow[] = [];
      for (const detail of details) {
        const farmId = (detail?.feild_id || '').toString().trim();
        const orderId = (detail?.order_id || '').toString().trim();
        const tripSheet = Array.isArray(detail?.trip_sheet) ? detail!.trip_sheet! : [];

        tripSheet.forEach((entry, index) => {
          const weighment = entry?.weighment ?? {};
          const quality = entry?.quality_check ?? {};
          rows.push({
            row_id: `${orderId || 'order'}-${farmId || 'farm'}-${index}`,
            farm_id: farmId || '—',
            order_id: orderId || '—',
            weighment: {
              gross_weight: Number(weighment.gross_weight ?? 0) || 0,
              tare_weight: Number(weighment.tare_weight ?? 0) || 0,
              net_weight: Number(weighment.net_weight ?? 0) || 0,
            },
            quality_check: {
              moisture_percentage: Number(quality.moisture_percentage ?? 0) || 0,
              foreign_material_percentage: Number(quality.foreign_material_percentage ?? 0) || 0,
              chopping_size: Number(quality.chopping_size ?? 0) || 0,
            },
          });
        });
      }

      setWeighmentRows(rows);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      const message = e instanceof Error ? e.message : 'Failed to fetch weighment details';
      setWeighmentError(message);
      setWeighmentRows([]);
    } finally {
      setWeighmentLoading(false);
    }
  };

  useEffect(() => {
    void fetchWeighmentDetails();
    return () => {
      weighmentAbortRef.current?.abort();
      weighmentAbortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDriverDetails = async (cardNumber: string) => {
    const trimmed = cardNumber.trim();
    if (!trimmed) return;

    driverAbortRef.current?.abort();
    const controller = new AbortController();
    driverAbortRef.current = controller;

    setDriverLoading(true);
    setDriverError(null);
    setDriverDetails(null);

    try {
      const base = getBaseUrl().replace(/\/$/, '');
      const url = `${base}/Harvest_management/get_driver_details/${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      if (!res.ok) throw new Error(`Failed to fetch driver details: ${res.status}`);
      const json = (await res.json().catch(() => null)) as DriverDetails | null;
      setDriverDetails(json && typeof json === 'object' ? json : null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      const message = e instanceof Error ? e.message : 'Failed to fetch driver details';
      setDriverError(message);
      setDriverDetails(null);
    } finally {
      setDriverLoading(false);
    }
  };

  const getCameraErrorMessage = (e: unknown) => {
    const maybeDomException = e as { name?: string; message?: string };
    const name = (maybeDomException?.name || '').toString();

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Camera permission denied. Please allow camera access in your browser site settings.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No camera device found.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Camera is already in use by another application (Zoom/Teams/etc). Close it and try again.';
    }
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      return 'The selected camera does not support the required constraints. Try another camera.';
    }
    return e instanceof Error ? e.message : 'Failed to open camera';
  };

  const pickPreferredVideoDeviceId = (devices: MediaDeviceInfo[]) => {
    const videoDevices = devices.filter((d) => d.kind === 'videoinput');
    if (!videoDevices.length) return undefined;

    // Heuristic: prefer non-front/external cameras when multiple exist.
    // Labels are often empty until permission is granted; we still prefer the last deviceId.
    const labeled = videoDevices.filter((d) => (d.label || '').trim().length > 0);
    const haystack = (d: MediaDeviceInfo) => (d.label || '').toLowerCase();
    const preferredFromLabel = labeled.find((d) =>
      ['usb', 'external', 'rear', 'back', 'logitech', 'webcam'].some((k) => haystack(d).includes(k)),
    );

    const preferred = preferredFromLabel ?? videoDevices[videoDevices.length - 1];
    setActiveCameraLabel(preferred.label || '');
    return preferred.deviceId;
  };

  const openEntryForRaw = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    stopScanner();
    try {
      const parsed = JSON.parse(trimmed) as HarvestCardQrPayload;
      const nextPayload = parsed && typeof parsed === 'object' ? parsed : null;
      setScannedPayload(nextPayload);
      const cardNumber = (nextPayload?.card_number || '').trim();
      if (cardNumber) {
        void fetchDriverDetails(cardNumber);
      } else {
        setDriverDetails(null);
        setDriverError(null);
        setDriverLoading(false);
      }
    } catch {
      // If QR is not JSON, assume it could be just the card number.
      setScannedPayload({ card_number: trimmed });
      void fetchDriverDetails(trimmed);
    }
    setScanOpen(false);
    setEntryOpen(true);
  };

  const scanOnce = async () => {
    if (scanBusy) return;
    setScanError(null);

    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) {
      setScanError('Camera not ready. Please wait a moment and try again.');
      return;
    }

    setScanBusy(true);
    try {
      const waitForVideoFrame = async (timeoutMs: number) => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return true;

        return await new Promise<boolean>((resolve) => {
          const timeoutId = window.setTimeout(() => resolve(false), timeoutMs);
          const onCanPlay = () => {
            window.clearTimeout(timeoutId);
            video.removeEventListener('canplay', onCanPlay);
            resolve(true);
          };
          video.addEventListener('canplay', onCanPlay, { once: true });
        });
      };

      const videoReady = await waitForVideoFrame(1500);
      if (!videoReady) {
        setScanError('Camera is not ready yet. Please wait a moment and try again.');
        return;
      }

      const detectWithBarcodeDetector = async (timeoutMs: number) => {
        const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
        if (typeof BarcodeDetectorCtor !== 'function') return null;

        const detector = new (BarcodeDetectorCtor as new (opts: { formats: string[] }) => {
          detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
        })({ formats: ['qr_code'] });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
              const codes = await detector.detect(canvas);
              const raw = codes?.[0]?.rawValue?.trim();
              if (raw) return raw;
            } catch {
              // ignore and keep trying
            }
          }

          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }

        return null;
      };

      const detectWithZXing = async (timeoutMs: number) => {
        const reader = readerRef.current;
        if (!reader) return null;

        return await new Promise<string | null>((resolve) => {
          let done = false;
          let timeoutId: number | null = null;

          const finalize = (value: string | null) => {
            if (done) return;
            done = true;
            if (timeoutId !== null) window.clearTimeout(timeoutId);
            resolve(value);
          };

          reader
            .decodeFromStream(stream, video, (result, _error, controls) => {
              if (done) return;
              if (result) {
                try {
                  controls.stop();
                } catch {
                  // ignore
                }
                finalize(result.getText());
              }
            })
            .then((controls) => {
              timeoutId = window.setTimeout(() => {
                try {
                  controls.stop();
                } catch {
                  // ignore
                }
                finalize(null);
              }, timeoutMs);
            })
            .catch(() => finalize(null));
        });
      };

      const rawFromNative = await detectWithBarcodeDetector(3500);
      if (rawFromNative) {
        openEntryForRaw(rawFromNative);
        return;
      }

      const rawFromZXing = await detectWithZXing(5000);
      if (rawFromZXing && rawFromZXing.trim()) {
        openEntryForRaw(rawFromZXing);
        return;
      }

      setScanError('No QR code detected. Please try again.');
    } catch {
      setScanError('No QR code detected. Please try again.');
    } finally {
      setScanBusy(false);
    }
  };

  useEffect(() => {
    if (!scanOpen) {
      stopScanner();
      return;
    }

    setScanError(null);
    setScanBusy(false);
    let cancelled = false;
    const start = async () => {
      try {
        const host = window.location.hostname;
        const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
        if (!window.isSecureContext && !isLocalhost) {
          throw new Error('Camera requires HTTPS or http://localhost');
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera API not available in this browser');
        }

        // Ensure the dialog has mounted its video element.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (!videoRef.current) return;

        let preferredDeviceId: string | undefined;
        try {
          if (navigator.mediaDevices?.enumerateDevices) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            preferredDeviceId = pickPreferredVideoDeviceId(devices);
          }
        } catch {
          // ignore device enumeration failures; we'll fall back to default camera
        }

        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);

        const tunedReader = new BrowserQRCodeReader(hints, {
          delayBetweenScanAttempts: 100,
          delayBetweenScanSuccess: 750,
          tryPlayVideoTimeout: 10000,
        });
        readerRef.current = tunedReader;

        const makeConstraints = (deviceId?: string): MediaStreamConstraints => {
          const baseVideoConstraints: MediaTrackConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          };
          if (deviceId) {
            return { video: { ...baseVideoConstraints, deviceId: { exact: deviceId } } };
          }
          return { video: { ...baseVideoConstraints, facingMode: 'environment' } };
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(makeConstraints(preferredDeviceId));
        } catch (e) {
          // Retry once with generic constraints.
          setActiveCameraLabel('');
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;

        // Attach stream explicitly so we can use BarcodeDetector (if available).
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // ignore autoplay errors; decode pipeline may still work
          }
        }

        // Prefer native detector when available (more like phone QR scanning).
        // Do not auto-scan; user will click the "Scan" button.
      } catch (e) {
        const message = getCameraErrorMessage(e);
        setScanError(message);
        toast.error(message);
      }
    };

    start();
    return () => {
      cancelled = true;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanOpen]);

  const resetEntry = () => {
    setGrossWeight('');
    setTareWeight('');
    setMoisturePercentage('');
    setForeignMaterialPercentage('');
    setChoppingSize('');

    setSaving(false);

    driverAbortRef.current?.abort();
    driverAbortRef.current = null;
    setDriverDetails(null);
    setDriverError(null);
    setDriverLoading(false);
  };

  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    const cardNumber = (scannedPayload?.card_number || '').toString().trim();
    if (!cardNumber) {
      toast.error('Card number missing in QR data');
      return;
    }

    const toNumberOrZero = (value: string) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    const payload = {
      card_number: cardNumber,
      gross_weight: toNumberOrZero(grossWeight),
      tare_weight: toNumberOrZero(tareWeight),
      net_weight: toNumberOrZero(netWeight),
      moisture_percentage: toNumberOrZero(moisturePercentage),
      foreign_material_percentage: toNumberOrZero(foreignMaterialPercentage),
      chopping_size: toNumberOrZero(choppingSize),
    };
    console.log('Saving payload', payload);

    setSaving(true);
    try {
      const base = getBaseUrl().replace(/\/$/, '');
      const url = `${base}/Harvest_management/save_weighment`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to save weighment: ${res.status}`);
      }

      const json: any = await res.json().catch(() => null);
      const isSuccess = json === true || json?.success === true || json?.Success === true;
      if (!isSuccess) {
        const message = typeof json?.message === 'string' ? json.message : 'Failed to save weighment';
        throw new Error(message);
      }

      toast.success('Data saved successfully');
      setEntryOpen(false);
      resetEntry();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save weighment';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="w-full space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Weighment & QC</h1>
          <p className="text-sm text-muted-foreground">Scan Harvest Card QR code to enter weighment and QC data.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <Button onClick={() => setScanOpen(true)} className="w-full">
            Scan QR Code
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-foreground">Trip Weighment & QC</div>
              <div className="text-xs text-muted-foreground">All weighment and QC entries captured in trips.</div>
            </div>
            <Button type="button" variant="outline" onClick={fetchWeighmentDetails} disabled={weighmentLoading}>
              {weighmentLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>

          {weighmentError ? <div className="text-sm text-destructive">{weighmentError}</div> : null}
          {weighmentLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}

          {!weighmentLoading && !weighmentError && weighmentRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No weighment details found.</div>
          ) : null}

          {weighmentRows.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[240px]">farm_id</TableHead>
                    <TableHead className="min-w-[170px]">order_id</TableHead>
                    <TableHead className="min-w-[280px]">Weighment</TableHead>
                    <TableHead className="min-w-[280px]">QC</TableHead>
                    <TableHead className="w-40">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weighmentRows.map((row) => (
                    <TableRow key={row.row_id}>
                      <TableCell className="font-medium break-words">{row.farm_id}</TableCell>
                      <TableCell className="break-words">{row.order_id}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Gross: {row.weighment.gross_weight}</div>
                          <div>Tare: {row.weighment.tare_weight}</div>
                          <div className="font-medium">Net: {row.weighment.net_weight}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Moisture: {row.quality_check.moisture_percentage}%</div>
                          <div>Foreign: {row.quality_check.foreign_material_percentage}%</div>
                          <div>Chopping: {row.quality_check.chopping_size}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="outline" onClick={() => downloadTripReceipt(row)}>
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog
        open={scanOpen}
        onOpenChange={(open) => {
          setScanOpen(open);
          if (!open) stopScanner();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-border overflow-hidden bg-muted">
              <video ref={videoRef} className="w-full h-[320px] object-cover" autoPlay playsInline muted />
            </div>
            <p className="text-xs text-muted-foreground">Point the camera at the QR code, then click Scan.</p>
            {activeCameraLabel ? (
              <p className="text-xs text-muted-foreground">Using camera: {activeCameraLabel}</p>
            ) : null}
            {scanError ? <p className="text-xs text-destructive">{scanError}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setScanOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={scanOnce} disabled={scanBusy}>
              {scanBusy ? 'Scanning…' : 'Scan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={entryOpen}
        onOpenChange={(open) => {
          setEntryOpen(open);
          if (!open) resetEntry();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enter Weighment & QC Data</DialogTitle>
          </DialogHeader>

          <form onSubmit={saveEntry} className="space-y-6">
            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="text-xs text-muted-foreground">Scanned Card</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Card ID</div>
                  <div className="font-medium text-foreground break-words">{scannedPayload?.card_id || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Card Number</div>
                  <div className="font-medium text-foreground break-words">{scannedPayload?.card_number || '—'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="text-xs text-muted-foreground">Driver Details</div>
              {driverLoading ? <div className="mt-2 text-sm text-muted-foreground">Fetching driver details…</div> : null}
              {driverError ? <div className="mt-2 text-sm text-destructive">{driverError}</div> : null}
              {!driverLoading && !driverError ? (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Driver Name</div>
                    <div className="font-medium text-foreground break-words">{driverDetails?.driver_name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Driver Contact</div>
                    <div className="font-medium text-foreground break-words">{driverDetails?.driver_contact || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Vehicle Number</div>
                    <div className="font-medium text-foreground break-words">{driverDetails?.vehicle_number || '—'}</div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Gross Weight (kg)</Label>
                <Input value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} inputMode="decimal" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Tare Weight (kg)</Label>
                <Input value={tareWeight} onChange={(e) => setTareWeight(e.target.value)} inputMode="decimal" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Net Weight (kg)</Label>
                <Input value={netWeight} readOnly />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Moisture (%)</Label>
                <Input
                  value={moisturePercentage}
                  onChange={(e) => setMoisturePercentage(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Foreign Material (%)</Label>
                <Input
                  value={foreignMaterialPercentage}
                  onChange={(e) => setForeignMaterialPercentage(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Chopping Size</Label>
                <Input value={choppingSize} onChange={(e) => setChoppingSize(e.target.value)} inputMode="decimal" placeholder="0" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEntryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}