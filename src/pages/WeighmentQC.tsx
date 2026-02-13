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

export default function WeighmentQCPage() {
  const [scanOpen, setScanOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('');
  const [scanBusy, setScanBusy] = useState(false);
  const [saving, setSaving] = useState(false);

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
      <div className="max-w-xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Weighment & QC</h1>
          <p className="text-sm text-muted-foreground">Scan Harvest Card QR code to enter weighment and QC data.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <Button onClick={() => setScanOpen(true)} className="w-full">
            Scan QR Code
          </Button>
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