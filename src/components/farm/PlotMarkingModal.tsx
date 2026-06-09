import { useState, useCallback, useEffect } from 'react';
import {
  MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X, Pencil, RotateCcw, Save, MapPin, ArrowLeft, Lock, Plus, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import getBaseUrl from '@/lib/config';

const BASE_URL = getBaseUrl().replace(/\/$/, '');

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type LatLng = [number, number];

export type PlotData = {
  plot_number: string;
  acres:       number;
  coordinates: LatLng[];
};

type ApiPlot = {
  plot_name:        string;
  plot_area:        number;
  plot_coordinates: LatLng[];
  created_at?:      string;
};

export type PlotMarkingModalProps = {
  farmId:             string;
  farmLabel:          string;
  farmTotalAcres:     number;
  initialCoordinates: LatLng[];
  initialPlots?:      ApiPlot[];
  onClose:            () => void;
  onSave?:            (plot: PlotData) => void;
};

// ─────────────────────────────────────────────────────────────
// PLOT COLOR PALETTE
// ─────────────────────────────────────────────────────────────
const PLOT_COLORS = [
  '#f59e0b', // amber
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
];
const plotColor = (i: number) => PLOT_COLORS[i % PLOT_COLORS.length];

// ─────────────────────────────────────────────────────────────
// LEAFLET ICONS
// ─────────────────────────────────────────────────────────────
const makeIcon = (color: string, size: number, ring = 'white') =>
  L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:2.5px solid ${ring};
      border-radius:50%;
      box-shadow:0 0 0 2px ${color},0 2px 8px rgba(0,0,0,.45);
    "></div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    className:  '',
  });

const ICON_START = makeIcon('#22c55e', 16);  // green — first point (click to close)
const ICON_POINT = makeIcon('#3b82f6', 11);  // blue  — subsequent points
const ICON_REF   = makeIcon('#94a3b8', 7);   // grey  — original farm corners

// ─────────────────────────────────────────────────────────────
// MAP UTILITIES
// ─────────────────────────────────────────────────────────────
const centerOf = (coords: LatLng[]): LatLng => {
  if (!coords.length) return [20.5937, 78.9629]; // India fallback
  return [
    coords.reduce((s, c) => s + c[0], 0) / coords.length,
    coords.reduce((s, c) => s + c[1], 0) / coords.length,
  ];
};

const zoomFor = (coords: LatLng[]): number => {
  if (!coords.length) return 5;
  if (coords.length === 1) return 15;
  const lats = coords.map(c => c[0]);
  const lngs = coords.map(c => c[1]);
  const span = Math.max(
    Math.abs(Math.max(...lats) - Math.min(...lats)),
    Math.abs(Math.max(...lngs) - Math.min(...lngs)),
  );
  if (span < 0.001) return 17;
  if (span < 0.005) return 15;
  if (span < 0.02)  return 14;
  if (span < 0.1)   return 12;
  return 10;
};

// ─────────────────────────────────────────────────────────────
// MAP CLICK HANDLER — lives inside MapContainer
// Detects proximity to first point to auto-close the polygon
// ─────────────────────────────────────────────────────────────
function MapDrawHandler({
  active, points, onAddPoint, onClosePolygon,
}: {
  active:          boolean;
  points:          LatLng[];
  onAddPoint:      (latlng: LatLng) => void;
  onClosePolygon:  () => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (!active) return;
      if (points.length >= 3) {
        const firstPx = map.latLngToContainerPoint(L.latLng(points[0][0], points[0][1]));
        const clickPx = map.latLngToContainerPoint(e.latlng);
        if (Math.hypot(firstPx.x - clickPx.x, firstPx.y - clickPx.y) <= 20) {
          onClosePolygon();
          return;
        }
      }
      onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  void map;
  return null;
}

// ─────────────────────────────────────────────────────────────
// CURSOR INJECTOR
// ─────────────────────────────────────────────────────────────
function MapCursor({ crosshair }: { crosshair: boolean }) {
  return (
    <style>{`.leaflet-container { cursor: ${crosshair ? 'crosshair' : 'grab'} !important; }`}</style>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────────────────────
const PlotMarkingModal = ({
  farmId, farmLabel, farmTotalAcres, initialCoordinates, initialPlots = [], onClose, onSave,
}: PlotMarkingModalProps) => {

  // ── State ─────────────────────────────────────────────────
  const [formOpen,   setFormOpen]   = useState(false);
  const [plotNumber, setPlotNumber] = useState('');
  const [acresStr,   setAcresStr]   = useState('');
  const [isDrawing,  setIsDrawing]  = useState(false);
  const [points,     setPoints]     = useState<LatLng[]>([]);
  const [isClosed,   setIsClosed]   = useState(false);
  const [isSaving,   setIsSaving]   = useState(false);

  // Pre-populate with plots already saved to the server
  const [savedPlots, setSavedPlots] = useState<PlotData[]>(() =>
    initialPlots.map(p => ({
      plot_number: p.plot_name,
      acres:       p.plot_area,
      coordinates: p.plot_coordinates,
    }))
  );

  const usedAcres      = savedPlots.reduce((s, p) => s + p.acres, 0);
  const remainingAcres = Math.max(0, farmTotalAcres - usedAcres);

  const mapCenter = centerOf(initialCoordinates.length ? initialCoordinates : points);
  const mapZoom   = zoomFor(initialCoordinates.length ? initialCoordinates : points);

  // Esc: close form first, then modal
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (formOpen) { setFormOpen(false); return; }
        onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, formOpen]);

  // ── Drawing actions ───────────────────────────────────────
  const handleAddPoint = useCallback((latlng: LatLng) => {
    if (isClosed || !isDrawing) return;
    setPoints(prev => [...prev, latlng]);
  }, [isClosed, isDrawing]);

  const handleClosePolygon = useCallback(() => {
    if (points.length < 3) return;
    setIsClosed(true);
    toast.success('Polygon closed — save when ready');
  }, [points.length]);

  const handleReset = () => {
    setPoints([]);
    setIsClosed(false);
  };

  const handleBack = () => {
    handleReset();
    setIsDrawing(false);
    setPlotNumber('');
    setAcresStr('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/farmer_managment/save_land_plot`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id:          farmId,
          plot_coordinates: points,
          plot_area:        parseFloat(acresStr),
          plot_name:        plotNumber.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to save plot');

      const plot: PlotData = { plot_number: plotNumber.trim(), acres: parseFloat(acresStr), coordinates: points };
      setSavedPlots(prev => [...prev, plot]);
      onSave?.(plot);
      handleBack();   // reset drawing — modal stays open
      toast.success(`Plot "${plot.plot_number}" saved`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save plot');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Map data ──────────────────────────────────────────────
  const refPos:  [number, number][] = initialCoordinates as [number, number][];
  const drawPos: [number, number][] = points as [number, number][];

  const statusMsg = isClosed
    ? `Plot closed — ${points.length} points · "${plotNumber}" · ${acresStr} acres`
    : points.length === 0
      ? 'Click anywhere on the map to place the first boundary point'
      : points.length < 3
        ? `${points.length} point${points.length > 1 ? 's' : ''} placed — ${3 - points.length} more needed`
        : `${points.length} points — click the green dot or "Close Polygon" to finish`;

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-3">
      <div
        className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ height: '88vh', background: '#111827' }}
      >

        {/* ══════════════════════════════════════════════════
            TOOLBAR
        ══════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 bg-gray-900 gap-4">

          {/* Left: back (drawing) or title */}
          <div className="flex items-center gap-3 min-w-0">
            {isDrawing && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 shrink-0 rounded-lg border border-gray-600 px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:border-gray-400 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-bold text-white">
                  {isDrawing ? plotNumber : 'Plot Marking'}
                </span>
                {isDrawing && (
                  <span className="text-xs text-gray-400 font-mono">{acresStr} acres</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">{farmLabel}</p>
            </div>
          </div>

          {/* Right: context-aware actions */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Add Plot — only in idle state */}
            {!isDrawing && (
              <button
                onClick={() => setFormOpen(true)}
                disabled={remainingAcres <= 0}
                title={remainingAcres <= 0 ? 'All farm acreage has been allocated' : undefined}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Plot
              </button>
            )}

            {/* Close Polygon — 3+ open points */}
            {isDrawing && !isClosed && points.length >= 3 && (
              <button
                onClick={handleClosePolygon}
                className="flex items-center gap-1.5 rounded-lg border border-blue-500 bg-blue-900/50 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-800 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                Close Polygon
              </button>
            )}

            {/* Reset — any drawn points */}
            {isDrawing && points.length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-amber-400 hover:border-amber-500 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            {/* Save Plot — only after polygon is closed */}
            {isClosed && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-1.5 text-xs font-bold text-white transition-colors"
              >
                {isSaving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                {isSaving ? 'Saving…' : 'Save Plot'}
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg border border-gray-600 bg-gray-800 p-1.5 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            STATUS BAR — only while drawing
        ══════════════════════════════════════════════════ */}
        {isDrawing && (
          <div className={cn(
            'px-5 py-2 flex items-center gap-2.5 text-xs font-medium border-b transition-colors',
            isClosed
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
              : 'bg-blue-950/60 text-blue-300 border-blue-800',
          )}>
            <span className={cn(
              'w-2 h-2 rounded-full shrink-0',
              isClosed ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse',
            )} />
            {statusMsg}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            MAP + ALL OVERLAYS
        ══════════════════════════════════════════════════ */}
        <div className="flex-1 relative overflow-hidden">
          <MapCursor crosshair={isDrawing && !isClosed} />

          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl
          >
            {/* Satellite imagery */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles © Esri"
              maxZoom={19}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              opacity={0.6}
              maxZoom={19}
            />

            {/* Map click handler */}
            <MapDrawHandler
              active={isDrawing && !isClosed}
              points={points}
              onAddPoint={handleAddPoint}
              onClosePolygon={handleClosePolygon}
            />

            {/* ── Original farm boundary (grey dashed reference) ── */}
            {refPos.length >= 3 && (
              <Polygon
                positions={refPos}
                pathOptions={{
                  color:       '#94a3b8',
                  fillColor:   '#94a3b8',
                  fillOpacity: 0.1,
                  weight:      2,
                  dashArray:   '6 4',
                }}
              />
            )}
            {refPos.map((pt, i) => (
              <Marker key={`ref-${i}`} position={pt} icon={ICON_REF} />
            ))}

            {/* ── Saved plots — each with a unique color + name label ── */}
            {savedPlots.map((sp, si) =>
              sp.coordinates.length >= 3 ? (
                <Polygon
                  key={`saved-${si}`}
                  positions={sp.coordinates as [number, number][]}
                  pathOptions={{
                    color:       plotColor(si),
                    fillColor:   plotColor(si),
                    fillOpacity: 0.22,
                    weight:      2.5,
                  }}
                >
                  <Tooltip permanent direction="center" className="plot-label-tooltip">
                    <span style={{ fontWeight: 700, fontSize: 11, color: plotColor(si) }}>
                      {sp.plot_number}
                    </span>
                    <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 4 }}>
                      {sp.acres} ac
                    </span>
                  </Tooltip>
                </Polygon>
              ) : null,
            )}

            {/* ── Current plot — closed polygon ── */}
            {isClosed && drawPos.length >= 3 && (
              <Polygon
                positions={drawPos}
                pathOptions={{
                  color:       '#22c55e',
                  fillColor:   '#22c55e',
                  fillOpacity: 0.28,
                  weight:      2.5,
                }}
              />
            )}

            {/* ── Current plot — open polyline while drawing ── */}
            {!isClosed && drawPos.length >= 2 && (
              <Polyline
                positions={drawPos}
                pathOptions={{ color: '#22c55e', weight: 2.5, dashArray: '8 5' }}
              />
            )}

            {/* Dashed closing-line preview (last → first) */}
            {!isClosed && drawPos.length >= 3 && (
              <Polyline
                positions={[drawPos[drawPos.length - 1], drawPos[0]]}
                pathOptions={{ color: '#22c55e', weight: 1.5, dashArray: '4 6', opacity: 0.45 }}
              />
            )}

            {/* ── Vertex markers ── */}
            {drawPos.map((pt, i) => (
              <Marker
                key={`pt-${i}-${pt[0]}`}
                position={pt}
                icon={i === 0 ? ICON_START : ICON_POINT}
              />
            ))}
          </MapContainer>

          {/* ── Overlay: point counter (bottom-left) ── */}
          {isDrawing && (
            <div className="absolute bottom-5 left-5 z-[1000] rounded-xl bg-black/75 backdrop-blur-sm px-4 py-2.5 text-white pointer-events-none">
              <div className="text-base font-bold leading-none">{points.length}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {isClosed
                  ? 'Plot closed ✓'
                  : points.length === 0
                    ? 'No points yet'
                    : `${Math.max(0, 3 - points.length)} more to close`}
              </div>
            </div>
          )}

          {/* ── Overlay: legend (bottom-center) ── */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-4 rounded-xl bg-black/70 backdrop-blur-sm px-4 py-2 pointer-events-none">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
              <span className="w-5 h-0 inline-block" style={{ borderTop: '2px dashed #94a3b8' }} />
              Farm boundary
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white inline-block" />
              Start point
            </div>
            {isDrawing && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
                <span className="w-5 h-0 inline-block" style={{ borderTop: '2.5px dashed #22c55e' }} />
                Plot boundary
              </div>
            )}
            {savedPlots.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
                <span className="flex gap-0.5">
                  {savedPlots.slice(0, 3).map((_, i) => (
                    <span
                      key={i}
                      className="w-3 h-3 rounded-sm inline-block"
                      style={{ background: plotColor(i) + '55', border: `1.5px solid ${plotColor(i)}` }}
                    />
                  ))}
                </span>
                Plots ({savedPlots.length})
              </div>
            )}
          </div>

          {/* ── Overlay: coordinate list (top-right) ── */}
          {isDrawing && points.length > 0 && (
            <div className="absolute top-4 right-4 z-[1000] rounded-xl bg-black/75 backdrop-blur-sm px-3 py-2.5 text-white max-h-52 overflow-y-auto w-56">
              <p className="text-[11px] font-semibold text-gray-300 mb-1.5 uppercase tracking-wide">
                Plot Points
              </p>
              {points.map((pt, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-[10px] font-mono py-0.5 flex items-center gap-1.5',
                    i === 0 ? 'text-emerald-400' : 'text-gray-400',
                  )}
                >
                  <span className="text-gray-600 w-4 shrink-0">{i + 1}.</span>
                  {pt[0].toFixed(5)}, {pt[1].toFixed(5)}
                </div>
              ))}
            </div>
          )}

          {/* ── Overlay: save hint (bottom-right) ── */}
          {isClosed && (
            <div className="absolute bottom-5 right-5 z-[1000] rounded-xl bg-emerald-900/80 backdrop-blur-sm px-3 py-2.5 text-[11px] text-emerald-200 pointer-events-none">
              <p className="font-semibold text-emerald-300">Plot complete ✓</p>
              <p className="mt-0.5 text-emerald-400">Click "Save Plot" to save</p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              NEW PLOT FORM — floats over the map
          ══════════════════════════════════════════════════ */}
          {formOpen && (
            <div
              className="absolute inset-0 z-[2000] flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
            >
              <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">New Plot</p>
                      <p className="text-[11px] text-gray-400 font-mono truncate max-w-[180px]">
                        {farmId.slice(0, 20)}…
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFormOpen(false)}
                    className="rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Farm location */}
                {farmLabel && (
                  <div className="px-5 pt-3">
                    <p className="text-[11px] text-gray-500 truncate">{farmLabel}</p>
                  </div>
                )}

                {/* Form fields */}
                <div className="px-5 py-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700">
                      Plot Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Plot-01, P-A3…"
                      value={plotNumber}
                      onChange={e => setPlotNumber(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && e.currentTarget.form?.requestSubmit?.()}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-700">
                        Area (Acres) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-gray-400">
                        <span className="font-semibold text-emerald-600">{remainingAcres.toFixed(2)}</span> of {farmTotalAcres} ac remaining
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0.01"
                      max={remainingAcres}
                      step="0.01"
                      placeholder={`Max ${remainingAcres.toFixed(2)} ac`}
                      value={acresStr}
                      onChange={e => setAcresStr(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  <button
                    onClick={() => {
                      if (!plotNumber.trim()) { toast.error('Enter a plot number'); return; }
                      const a = parseFloat(acresStr);
                      if (isNaN(a) || a <= 0) { toast.error('Enter a valid acreage'); return; }
                      if (a > remainingAcres) {
                        toast.error(`Exceeds remaining farm capacity — max ${remainingAcres.toFixed(2)} ac`);
                        return;
                      }
                      setFormOpen(false);
                      setIsDrawing(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[.98] text-white px-4 py-3 text-sm font-semibold transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                    Draw Mapping
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlotMarkingModal;
