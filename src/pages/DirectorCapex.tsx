import { useEffect, useMemo, useState } from "react";
import {
  createNewCapex,
  fetchLatestProjectFile,
  fetchProjectCapexList,
  formatInr,
  readJsonFromUrl,
  replaceExistingCapex,
} from "@/services/projectData";
import { Button } from "@/components/ui/button";
import { ChevronDown, Download, Plus, Table2, Trash2 } from "lucide-react";
import "./DirectorCapex.css";

interface CapexRow {
  sNo: number;
  itemName: string;
  uom: string;
  quantity: number;
  perUnitCostInr: number;
  amountInr: number;
}

interface CapexTable {
  id: string;
  name: string;
  capexId?: string;
  capexFileUrl?: string;
  isNew?: boolean;
  isSaved?: boolean;
  rows: CapexRow[];
  totalCapex: number;
}

const createEmptyRow = (sNo: number): CapexRow => ({
  sNo,
  itemName: "",
  uom: "",
  quantity: 0,
  perUnitCostInr: 0,
  amountInr: 0,
});

const normalizeRows = (rows: CapexRow[]) =>
  rows.map((row, index) => ({
    ...row,
    sNo: index + 1,
    amountInr: row.quantity * row.perUnitCostInr,
  }));

const normalizeCapexRows = (payload: unknown): CapexRow[] => {
  const rawRows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? (() => {
          const typedPayload = payload as {
            lineItems?: unknown;
            step3_capex?: { lineItems?: unknown };
            [key: string]: unknown;
          };

          if (Array.isArray(typedPayload.lineItems)) {
            return typedPayload.lineItems;
          }

          if (Array.isArray(typedPayload.step3_capex?.lineItems)) {
            return typedPayload.step3_capex.lineItems;
          }

          return Object.entries(typedPayload)
            .filter(([key, value]) => key.startsWith("item_") && value && typeof value === "object")
            .map(([, value]) => value);
        })()
      : [];

  return rawRows.map((item, index) => {
    const row = item as Record<string, unknown>;
    const itemName = typeof row.itemName === "string" ? row.itemName : typeof row.item_name === "string" ? row.item_name : "-";
    const uom = typeof row.uom === "string" ? row.uom : typeof row.item_UOM === "string" ? row.item_UOM : "-";
    const quantity = typeof row.quantity === "number" ? row.quantity : typeof row.item_quanity === "number" ? row.item_quanity : 0;
    const perUnitCostInr =
      typeof row.perUnitCostInr === "number" ? row.perUnitCostInr : typeof row.item_per_unit_cost === "number" ? row.item_per_unit_cost : 0;
    const amountInr = typeof row.amountInr === "number" ? row.amountInr : typeof row.amount === "number" ? row.amount : quantity * perUnitCostInr;
    const sNo = typeof row.sNo === "number" ? row.sNo : index + 1;

    return {
      sNo,
      itemName,
      uom,
      quantity,
      perUnitCostInr,
      amountInr,
    };
  });
};

const buildCapexTable = (name: string, rows: CapexRow[]): CapexTable => {
  const normalizedRows = normalizeRows(rows);

  return {
    id: `capex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    rows: normalizedRows,
    totalCapex: normalizedRows.reduce((sum, row) => sum + row.amountInr, 0),
  };
};

const buildCapexJson = (rows: CapexRow[]) =>
  rows.reduce<Record<string, {
    item_name: string;
    item_UOM: string;
    item_quanity: number;
    item_per_unit_cost: number;
    amount: number;
  }>>((accumulator, row, index) => {
    accumulator[`item_${index + 1}`] = {
      item_name: row.itemName,
      item_UOM: row.uom,
      item_quanity: row.quantity,
      item_per_unit_cost: row.perUnitCostInr,
      amount: row.amountInr,
    };
    return accumulator;
  }, {});

const DirectorCapex = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [capexTables, setCapexTables] = useState<CapexTable[]>([]);
  const [selectedCapexId, setSelectedCapexId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { meta, data } = await fetchLatestProjectFile();
        setProjectId(meta.project_id);
        const loadedProjectName = data.step1_projectDetails?.projectName ?? meta.project_name ?? "";
        setProjectName(loadedProjectName);
        const capexList = await fetchProjectCapexList(meta.project_id);

        if (!capexList.length) {
          const fallbackTable = {
            ...buildCapexTable(loadedProjectName ? `${loadedProjectName} - CAPEX 1` : "CAPEX 1", [createEmptyRow(1)]),
            isNew: true,
            isSaved: false,
          };
          setCapexTables([fallbackTable]);
          setSelectedCapexId(fallbackTable.id);
          return;
        }

        const loadedTables = await Promise.all(
          capexList.map(async (capexItem, index) => {
            try {
              const capexPayload = await readJsonFromUrl<unknown>(capexItem.capex_file_url);
              const rows = normalizeCapexRows(capexPayload);
              return {
                ...buildCapexTable(capexItem.capex_name || `CAPEX ${index + 1}`, rows.length ? rows : [createEmptyRow(1)]),
                capexId: capexItem.capex_id,
                capexFileUrl: capexItem.capex_file_url,
                isNew: false,
                isSaved: true,
              };
            } catch {
              return {
                ...buildCapexTable(capexItem.capex_name || `CAPEX ${index + 1}`, [createEmptyRow(1)]),
                capexId: capexItem.capex_id,
                capexFileUrl: capexItem.capex_file_url,
                isNew: false,
                isSaved: true,
              };
            }
          }),
        );

        const tablesWithMeta = loadedTables.map((table, index) => ({
          ...table,
          capexId: capexList[index]?.capex_id,
          capexFileUrl: capexList[index]?.capex_file_url,
          isNew: false,
          isSaved: true,
          rows: normalizeRows(table.rows.length ? table.rows : [createEmptyRow(1)]),
        }));

        setCapexTables(tablesWithMeta);
        setSelectedCapexId(tablesWithMeta[0]?.id ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load CAPEX data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const activeTable = useMemo(() => {
    const selectedTable = capexTables.find((table) => table.id === selectedCapexId);
    if (selectedTable) {
      return selectedTable;
    }

    return capexTables[0] ?? null;
  }, [capexTables, selectedCapexId]);

  const rows = activeTable?.rows ?? [];
  const hasRows = rows.length > 0;
  const totalCapex = activeTable?.totalCapex ?? 0;

  const updateActiveTableRows = (transform: (rows: CapexRow[]) => CapexRow[]) => {
    if (!activeTable) {
      return;
    }

    setCapexTables((previousTables) =>
      previousTables.map((table) => {
        if (table.id !== activeTable.id) {
          return table;
        }

        const nextRows = normalizeRows(transform(table.rows));

        return {
          ...table,
          rows: nextRows,
          totalCapex: nextRows.reduce((sum, row) => sum + row.amountInr, 0),
        };
      }),
    );
  };

  const updateRow = (index: number, field: keyof Omit<CapexRow, "sNo">, value: string | number) => {
    updateActiveTableRows((prevRows) => {
      const updated = [...prevRows];
      if (!updated[index]) {
        return prevRows;
      }

      if (field === "quantity" || field === "perUnitCostInr") {
        updated[index][field] = Number(value) || 0;
      } else {
        (updated[index][field] as string) = String(value);
      }

      return updated;
    });
  };

  const addRow = () => {
    updateActiveTableRows((prevRows) => [...prevRows, createEmptyRow(prevRows.length + 1)]);
  };

  const deleteRow = (index: number) => {
    updateActiveTableRows((prevRows) => prevRows.filter((_, i) => i !== index));
  };

  const createNewCapexTable = () => {
    const tableNumber = capexTables.length + 1;
    const newTable = {
      ...buildCapexTable(`CAPEX ${tableNumber}`, [createEmptyRow(1)]),
      isNew: true,
      isSaved: false,
    };
    setCapexTables((previousTables) => [...previousTables, newTable]);
    setSelectedCapexId(newTable.id);
  };

  const saveChanges = async () => {
    try {
      setIsSaving(true);
      if (!activeTable) {
        return;
      }

      if (activeTable.isNew) {
        if (!projectId) {
          throw new Error("Project ID not available for creating CAPEX.");
        }

        if (!activeTable.name.trim()) {
          throw new Error("CAPEX name is required.");
        }

        const response = (await createNewCapex({
          project_id: projectId,
          capex_name: activeTable.name.trim(),
          capex_json: buildCapexJson(rows),
        })) as { success?: boolean; project_id?: string; capex_id?: string };

        setCapexTables((previousTables) =>
          previousTables.map((table) =>
            table.id === activeTable.id
              ? {
                  ...table,
                  capexId: response.capex_id ?? table.capexId,
                  isNew: false,
                  isSaved: true,
                }
              : table,
          ),
        );
        return;
      }

      if (!activeTable.capexId) {
        throw new Error("CAPEX id missing for current table.");
      }

      await replaceExistingCapex({
        project_id: projectId,
        capex_id: activeTable.capexId,
        new_capex_json: buildCapexJson(rows),
      });

      setCapexTables((previousTables) =>
        previousTables.map((table) =>
          table.id === activeTable.id
            ? {
                ...table,
                isSaved: true,
              }
            : table,
        ),
      );
    } catch (err) {
      console.error("Error saving CAPEX changes:", err);
      setError(err instanceof Error ? err.message : "Failed to save CAPEX table");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="w-full space-y-4 px-0 sm:px-1 lg:px-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">CAPEX</h1>
          <p className="mt-1 text-sm text-slate-600">{projectName ? `Project: ${projectName}` : "Project CAPEX overview"}</p>
          {!loading && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                <Table2 className="h-4 w-4 text-slate-500" />
                <span>Selected CAPEX</span>
                <div className="relative">
                  <select
                    value={selectedCapexId ?? ""}
                    onChange={(event) => setSelectedCapexId(event.target.value || null)}
                    className="appearance-none rounded-xl border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    {capexTables.length === 0 ? (
                      <option value="">No CAPEX tables</option>
                    ) : (
                      capexTables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {activeTable && (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                  <span className="font-medium text-slate-500">CAPEX Name</span>
                  <input
                    value={activeTable.name}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      setCapexTables((previousTables) =>
                        previousTables.map((table) =>
                          table.id === activeTable.id
                            ? {
                                ...table,
                                name: nextName,
                              }
                            : table,
                        ),
                      );
                    }}
                    className="min-w-[220px] rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Enter CAPEX name"
                  />
                </div>
              )}

              <Button type="button" onClick={createNewCapexTable} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                <Plus className="h-4 w-4" />
                New CAPEX Table
              </Button>

              <Button
                type="button"
                onClick={saveChanges}
                disabled={isSaving || !activeTable}
                className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                {isSaving ? "Saving..." : activeTable?.isNew || !activeTable?.isSaved ? "Create CAPEX" : "Save Current"}
              </Button>
            </div>
          )}
          {loading && (
            <div className="mt-4 flex items-center gap-3">
              <div className="spinner"></div>
              <p className="text-sm text-slate-500">Loading CAPEX data...</p>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </div>

        {!loading && (
          <>
            {/* Total CAPEX Amount */}
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total CAPEX Amount</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{formatInr(totalCapex)}</p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-1">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full table-fixed text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                      <th className="w-[8%] px-4 py-3">S.no</th>
                      <th className="w-[24%] px-4 py-3">Item Name</th>
                      <th className="w-[18%] px-4 py-3">UOM</th>
                      <th className="w-[14%] px-4 py-3">Quantity</th>
                      <th className="w-[16%] px-4 py-3">Per Unit Cost (₹)</th>
                      <th className="w-[12%] px-4 py-3">Amount</th>
                      <th className="w-[8%] px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!hasRows ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No CAPEX line items found.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => (
                        <tr key={`capex-row-${index}`} className="border-t border-slate-100 align-top odd:bg-slate-50/60 even:bg-white transition hover:bg-emerald-50/50">
                          <td className="px-4 py-3 align-middle text-slate-700">{row.sNo}</td>
                          <td className="px-4 py-3">
                            <input
                              value={row.itemName}
                              onChange={(e) => updateRow(index, "itemName", e.target.value)}
                              placeholder="Enter item name"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={row.uom}
                              onChange={(e) => updateRow(index, "uom", e.target.value)}
                              placeholder="UOM"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.quantity}
                              onChange={(e) => updateRow(index, "quantity", e.target.value)}
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.perUnitCostInr}
                                onChange={(e) => updateRow(index, "perUnitCostInr", e.target.value)}
                                placeholder="0"
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{formatInr(row.amountInr)}</td>
                          <td className="px-4 py-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => deleteRow(index)}
                              disabled={rows.length === 1}
                              className="gap-2 border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm text-slate-600">Use Add Row to extend the CAPEX table.</div>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={addRow} className="gap-2 border-slate-300">
                    <Plus className="h-4 w-4" />
                    Add Row
                  </Button>
                  <div className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm">Total CAPEX: {formatInr(totalCapex)}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DirectorCapex;
