import { useMemo, useState } from "react";
import { useEffect } from "react";
import { fetchLatestProjectFile } from "@/services/projectData";
import "./ProjectConfig.css";

type ProjectConfigForm = {
  projectName: string;
  projectLocation: string;
  clusterName: string;
  zoneName: string;
  projectStartDate: string;
  timelineStartDate: string;
  timelineEndDate: string;
  napierCutCycleDays: string;
  napierNeededPerDay: string;
  projectGeographyAcres: string;
};

const initialForm: ProjectConfigForm = {
  projectName: "",
  projectLocation: "",
  clusterName: "",
  zoneName: "",
  projectStartDate: "",
  timelineStartDate: "",
  timelineEndDate: "",
  napierCutCycleDays: "",
  napierNeededPerDay: "",
  projectGeographyAcres: "",
};

const ProjectConfig = () => {
  const [form, setForm] = useState<ProjectConfigForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof ProjectConfigForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const totalNapierPerCycle = useMemo(() => {
    const cutCycle = Number(form.napierCutCycleDays);
    const neededPerDay = Number(form.napierNeededPerDay);
    if (!Number.isFinite(cutCycle) || !Number.isFinite(neededPerDay) || cutCycle <= 0 || neededPerDay < 0) {
      return null;
    }
    return cutCycle * neededPerDay;
  }, [form.napierCutCycleDays, form.napierNeededPerDay]);

  const napierPerAcre = useMemo(() => {
    const acres = Number(form.projectGeographyAcres);
    if (totalNapierPerCycle === null || !Number.isFinite(acres) || acres <= 0) {
      return null;
    }
    return totalNapierPerCycle / acres;
  }, [form.projectGeographyAcres, totalNapierPerCycle]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await fetchLatestProjectFile();
        setForm((prev) => ({
          ...prev,
          projectName: data.step1_projectDetails?.projectName ?? "",
          projectLocation: data.step1_projectDetails?.projectLocation ?? "",
          clusterName: data.step1_projectDetails?.clusterName ?? "",
          zoneName: data.step1_projectDetails?.zoneName ?? "",
          projectStartDate: data.step1_projectDetails?.projectStartDate ?? "",
          timelineStartDate: data.step2_timelineGoalGeography?.projectTimeline?.startDate ?? "",
          timelineEndDate: data.step2_timelineGoalGeography?.projectTimeline?.endDate ?? "",
          napierCutCycleDays: String(data.step2_timelineGoalGeography?.projectGoal?.napierCutCycleDays ?? ""),
          napierNeededPerDay: String(data.step2_timelineGoalGeography?.projectGoal?.napierNeededPerDayTons ?? ""),
          projectGeographyAcres: String(data.step2_timelineGoalGeography?.projectGeography?.acresRequired ?? ""),
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load project data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Project Config</h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure project details using the same Step 1 and Step 2 flow.
          </p>
          {loading && (
            <div className="mt-4 flex items-center gap-3">
              <div className="spinner"></div>
              <p className="text-sm text-slate-500">Loading latest project configuration...</p>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </div>

        {!loading && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Step 1: Project Details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Project Name</label>
                  <input
                    value={form.projectName}
                    onChange={(e) => updateField("projectName", e.target.value)}
                    placeholder="Enter project name"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Project Location</label>
                  <input
                    value={form.projectLocation}
                    onChange={(e) => updateField("projectLocation", e.target.value)}
                    placeholder="Enter project location"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cluster Name</label>
                  <input
                    value={form.clusterName}
                    onChange={(e) => updateField("clusterName", e.target.value)}
                    placeholder="Enter cluster name"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Zone Name</label>
                  <input
                    value={form.zoneName}
                    onChange={(e) => updateField("zoneName", e.target.value)}
                    placeholder="Enter zone name"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Project Start Date</label>
                  <input
                    type="date"
                    value={form.projectStartDate}
                    onChange={(e) => updateField("projectStartDate", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Step 2: Timeline, Goal & Geography</h2>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">Project Timeline</p>
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Start Date</label>
                      <input
                        type="date"
                        value={form.timelineStartDate}
                        onChange={(e) => updateField("timelineStartDate", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <p className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Till</p>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">End Date</label>
                      <input
                        type="date"
                        value={form.timelineEndDate}
                        onChange={(e) => updateField("timelineEndDate", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-800">Project Goal</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">1. Napier Cut Cycle (in days)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.napierCutCycleDays}
                        onChange={(e) => updateField("napierCutCycleDays", e.target.value)}
                        placeholder="Enter cut cycle days"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">2. Napier Needed Per Day</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={form.napierNeededPerDay}
                        onChange={(e) => updateField("napierNeededPerDay", e.target.value)}
                        placeholder="Enter napier needed per day"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">3. Total Napier Required Per Cycle</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {totalNapierPerCycle === null ? "-" : totalNapierPerCycle.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Project Geography (Acres of Land Needed)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.projectGeographyAcres}
                    onChange={(e) => updateField("projectGeographyAcres", e.target.value)}
                    placeholder="Enter total acres required"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Derived Metric</p>
                  <p className="mt-2 text-sm font-medium text-emerald-900">
                    Amount of napier per acre required = {napierPerAcre === null ? "Project goal / Project geography" : napierPerAcre.toFixed(2)}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectConfig;
