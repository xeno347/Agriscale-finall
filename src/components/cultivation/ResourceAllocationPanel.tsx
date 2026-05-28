import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Tractor, Users } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export type ResourceMappedRow = {
  date?: string | string[];
  activity?: string;
  selected_area?: number;
  work_quantity?: number;
};

type ResourceAllocationPanelProps = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  mappedRows: ResourceMappedRow[];
};

type DailyPoint = {
  date: string;
  acres: number;
  required: number;
};

const ResourceAllocationPanel = ({ open, onOpen, onClose, mappedRows }: ResourceAllocationPanelProps) => {
  const [tractorCapacity, setTractorCapacity] = useState<number>(8);
  const [labourCapacity, setLabourCapacity] = useState<number>(2);

  const activityOptions = useMemo(() => {
    return Array.from(new Set(mappedRows.map((r) => String(r.activity || "").trim()).filter(Boolean)));
  }, [mappedRows]);

  const [tractorActivities, setTractorActivities] = useState<string[]>([]);
  const [labourActivities, setLabourActivities] = useState<string[]>([]);

  const grouped = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    mappedRows.forEach((row) => {
      const activity = String(row.activity || "").trim();
      if (!activity) return;
      const acres = Number(row.selected_area ?? row.work_quantity ?? 0) || 0;
      const dates = Array.isArray(row.date) ? row.date : [row.date];
      dates.forEach((d) => {
        const date = String(d || "").trim();
        if (!date) return;
        if (!map[date]) map[date] = {};
        map[date][activity] = (map[date][activity] || 0) + acres;
      });
    });
    return map;
  }, [mappedRows]);

  const toSeries = (selectedActivities: string[], perDayCapacity: number): DailyPoint[] => {
    const safeCapacity = Math.max(Number(perDayCapacity) || 1, 0.1);
    return Object.keys(grouped)
      .sort()
      .map((date) => {
        const acres = selectedActivities.reduce((sum, activity) => sum + Number(grouped[date]?.[activity] || 0), 0);
        const required = acres > 0 ? acres / safeCapacity : 0;
        return { date, acres, required: Number(required.toFixed(2)) };
      });
  };

  const tractorSeries = useMemo(() => toSeries(tractorActivities, tractorCapacity), [grouped, tractorActivities, tractorCapacity]);
  const labourSeries = useMemo(() => toSeries(labourActivities, labourCapacity), [grouped, labourActivities, labourCapacity]);

  const avg = (series: DailyPoint[]) => {
    const active = series.filter((s) => s.required > 0);
    if (!active.length) return 0;
    return Number((active.reduce((sum, s) => sum + s.required, 0) / active.length).toFixed(2));
  };

  const avgTractor = avg(tractorSeries);
  const avgLabour = avg(labourSeries);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="fixed right-0 top-52 z-50 rounded-l-xl bg-emerald-700 px-3 py-3 text-white shadow-lg"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          Resources <ChevronLeft className="h-4 w-4" />
        </span>
      </button>
    );
  }

  return (
    <aside className="fixed right-0 top-0 z-50 h-screen w-[420px] border-l border-emerald-100 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <div className="text-base font-bold text-emerald-800">Resource Allocation</div>
          <div className="text-xs text-emerald-600">Daily planning by activities and acres</div>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-emerald-700 hover:bg-emerald-50">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="h-[calc(100vh-64px)] overflow-y-auto p-4 space-y-5">
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <Tractor className="h-4 w-4" /> Tractor Planning
          </div>
          <label className="text-xs text-slate-600">Per day per tractor work quantity (acres)</label>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={tractorCapacity}
            onChange={(e) => setTractorCapacity(Number(e.target.value || 0))}
            className="mt-1 h-8"
          />
          <div className="mt-2 text-xs font-semibold text-slate-700">Activities using tractors</div>
          <div className="mt-1 grid grid-cols-1 gap-1 max-h-28 overflow-y-auto rounded border bg-white p-2">
            {activityOptions.map((a) => (
              <label key={`tractor-${a}`} className="flex items-center gap-2 text-xs">
                <Checkbox checked={tractorActivities.includes(a)} onCheckedChange={() => toggle(tractorActivities, setTractorActivities, a)} />
                <span>{a}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-700">Average/day tractors required: <span className="font-bold">{avgTractor}</span></div>
          <div className="mt-2 h-40 rounded border bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tractorSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="required" stroke="#059669" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-800">
            <Users className="h-4 w-4" /> Labour Planning
          </div>
          <label className="text-xs text-slate-600">Per day per labour work quantity (acres)</label>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={labourCapacity}
            onChange={(e) => setLabourCapacity(Number(e.target.value || 0))}
            className="mt-1 h-8"
          />
          <div className="mt-2 text-xs font-semibold text-slate-700">Activities using labour</div>
          <div className="mt-1 grid grid-cols-1 gap-1 max-h-28 overflow-y-auto rounded border bg-white p-2">
            {activityOptions.map((a) => (
              <label key={`labour-${a}`} className="flex items-center gap-2 text-xs">
                <Checkbox checked={labourActivities.includes(a)} onCheckedChange={() => toggle(labourActivities, setLabourActivities, a)} />
                <span>{a}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-700">Average/day labour required: <span className="font-bold">{avgLabour}</span></div>
          <div className="mt-2 h-40 rounded border bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={labourSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="required" stroke="#2563eb" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </aside>
  );
};

export default ResourceAllocationPanel;
