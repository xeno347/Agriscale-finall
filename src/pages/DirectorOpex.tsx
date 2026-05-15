import { useEffect, useMemo, useState } from "react";
import {
  createNewOpex,
  fetchLatestProjectFile,
  fetchProjectOpexList,
  formatInr,
  readJsonFromUrl,
  replaceExistingOpex,
} from "@/services/projectData";
import { Button } from "@/components/ui/button";
import { ChevronDown, Download, Plus, Table2, Trash2 } from "lucide-react";
import "./DirectorOpex.css";

interface LineItem {
  sNo: number;
  itemName: string;
  uom: string;
  quantity: number;
  // legacy single cost (used when no breakdown)
  perUnitCostInr: number;
  // per-year explicit costs (length = explicitYearsCount when breakdown active)
  perYearCosts?: number[];
  // per-unit cost for the aggregated rest of years
  restPerUnitCost?: number;
  amountInr: number;
}

interface OpexTable {
  id: string;
  name: string;
  opexId?: string;
  opexFileUrl?: string;
  isNew?: boolean;
  isSaved?: boolean;
  explicitYearsCount: number;
  rows: LineItem[];
  totalOpex: number;
}

const createEmptyOpexRow = (sNo: number): LineItem => ({
  sNo,
  itemName: "",
  uom: "",
  quantity: 0,
  perUnitCostInr: 0,
  amountInr: 0,
});

const buildOpexTable = (name: string, rows: LineItem[], explicitYearsCount = 0): OpexTable => {
  const normalizedRows = rows.map((row, index) => ({
    ...row,
    sNo: index + 1,
  }));

  return {
    id: `opex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    explicitYearsCount,
    rows: normalizedRows,
    totalOpex: normalizedRows.reduce((sum, row) => sum + row.amountInr, 0),
  };
};

const normalizeOpexRows = (payload: unknown): LineItem[] => {
  const rawRows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? (() => {
          const typedPayload = payload as {
            lineItems?: unknown;
            step4_opex?: { lineItems?: unknown };
            [key: string]: unknown;
          };

          if (Array.isArray(typedPayload.lineItems)) {
            return typedPayload.lineItems;
          }

          if (Array.isArray(typedPayload.step4_opex?.lineItems)) {
            return typedPayload.step4_opex.lineItems;
          }

          return Object.entries(typedPayload)
            .filter(([key, value]) => key.startsWith("item_") && value && typeof value === "object")
            .map(([, value]) => value);
        })()
      : [];

  return rawRows.map((item, index) => {
    const row = item as Record<string, unknown>;
    const itemName =
      typeof row.Item_name === "string"
        ? row.Item_name
        : typeof row.itemName === "string"
          ? row.itemName
          : typeof row.item_name === "string"
            ? row.item_name
            : "-";
    const uom = typeof row.UOM === "string" ? row.UOM : typeof row.uom === "string" ? row.uom : typeof row.item_UOM === "string" ? row.item_UOM : "-";
    const quantity = typeof row.quantity === "number" ? row.quantity : typeof row.item_quanity === "number" ? row.item_quanity : 0;

    const perYearCosts = Object.entries(row)
      .filter(([key, value]) => /^year_\d+_per_unit_cost$/i.test(key) && typeof value === "number")
      .sort((left, right) => {
        const leftIndex = Number(left[0].match(/year_(\d+)_per_unit_cost/i)?.[1] ?? 0);
        const rightIndex = Number(right[0].match(/year_(\d+)_per_unit_cost/i)?.[1] ?? 0);
        return leftIndex - rightIndex;
      })
      .map(([, value]) => Number(value) || 0);

    const yearAmounts = Object.entries(row)
      .filter(([key, value]) => /^amount_year_\d+$/i.test(key) && typeof value === "number")
      .sort((left, right) => {
        const leftIndex = Number(left[0].match(/amount_year_(\d+)/i)?.[1] ?? 0);
        const rightIndex = Number(right[0].match(/amount_year_(\d+)/i)?.[1] ?? 0);
        return leftIndex - rightIndex;
      })
      .map(([, value]) => Number(value) || 0);

    const perUnitCostInr =
      typeof row.perUnitCostInr === "number"
        ? row.perUnitCostInr
        : typeof row.per_unit_cost === "number"
          ? row.per_unit_cost
          : typeof row.item_per_unit_cost === "number"
            ? row.item_per_unit_cost
            : perYearCosts[0] ?? 0;

    const restPerUnitCost =
      typeof row.restPerUnitCost === "number"
        ? row.restPerUnitCost
        : typeof row.rest_per_unit_cost === "number"
          ? row.rest_per_unit_cost
          : typeof row.per_unit_cost === "number"
            ? row.per_unit_cost
            : undefined;

    const amountInr =
      typeof row.amountInr === "number"
        ? row.amountInr
        : typeof row.amount === "number"
          ? row.amount
          : yearAmounts.length > 0
            ? yearAmounts.reduce((sum, value) => sum + value, 0) + (typeof row.amount === "number" ? row.amount : 0)
            : quantity * perUnitCostInr;

    return {
      sNo: typeof row.sNo === "number" ? row.sNo : index + 1,
      itemName,
      uom,
      quantity,
      perUnitCostInr,
      perYearCosts,
      restPerUnitCost,
      amountInr,
    };
  });
};

const DirectorOpex = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [totalCapex, setTotalCapex] = useState(0);
  const [opexTables, setOpexTables] = useState<OpexTable[]>([]);
  const [selectedOpexId, setSelectedOpexId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [explicitYearsCount, setExplicitYearsCount] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { meta, data } = await fetchLatestProjectFile();
        setProjectId(meta.project_id);
        setProjectName(data.step1_projectDetails?.projectName ?? "");

        setTotalCapex(data.step3_capex?.totalCapexInr ?? 0);

        const opexList = await fetchProjectOpexList(meta.project_id);
        if (!opexList.length) {
          const fallbackTable = {
            ...buildOpexTable("OPEX 1", [createEmptyOpexRow(1)], 0),
            isNew: true,
            isSaved: false,
          };
          setOpexTables([fallbackTable]);
          setSelectedOpexId(fallbackTable.id);
          return;
        }

        const loadedTables = await Promise.all(
          opexList.map(async (opexItem, index) => {
            try {
              const opexPayload = await readJsonFromUrl<unknown>(opexItem.opex_file_url);
              const rows = normalizeOpexRows(opexPayload);
              const explicitYears = rows.reduce((max, row) => Math.max(max, row.perYearCosts?.length ?? 0), 0);
              return {
                ...buildOpexTable(opexItem.opex_name || `OPEX ${index + 1}`, rows.length ? rows : [createEmptyOpexRow(1)], explicitYears),
                opexId: opexItem.opex_id,
                opexFileUrl: opexItem.opex_file_url,
                isNew: false,
                isSaved: true,
              };
            } catch {
              return {
                ...buildOpexTable(opexItem.opex_name || `OPEX ${index + 1}`, [createEmptyOpexRow(1)], 0),
                opexId: opexItem.opex_id,
                opexFileUrl: opexItem.opex_file_url,
                isNew: false,
                isSaved: true,
              };
            }
          }),
        );

        setOpexTables(loadedTables);
        setSelectedOpexId(loadedTables[0]?.id ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load project data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const activeOpexTable = useMemo(() => {
    const selectedTable = opexTables.find((table) => table.id === selectedOpexId);
    return selectedTable ?? opexTables[0] ?? null;
  }, [opexTables, selectedOpexId]);

  const opexRows = activeOpexTable?.rows ?? [];
  const hasOpexRows = useMemo(() => opexRows.length > 0, [opexRows]);
  const totalOpex = activeOpexTable?.totalOpex ?? 0;
  const totalCapexOpex = totalCapex + totalOpex;
  const currentYearsCount = activeOpexTable?.explicitYearsCount ?? explicitYearsCount;
  const syncActiveOpexTable = (transform: (rows: LineItem[]) => LineItem[], nextYearsCount?: number) => {
    if (!activeOpexTable) {
      return;
    }

    setOpexTables((previousTables) =>
      previousTables.map((table) => {
        if (table.id !== activeOpexTable.id) {
          return table;
        }

        const nextRows = transform(table.rows).map((row, index) => ({
          ...row,
          sNo: index + 1,
        }));

        return {
          ...table,
          rows: nextRows,
          explicitYearsCount: nextYearsCount ?? table.explicitYearsCount,
          totalOpex: nextRows.reduce((sum, row) => sum + row.amountInr, 0),
        };
      }),
    );
  };

  const updateOpexRow = (index: number, field: keyof Omit<LineItem, "sNo" | "perYearCosts" | "restPerUnitCost">, value: string | number) => {
    syncActiveOpexTable((prev) => {
      const updated = [...prev];
      if (!updated[index]) {
        return prev;
      }

      if (field === "quantity" || field === "perUnitCostInr") {
        updated[index] = { ...updated[index], [field]: Number(value) || 0 } as LineItem;
      } else {
        updated[index] = { ...updated[index], [field]: String(value) } as LineItem;
      }

      const row = updated[index];
      const yearSum = (row.perYearCosts ?? []).reduce((s, v) => s + (v || 0), 0);
      const rest = row.restPerUnitCost ?? 0;
      row.amountInr = currentYearsCount === 0 ? row.quantity * row.perUnitCostInr : row.quantity * (yearSum + rest);
      updated[index] = row;
      return updated;
    });
  };

  const updateOpexYearCost = (rowIndex: number, yearIndex: number, value: number) => {
    syncActiveOpexTable((prev) => {
      const updated = [...prev];
      if (!updated[rowIndex]) {
        return prev;
      }

      const row = { ...updated[rowIndex] };
      row.perYearCosts = Array.from(row.perYearCosts ?? []);
      row.perYearCosts[yearIndex] = Number(value) || 0;
      const yearSum = row.perYearCosts.reduce((s, v) => s + (v || 0), 0);
      const rest = row.restPerUnitCost ?? 0;
      row.amountInr = row.quantity * (yearSum + rest);
      updated[rowIndex] = row;
      return updated;
    });
  };

  const updateOpexRestCost = (rowIndex: number, value: number) => {
    syncActiveOpexTable((prev) => {
      const updated = [...prev];
      if (!updated[rowIndex]) {
        return prev;
      }

      const row = { ...updated[rowIndex] };
      row.restPerUnitCost = Number(value) || 0;
      const yearSum = (row.perYearCosts ?? []).reduce((s, v) => s + (v || 0), 0);
      row.amountInr = row.quantity * (yearSum + (row.restPerUnitCost ?? 0));
      updated[rowIndex] = row;
      return updated;
    });
  };

  const addYearBreakdown = () => {
    const nextYears = currentYearsCount + 1;
    syncActiveOpexTable((rowsPrev) =>
      rowsPrev.map((r) => {
        const nextRow = { ...r };
        const perYear = Array.from(nextRow.perYearCosts ?? []);

        if (currentYearsCount === 0) {
          perYear[0] = nextRow.perUnitCostInr ?? 0;
          nextRow.restPerUnitCost = 0;
        } else {
          perYear.push(0);
        }

        nextRow.perYearCosts = perYear;
        const yearSum = perYear.reduce((s, v) => s + (v || 0), 0);
        nextRow.amountInr = nextRow.quantity * (yearSum + (nextRow.restPerUnitCost ?? 0));
        return nextRow;
      }),
      nextYears,
    );
  };

  const removeYearBreakdown = () => {
    if (currentYearsCount === 0) {
      return;
    }

    const nextYears = currentYearsCount - 1;
    syncActiveOpexTable((rowsPrev) =>
      rowsPrev.map((r) => {
        const nextRow = { ...r };
        const perYear = Array.from(nextRow.perYearCosts ?? []);

        if (nextYears === 0) {
          const fallbackCost = perYear[0] ?? nextRow.perUnitCostInr ?? 0;
          return {
            ...nextRow,
            perUnitCostInr: fallbackCost,
            perYearCosts: undefined,
            restPerUnitCost: 0,
            amountInr: nextRow.quantity * fallbackCost,
          };
        }

        perYear.pop();
        const yearSum = perYear.reduce((sum, cost) => sum + (cost || 0), 0);
        return {
          ...nextRow,
          perYearCosts: perYear,
          amountInr: nextRow.quantity * (yearSum + (nextRow.restPerUnitCost ?? 0)),
        };
      }),
      nextYears,
    );
  };

  const addOpexRow = () => {
    syncActiveOpexTable((prev) => [...prev, createEmptyOpexRow(prev.length + 1)]);
  };

  const deleteOpexRow = (index: number) => {
    syncActiveOpexTable((prev) => prev.filter((_, i) => i !== index));
  };

  const createNewOpexTable = () => {
    const tableNumber = opexTables.length + 1;
    const newTable = {
      ...buildOpexTable(`OPEX ${tableNumber}`, [createEmptyOpexRow(1)], 0),
      isNew: true,
      isSaved: false,
    };
    setOpexTables((previousTables) => [...previousTables, newTable]);
    setSelectedOpexId(newTable.id);
    setExplicitYearsCount(0);
  };

  const buildOpexJson = (rows: LineItem[]) =>
    rows.reduce<Record<string, Record<string, string | number | undefined>>>((accumulator, row, index) => {
      const itemPayload: Record<string, string | number | undefined> = {
        Item_name: row.itemName,
        UOM: row.uom,
        quantity: row.quantity,
      };

      if ((row.perYearCosts?.length ?? 0) > 0) {
        row.perYearCosts?.forEach((yearCost, yearIndex) => {
          itemPayload[`year_${yearIndex + 1}_per_unit_cost`] = yearCost;
          itemPayload[`amount_year_${yearIndex + 1}`] = row.quantity * yearCost;
        });
        itemPayload.per_unit_cost = row.restPerUnitCost ?? 0;
        itemPayload.amount = row.quantity * (row.restPerUnitCost ?? 0);
      } else {
        itemPayload.per_unit_cost = row.perUnitCostInr;
        itemPayload.amount = row.amountInr;
      }

      accumulator[`item_${index + 1}`] = itemPayload;
      return accumulator;
    }, {});

  const saveOpexChanges = async () => {
    try {
      setIsSaving(true);
      if (!activeOpexTable) {
        return;
      }

      if (activeOpexTable.isNew) {
        if (!projectId) {
          throw new Error("Project ID not available for creating OPEX.");
        }

        if (!activeOpexTable.name.trim()) {
          throw new Error("OPEX name is required.");
        }

        const response = (await createNewOpex({
          project_id: projectId,
          opex_name: activeOpexTable.name.trim(),
          opex_json: buildOpexJson(opexRows),
        })) as { success?: boolean; project_id?: string; opex_id?: string };

        setOpexTables((previousTables) =>
          previousTables.map((table) =>
            table.id === activeOpexTable.id
              ? {
                  ...table,
                  opexId: response.opex_id ?? table.opexId,
                  isNew: false,
                  isSaved: true,
                }
              : table,
          ),
        );
        return;
      }

      if (!activeOpexTable.opexId) {
        throw new Error("OPEX id missing for current table.");
      }

      await replaceExistingOpex({
        project_id: projectId,
        opex_id: activeOpexTable.opexId,
        new_opex_json: buildOpexJson(opexRows),
      });

      setOpexTables((previousTables) =>
        previousTables.map((table) =>
          table.id === activeOpexTable.id
            ? {
                ...table,
                isSaved: true,
              }
            : table,
        ),
      );
    } catch (err) {
      console.error("Error saving OPEX changes:", err);
      setError(err instanceof Error ? err.message : "Failed to save OPEX table");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="w-full space-y-4 px-0 sm:px-1 lg:px-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">OPEX</h1>
          <p className="mt-1 text-sm text-slate-600">{projectName ? `Project: ${projectName}` : "Project OPEX overview"}</p>
          {!loading && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                <Table2 className="h-4 w-4 text-slate-500" />
                <span>Selected OPEX</span>
                <div className="relative">
                  <select
                    value={selectedOpexId ?? ""}
                    onChange={(event) => {
                      const nextId = event.target.value || null;
                      setSelectedOpexId(nextId);
                      const nextTable = opexTables.find((table) => table.id === nextId) ?? opexTables[0];
                      setExplicitYearsCount(nextTable?.explicitYearsCount ?? 0);
                    }}
                    className="appearance-none rounded-xl border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  >
                    {opexTables.length === 0 ? (
                      <option value="">No OPEX tables</option>
                    ) : (
                      opexTables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {activeOpexTable && (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                  <span className="font-medium text-slate-500">OPEX Name</span>
                  <input
                    value={activeOpexTable.name}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      setOpexTables((previousTables) =>
                        previousTables.map((table) =>
                          table.id === activeOpexTable.id
                            ? {
                                ...table,
                                name: nextName,
                              }
                            : table,
                        ),
                      );
                    }}
                    className="min-w-[220px] rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    placeholder="Enter OPEX name"
                  />
                </div>
              )}

              <Button type="button" onClick={createNewOpexTable} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                <Plus className="h-4 w-4" />
                New OPEX Table
              </Button>

              <Button
                type="button"
                onClick={saveOpexChanges}
                disabled={isSaving || !activeOpexTable}
                className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                {isSaving ? "Saving..." : activeOpexTable?.isNew || !activeOpexTable?.isSaved ? "Create OPEX" : "Save Current"}
              </Button>
            </div>
          )}
          {loading && (
            <div className="mt-4 flex items-center gap-3">
              <div className="spinner"></div>
              <p className="text-sm text-slate-500">Loading project data...</p>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </div>

        {!loading && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total CAPEX Amount</p>
                <p className="mt-1 text-lg font-bold text-blue-900">{formatInr(totalCapex)}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total OPEX Amount</p>
                <p className="mt-1 text-lg font-bold text-amber-900">{formatInr(totalOpex)}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">CAPEX + OPEX Total</p>
                <p className="mt-1 text-lg font-bold text-emerald-900">{formatInr(totalCapexOpex)}</p>
              </div>
            </div>

            {/* OPEX Section - Editable */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-semibold text-slate-900">OPEX Details (Editable)</h2>
              </div>

              <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full table-fixed text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                      <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                        <th className="w-[6%] px-4 py-3">S.no</th>
                        <th className="w-[24%] px-4 py-3">Item Name</th>
                        <th className="w-[12%] px-4 py-3">UOM</th>
                        <th className="w-[10%] px-4 py-3">Quantity</th>
                        {currentYearsCount === 0 ? (
                          <th className="w-[18%] px-4 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <span>Per Unit Cost</span>
                              <button
                                type="button"
                                onClick={addYearBreakdown}
                                aria-label="Add year"
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold leading-none text-white transition hover:bg-white/20"
                              >
                                +
                              </button>
                            </div>
                          </th>
                        ) : (
                          <>
                            {Array.from({ length: currentYearsCount }).map((_, yi) => (
                              <th key={`year-head-${yi}`} className="w-[11%] px-4 py-3">
                                <div className="flex items-center justify-between gap-2">
                                  <span>Year {yi + 1}</span>
                                  {currentYearsCount > 1 && yi === currentYearsCount - 1 ? (
                                    <button
                                      type="button"
                                      onClick={removeYearBreakdown}
                                      aria-label="Remove year"
                                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl font-semibold leading-none text-white transition hover:bg-white/20"
                                    >
                                      -
                                    </button>
                                  ) : null}
                                </div>
                              </th>
                            ))}
                            <th className="w-[14%] px-4 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <span>Rest of Years</span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={addYearBreakdown}
                                    aria-label="Add year"
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold leading-none text-white transition hover:bg-white/20"
                                  >
                                    +
                                  </button>
                                  {currentYearsCount > 0 ? (
                                    <button
                                      type="button"
                                      onClick={removeYearBreakdown}
                                      aria-label="Remove year"
                                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl font-semibold leading-none text-white transition hover:bg-white/20"
                                    >
                                      -
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </th>
                          </>
                        )}
                        <th className="w-[12%] px-4 py-3">Amount</th>
                        <th className="w-[10%] px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!hasOpexRows ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                            No OPEX line items found.
                          </td>
                        </tr>
                      ) : (
                        opexRows.map((row, index) => (
                          <tr key={`opex-row-${index}`} className="border-t border-slate-100 align-top odd:bg-slate-50/60 even:bg-white transition hover:bg-amber-50/50">
                            <td className="px-4 py-3 align-middle text-slate-700">{row.sNo}</td>
                            <td className="px-4 py-3">
                              <input
                                value={row.itemName}
                                onChange={(e) => updateOpexRow(index, "itemName", e.target.value)}
                                placeholder="Enter item name"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                value={row.uom}
                                onChange={(e) => updateOpexRow(index, "uom", e.target.value)}
                                placeholder="UOM"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.quantity}
                                onChange={(e) => updateOpexRow(index, "quantity", e.target.value)}
                                placeholder="0"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                              />
                            </td>

                            {/* Per-year inputs or single forever input */}
                            {currentYearsCount === 0 ? (
                              <td className="px-4 py-3">
                                <div className="relative">
                                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={row.perUnitCostInr}
                                    onChange={(e) => updateOpexRow(index, "perUnitCostInr", e.target.value)}
                                    placeholder="0"
                                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                  />
                                </div>
                              </td>
                            ) : (
                              <>
                                {Array.from({ length: currentYearsCount }).map((_, yi) => (
                                  <td key={`year-cell-${index}-${yi}`} className="px-4 py-3">
                                    <div className="relative">
                                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={(row.perYearCosts ?? [])[yi] ?? 0}
                                        onChange={(e) => updateOpexYearCost(index, yi, Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                      />
                                    </div>
                                  </td>
                                ))}
                                <td className="px-4 py-3">
                                  <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={row.restPerUnitCost ?? 0}
                                      onChange={(e) => updateOpexRestCost(index, Number(e.target.value))}
                                      placeholder="0"
                                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                    />
                                  </div>
                                </td>
                              </>
                            )}

                            <td className="px-4 py-3 font-semibold text-slate-800">{formatInr(row.amountInr)}</td>
                            <td className="px-4 py-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => deleteOpexRow(index)}
                                disabled={opexRows.length === 1}
                                className="border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="border-t border-slate-200 bg-slate-50/80">
                        <td colSpan={currentYearsCount === 0 ? 5 : currentYearsCount + 5} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                          Total OPEX
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{formatInr(totalOpex)}</td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-sm text-slate-600">
                    Use <span className="font-semibold text-slate-900">Add year</span> to split future years and <span className="font-semibold text-slate-900">Remove year</span> to collapse the last one.
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" onClick={addOpexRow} className="gap-2 border-slate-300">
                      <Plus className="h-4 w-4" />
                      Add Row
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DirectorOpex;
