import { useEffect, useMemo, useState } from "react";
import {
  fetchLatestProjectFile,
  fetchProjectAmortizationList,
  fetchProjectCapexList,
  fetchProjectOpexList,
  formatInr,
  readJsonFromUrl,
} from "@/services/projectData";

import { Check, RotateCcw } from "lucide-react";

type CashFlowRow = {
  month: number;
  description: string;
  inflowInr: number;
  outflowInr: number;
  netInr: number;
  cumulativeInr: number;
};

type OpexBasis = "per-acre" | "per-750-acres" | "fixed-annual";
type CapexBasis = "per-acre" | "per-unit" | "fixed";

type ProjectLineItem = {
  sNo?: number;
  itemName?: string;
  quantity?: number;
  perUnitCostInr?: number;
  amountInr?: number;
};

type ProjectDefaults = {
  capexItems: ProjectLineItem[];
  capexOutflow: number;
  opexItems: ProjectLineItem[];
  totalOpex: number;
  cycleRevenueInr: number;
  cycleDurationMonths: number;
  cycleEmiObligationInr: number;
};

type CashFlowGridRow = {
  id: string;
  title: string;
  significance: string;
  values: number[];
  editable: boolean;
  saved: boolean;
  visible: boolean;
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

const toText = (value: unknown, fallback = "") => (typeof value === "string" && value.trim() ? value : fallback);

const normalizeLineItems = (payload: unknown): ProjectLineItem[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const typedPayload = payload as {
    lineItems?: unknown;
    step3_capex?: { lineItems?: unknown };
    step4_opex?: { lineItems?: unknown };
  };

  const rawItems =
    (Array.isArray(typedPayload.lineItems) && typedPayload.lineItems) ||
    (Array.isArray(typedPayload.step3_capex?.lineItems) && typedPayload.step3_capex.lineItems) ||
    (Array.isArray(typedPayload.step4_opex?.lineItems) && typedPayload.step4_opex.lineItems) ||
    [];

  return rawItems.map((item, index) => {
    const typedItem = item as Record<string, unknown>;
    const quantity = toNumber(typedItem.quantity ?? typedItem.item_quantity ?? typedItem.qty);
    const perUnitCostInr = toNumber(typedItem.perUnitCostInr ?? typedItem.per_unit_cost_inr ?? typedItem.per_unit_cost);
    const amountInr = toNumber(typedItem.amountInr ?? typedItem.amount ?? quantity * perUnitCostInr);

    return {
      sNo: toNumber(typedItem.sNo ?? typedItem.s_no ?? index + 1, index + 1),
      itemName: toText(typedItem.itemName ?? typedItem.item_name, `Line ${index + 1}`),
      quantity,
      perUnitCostInr,
      amountInr,
    };
  });
};

const deriveAmortizationMonthlyEmi = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return 0;
  }

  const typedPayload = payload as {
    ammortization_json?: unknown;
    amortization_json?: unknown;
    ammortization_config?: Record<string, unknown>;
    amortization_config?: Record<string, unknown>;
  };

  const amortizationJson = typedPayload.ammortization_json ?? typedPayload.amortization_json ?? payload;
  const config =
    (amortizationJson && typeof amortizationJson === "object"
      ? ((amortizationJson as { ammortization_config?: Record<string, unknown>; amortization_config?: Record<string, unknown> }).ammortization_config ??
        (amortizationJson as { ammortization_config?: Record<string, unknown>; amortization_config?: Record<string, unknown> }).amortization_config)
      : undefined) ??
    typedPayload.ammortization_config ??
    typedPayload.amortization_config ??
    {};

  return Object.values(config).reduce((total, bifurcation) => {
    if (!bifurcation || typeof bifurcation !== "object") {
      return total;
    }

    const sheet = (bifurcation as { sheet?: Record<string, unknown> }).sheet;
    if (!sheet || typeof sheet !== "object") {
      return total;
    }

    const firstEmiRow = Object.values(sheet).find((row) => row && typeof row === "object" && "emi" in row);
    return total + toNumber((firstEmiRow as { emi?: unknown } | undefined)?.emi);
  }, 0);
};

const deriveAmortizationYearCount = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return 1;
  }

  const typedPayload = payload as {
    ammortization_json?: unknown;
    amortization_json?: unknown;
    ammortization_config?: Record<string, unknown>;
    amortization_config?: Record<string, unknown>;
  };

  const amortizationJson = typedPayload.ammortization_json ?? typedPayload.amortization_json ?? payload;
  const config =
    (amortizationJson && typeof amortizationJson === "object"
      ? ((amortizationJson as { ammortization_config?: Record<string, unknown>; amortization_config?: Record<string, unknown> }).ammortization_config ??
        (amortizationJson as { ammortization_config?: Record<string, unknown>; amortization_config?: Record<string, unknown> }).amortization_config)
      : undefined) ??
    typedPayload.ammortization_config ??
    typedPayload.amortization_config ??
    {};

  const maxYear = Object.values(config).reduce((highest, bifurcation) => {
    if (!bifurcation || typeof bifurcation !== "object") {
      return highest;
    }

    const bifurcationConfig = (bifurcation as { config?: { repayment_year?: unknown } }).config;
    return Math.max(highest, toNumber(bifurcationConfig?.repayment_year, 0));
  }, 1);

  return Math.max(1, maxYear);
};

const createCashFlowGridRows = (
  yearCount: number,
  defaults: {
    grassProductionInr: number;
    capexInr: number;
    opexInr: number;
    amortizationInr: number;
  },
): CashFlowGridRow[] => {
  const safeYearCount = Math.max(1, yearCount);
  const spread = (value: number) => Array.from({ length: safeYearCount }, () => value);
  const grassProduction = safeYearCount > 0 ? defaults.grassProductionInr / safeYearCount : defaults.grassProductionInr;

  return [
    {
      id: "grass-production",
      title: "Grass Production",
      significance: "Base production revenue driver for the project.",
      values: spread(grassProduction),
      editable: true,
      saved: false,
      visible: true,
    },
    {
      id: "capex",
      title: "CAPEX",
      significance: "One-time capital outflow from the selected CAPEX record.",
      values: [defaults.capexInr, ...Array.from({ length: safeYearCount - 1 }, () => 0)],
      editable: true,
      saved: false,
      visible: false,
    },
    {
      id: "opex",
      title: "OPEX",
      significance: "Recurring operating cost from the selected OPEX record.",
      values: spread(defaults.opexInr),
      editable: true,
      saved: false,
      visible: false,
    },
    {
      id: "amortization",
      title: "Amortization",
      significance: "Repayment pressure derived from the selected amortization record.",
      values: spread(defaults.amortizationInr),
      editable: true,
      saved: false,
      visible: false,
    },
    {
      id: "net-cash-flow",
      title: "Net Cash Flow",
      significance: "Computed result after production, opex, capex, and amortization.",
      values: Array.from({ length: safeYearCount }, (_, index) => {
        const production = grassProduction;
        const capex = index === 0 ? defaults.capexInr : 0;
        const opex = defaults.opexInr;
        const amortization = defaults.amortizationInr;
        return production - capex - opex - amortization;
      }),
      editable: false,
      saved: true,
      visible: false,
    },
  ];
};

const DirectorCashFlow = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [rows, setRows] = useState<CashFlowRow[]>([]);
  const [projectDefaults, setProjectDefaults] = useState<ProjectDefaults | null>(null);
  const [capexRecords, setCapexRecords] = useState<ProjectCapexItem[]>([]);
  const [opexRecords, setOpexRecords] = useState<ProjectOpexItem[]>([]);
  const [amortizationRecords, setAmortizationRecords] = useState<ProjectAmortizationItem[]>([]);
  const [capexItems, setCapexItems] = useState<ProjectLineItem[]>([]);
  const [opexItems, setOpexItems] = useState<ProjectLineItem[]>([]);
  const [capexOutflow, setCapexOutflow] = useState(0);
  const [totalOpex, setTotalOpex] = useState(0);
  const [cycleRevenueInr, setCycleRevenueInr] = useState(0);
  const [cycleDurationMonths, setCycleDurationMonths] = useState(0);
  const [cycleEmiObligationInr, setCycleEmiObligationInr] = useState(0);
  const [selectedAmortizationMonthlyEmi, setSelectedAmortizationMonthlyEmi] = useState(0);
  const [selectedAmortizationYearCount, setSelectedAmortizationYearCount] = useState(1);
  const [cashFlowGridRows, setCashFlowGridRows] = useState<CashFlowGridRow[]>([]);
  const [selectedOpexItem, setSelectedOpexItem] = useState("");
  const [selectedCapexItem, setSelectedCapexItem] = useState("");
  const [selectedCapexRecordId, setSelectedCapexRecordId] = useState("");
  const [selectedOpexRecordId, setSelectedOpexRecordId] = useState("");
  const [selectedAmortizationRecordId, setSelectedAmortizationRecordId] = useState("");
  const [opexBasis, setOpexBasis] = useState<OpexBasis>("per-acre");
  const [capexBasis, setCapexBasis] = useState<CapexBasis>("per-unit");
  const [opexQuantity, setOpexQuantity] = useState(0);
  const [capexQuantity, setCapexQuantity] = useState(0);
  const [opexRateInr, setOpexRateInr] = useState(0);
  const [capexRateInr, setCapexRateInr] = useState(0);

  const restoreCapexDefaults = () => {
    if (!projectDefaults) {
      return;
    }

    setCapexItems(projectDefaults.capexItems);
    setCapexOutflow(projectDefaults.capexOutflow);
    setSelectedCapexItem(projectDefaults.capexItems[0]?.itemName ?? "");
    setCapexQuantity(projectDefaults.capexItems[0]?.quantity ?? 1);
    setCapexRateInr(projectDefaults.capexItems[0]?.perUnitCostInr ?? projectDefaults.capexOutflow);
  };

  const restoreOpexDefaults = () => {
    if (!projectDefaults) {
      return;
    }

    setOpexItems(projectDefaults.opexItems);
    setTotalOpex(projectDefaults.totalOpex);
    setSelectedOpexItem(projectDefaults.opexItems[0]?.itemName ?? "");
    setOpexQuantity(projectDefaults.opexItems[0]?.quantity ?? 1);
    setOpexRateInr(projectDefaults.opexItems[0]?.perUnitCostInr ?? projectDefaults.totalOpex);
  };

  const restoreAmortizationDefaults = () => {
    if (!projectDefaults) {
      return;
    }

    setCycleRevenueInr(projectDefaults.cycleRevenueInr);
    setCycleDurationMonths(projectDefaults.cycleDurationMonths);
    setCycleEmiObligationInr(projectDefaults.cycleEmiObligationInr);
    setSelectedAmortizationMonthlyEmi(0);
    setSelectedAmortizationYearCount(Math.max(1, Math.ceil(projectDefaults.cycleDurationMonths / 12) || 1));
  };

  const initializeCashflowGrid = (yearCount: number) => {
    setCashFlowGridRows(
      createCashFlowGridRows(yearCount, {
        grassProductionInr: cycleRevenueInr,
        capexInr: capexOutflow,
        opexInr: totalOpex,
        amortizationInr: selectedAmortizationMonthlyEmi > 0 ? selectedAmortizationMonthlyEmi * 12 : cycleEmiObligationInr,
      }),
    );
  };

  const updateGridRowValues = (rowId: string, updater: (values: number[]) => number[]) => {
    setCashFlowGridRows((previousRows) =>
      previousRows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        return {
          ...row,
          values: updater(row.values),
        };
      }),
    );
  };

  const saveGridRow = (rowId: string) => {
    setCashFlowGridRows((previousRows) => {
      const rowIndex = previousRows.findIndex((row) => row.id === rowId);
      if (rowIndex === -1) {
        return previousRows;
      }

      return previousRows.map((row, index) => {
        if (index === rowIndex) {
          return { ...row, saved: true };
        }

        if (index === rowIndex + 1) {
          return { ...row, visible: true };
        }

        return row;
      });
    });
  };

  const clearGridRow = (rowId: string) => {
    setCashFlowGridRows((previousRows) => {
      const rowIndex = previousRows.findIndex((row) => row.id === rowId);
      if (rowIndex === -1) {
        return previousRows;
      }

      const defaults = createCashFlowGridRows(selectedAmortizationYearCount, {
        grassProductionInr: cycleRevenueInr,
        capexInr: capexOutflow,
        opexInr: totalOpex,
        amortizationInr: selectedAmortizationMonthlyEmi > 0 ? selectedAmortizationMonthlyEmi * 12 : cycleEmiObligationInr,
      });

      return previousRows.map((row, index) => {
        if (index < rowIndex) {
          return row;
        }

        const defaultRow = defaults[index];
        if (!defaultRow) {
          return row;
        }

        return {
          ...defaultRow,
          visible: index === 0,
          saved: index === 0,
        };
      });
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { meta, data } = await fetchLatestProjectFile();
        setProjectId(meta.project_id);
        setProjectName(data.step1_projectDetails?.projectName ?? "");

        const loadedCapexItems = normalizeLineItems(data.step3_capex);
        const loadedOpexItems = normalizeLineItems(data.step4_opex);
        const loadedCapexOutflow = data.step3_capex?.totalCapexInr ?? loadedCapexItems.reduce((sum, item) => sum + item.amountInr, 0);
        const loadedOpexTotal = data.step4_opex?.totalOpexInr ?? loadedOpexItems.reduce((sum, item) => sum + item.amountInr, 0);
        const loadedCycleRevenue = data.step6_amortizationAndViability?.cycleRevenueInr ?? 0;
        const loadedCycleDuration = data.step6_amortizationAndViability?.cycleDurationMonths ?? 0;
        const loadedCycleEmi = data.step6_amortizationAndViability?.cycleEmiObligationInr ?? 0;

        setCapexItems(loadedCapexItems);
        setOpexItems(loadedOpexItems);
        setCapexOutflow(loadedCapexOutflow);
        setTotalOpex(loadedOpexTotal);
        setCycleRevenueInr(loadedCycleRevenue);
        setCycleDurationMonths(loadedCycleDuration);
        setCycleEmiObligationInr(loadedCycleEmi);
        setProjectDefaults({
          capexItems: loadedCapexItems,
          capexOutflow: loadedCapexOutflow,
          opexItems: loadedOpexItems,
          totalOpex: loadedOpexTotal,
          cycleRevenueInr: loadedCycleRevenue,
          cycleDurationMonths: loadedCycleDuration,
          cycleEmiObligationInr: loadedCycleEmi,
        });

        if (!meta.project_id) {
          return;
        }

        const [capexList, opexList, amortizationList] = await Promise.all([
          fetchProjectCapexList(meta.project_id),
          fetchProjectOpexList(meta.project_id),
          fetchProjectAmortizationList(meta.project_id),
        ]);

        setCapexRecords(capexList);
        setOpexRecords(opexList);
        setAmortizationRecords(amortizationList);

        setSelectedCapexRecordId(capexList[0]?.capex_id ?? "");
        setSelectedOpexRecordId(opexList[0]?.opex_id ?? "");
        setSelectedAmortizationRecordId(amortizationList[0]?.ammortization_id ?? "");

        setSelectedCapexItem(loadedCapexItems[0]?.itemName ?? "");
        setSelectedOpexItem(loadedOpexItems[0]?.itemName ?? "");
        setCapexQuantity(loadedCapexItems[0]?.quantity ?? 1);
        setCapexRateInr(loadedCapexItems[0]?.perUnitCostInr ?? data.step3_capex?.totalCapexInr ?? 0);
        setOpexQuantity(loadedOpexItems[0]?.quantity ?? 1);
        setOpexRateInr(loadedOpexItems[0]?.perUnitCostInr ?? data.step4_opex?.totalOpexInr ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load cash flow data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const loadSelectedCapex = async () => {
      if (!projectId) {
        return;
      }

      if (!selectedCapexRecordId) {
        restoreCapexDefaults();
        return;
      }

      const selectedRecord = capexRecords.find((record) => record.capex_id === selectedCapexRecordId);
      if (!selectedRecord) {
        return;
      }

      try {
        const payload = await readJsonFromUrl<unknown>(selectedRecord.capex_file_url);
        const normalizedItems = normalizeLineItems(payload);
        setCapexItems(normalizedItems);
        setCapexOutflow(normalizedItems.reduce((sum, item) => sum + item.amountInr, 0));
        setSelectedCapexItem(normalizedItems[0]?.itemName ?? "");
        setCapexQuantity(normalizedItems[0]?.quantity ?? 1);
        setCapexRateInr(normalizedItems[0]?.perUnitCostInr ?? normalizedItems[0]?.amountInr ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load selected CAPEX record");
      }
    };

    void loadSelectedCapex();
  }, [capexRecords, projectId, selectedCapexRecordId]);

  useEffect(() => {
    const loadSelectedOpex = async () => {
      if (!projectId) {
        return;
      }

      if (!selectedOpexRecordId) {
        restoreOpexDefaults();
        return;
      }

      const selectedRecord = opexRecords.find((record) => record.opex_id === selectedOpexRecordId);
      if (!selectedRecord) {
        return;
      }

      try {
        const payload = await readJsonFromUrl<unknown>(selectedRecord.opex_file_url);
        const normalizedItems = normalizeLineItems(payload);
        setOpexItems(normalizedItems);
        setTotalOpex(normalizedItems.reduce((sum, item) => sum + item.amountInr, 0));
        setSelectedOpexItem(normalizedItems[0]?.itemName ?? "");
        setOpexQuantity(normalizedItems[0]?.quantity ?? 1);
        setOpexRateInr(normalizedItems[0]?.perUnitCostInr ?? normalizedItems[0]?.amountInr ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load selected OPEX record");
      }
    };

    void loadSelectedOpex();
  }, [opexRecords, projectId, selectedOpexRecordId]);

  useEffect(() => {
    const loadSelectedAmortization = async () => {
      if (!projectId) {
        return;
      }

      if (!selectedAmortizationRecordId) {
        restoreAmortizationDefaults();
        return;
      }

      const selectedRecord = amortizationRecords.find((record) => record.ammortization_id === selectedAmortizationRecordId);
      if (!selectedRecord) {
        return;
      }

      try {
        const payload = await readJsonFromUrl<unknown>(selectedRecord.ammortization_file_url);
        const monthlyEmi = deriveAmortizationMonthlyEmi(payload);
        const yearCount = deriveAmortizationYearCount(payload);
        setSelectedAmortizationMonthlyEmi(monthlyEmi);
        setSelectedAmortizationYearCount(yearCount);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load selected amortization record");
      }
    };

    void loadSelectedAmortization();
  }, [amortizationRecords, projectId, selectedAmortizationRecordId]);

  const selectedCapexLine = useMemo(() => {
    return capexItems.find((row) => row.itemName === selectedCapexItem) ?? capexItems[0];
  }, [capexItems, selectedCapexItem]);

  const selectedOpexLine = useMemo(() => {
    return opexItems.find((row) => row.itemName === selectedOpexItem) ?? opexItems[0];
  }, [opexItems, selectedOpexItem]);

  const effectiveCapexOutflow = useMemo(() => {
    const quantity = capexQuantity > 0 ? capexQuantity : selectedCapexLine?.quantity ?? 0;
    const rate = capexRateInr > 0 ? capexRateInr : selectedCapexLine?.perUnitCostInr ?? 0;
    const fallbackAmount = selectedCapexLine?.amountInr ?? capexOutflow;

    if (capexBasis === "fixed") {
      return rate || fallbackAmount;
    }

    const calculated = quantity * rate;
    return calculated || fallbackAmount;
  }, [capexBasis, capexOutflow, capexQuantity, capexRateInr, selectedCapexLine]);

  const effectiveOpexAnnual = useMemo(() => {
    const quantity = opexQuantity > 0 ? opexQuantity : selectedOpexLine?.quantity ?? 0;
    const rate = opexRateInr > 0 ? opexRateInr : selectedOpexLine?.perUnitCostInr ?? 0;
    const fallbackAmount = selectedOpexLine?.amountInr ?? totalOpex;

    if (opexBasis === "fixed-annual") {
      return rate || fallbackAmount;
    }

    if (opexBasis === "per-750-acres") {
      const calculated = (quantity / 750) * rate;
      return calculated || fallbackAmount;
    }

    const calculated = quantity * rate;
    return calculated || fallbackAmount;
  }, [opexBasis, opexQuantity, opexRateInr, selectedOpexLine, totalOpex]);

  useEffect(() => {
    if (loading) {
      return;
    }

    initializeCashflowGrid(selectedAmortizationYearCount);
  }, [capexOutflow, cycleEmiObligationInr, cycleRevenueInr, loading, selectedAmortizationMonthlyEmi, selectedAmortizationYearCount, totalOpex]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const months = Math.max(cycleDurationMonths, 12);
    const monthlyRevenue = months > 0 ? cycleRevenueInr / months : cycleRevenueInr;
    const monthlyOpex = months > 0 ? effectiveOpexAnnual / months : effectiveOpexAnnual;
    const monthlyEmi = selectedAmortizationMonthlyEmi > 0 ? selectedAmortizationMonthlyEmi : months > 0 ? cycleEmiObligationInr / months : cycleEmiObligationInr;

    const derivedRows: CashFlowRow[] = [];
    let cumulative = -effectiveCapexOutflow;

    derivedRows.push({
      month: 0,
      description: "Initial CAPEX investment",
      inflowInr: 0,
      outflowInr: effectiveCapexOutflow,
      netInr: -effectiveCapexOutflow,
      cumulativeInr: cumulative,
    });

    for (let month = 1; month <= months; month += 1) {
      const inflowInr = monthlyRevenue;
      const outflowInr = monthlyOpex + monthlyEmi;
      const netInr = inflowInr - outflowInr;
      cumulative += netInr;

      derivedRows.push({
        month,
        description: month === 1 ? "Operating month" : "Recurring operating month",
        inflowInr,
        outflowInr,
        netInr,
        cumulativeInr: cumulative,
      });
    }

    setRows(derivedRows);
  }, [cycleDurationMonths, cycleEmiObligationInr, cycleRevenueInr, effectiveCapexOutflow, effectiveOpexAnnual, loading, selectedAmortizationMonthlyEmi]);

  const totals = useMemo(() => {
    const operatingRows = rows.filter((row) => row.month > 0);
    const net = rows.reduce((sum, row) => sum + row.netInr, 0);
    const totalInflow = operatingRows.reduce((sum, row) => sum + row.inflowInr, 0);
    const totalOutflow = operatingRows.reduce((sum, row) => sum + row.outflowInr, 0) + effectiveCapexOutflow;
    const endingBalance = rows.length ? rows[rows.length - 1].cumulativeInr : 0;
    const breakEvenMonth = rows.find((row) => row.month > 0 && row.cumulativeInr >= 0)?.month ?? null;
    const worstCumulative = rows.reduce((lowest, row) => Math.min(lowest, row.cumulativeInr), 0);

    return { net, totalInflow, totalOutflow, endingBalance, breakEvenMonth, worstCumulative };
  }, [rows, effectiveCapexOutflow]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="w-full space-y-4 px-0 sm:px-1 lg:px-2">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">Budget Module</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Cash Flow</h1>
              <p className="mt-1 text-sm text-slate-600">{projectName ? `Project: ${projectName}` : "Derived cash flow overview"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Flow Chain</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">CAPEX → OPEX → Cash Flow → Amortization</p>
            </div>
          </div>
          {loading && (
            <div className="mt-4 flex items-center gap-3">
              <div className="spinner"></div>
              <p className="text-sm text-slate-500">Loading cash flow data...</p>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </div>

        {!loading && (
          <>
            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Saved Sources</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Choose saved CAPEX, OPEX, and amortization records</h2>
                  <p className="mt-1 text-sm text-slate-600">These selectors load the saved module tables into the cash flow model.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                <label className="space-y-2 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">CAPEX Record</span>
                  <select
                    value={selectedCapexRecordId}
                    onChange={(event) => setSelectedCapexRecordId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">Use project default</option>
                    {capexRecords.map((record) => (
                      <option key={record.capex_id} value={record.capex_id}>
                        {record.capex_name}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-slate-600">
                    {selectedCapexRecordId
                      ? capexRecords.find((record) => record.capex_id === selectedCapexRecordId)?.capex_name ?? "Selected CAPEX"
                      : "Project default CAPEX"}
                  </div>
                </label>

                <label className="space-y-2 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-700">OPEX Record</span>
                  <select
                    value={selectedOpexRecordId}
                    onChange={(event) => setSelectedOpexRecordId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  >
                    <option value="">Use project default</option>
                    {opexRecords.map((record) => (
                      <option key={record.opex_id} value={record.opex_id}>
                        {record.opex_name}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-slate-600">
                    {selectedOpexRecordId
                      ? opexRecords.find((record) => record.opex_id === selectedOpexRecordId)?.opex_name ?? "Selected OPEX"
                      : "Project default OPEX"}
                  </div>
                </label>

                <label className="space-y-2 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wide text-blue-700">Amortization Record</span>
                  <select
                    value={selectedAmortizationRecordId}
                    onChange={(event) => setSelectedAmortizationRecordId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Use project default</option>
                    {amortizationRecords.map((record) => (
                      <option key={record.ammortization_id} value={record.ammortization_id}>
                        {record.ammortization_name}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-slate-600">
                    {selectedAmortizationRecordId
                      ? amortizationRecords.find((record) => record.ammortization_id === selectedAmortizationRecordId)?.ammortization_name ?? "Selected amortization"
                      : "Project default amortization"}
                  </div>
                </label>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Net Cash Flow</p>
                <p className={`mt-2 text-xl font-bold ${totals.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatInr(totals.net)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ending Balance</p>
                <p className={`mt-2 text-xl font-bold ${totals.endingBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatInr(totals.endingBalance)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Break-even</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{totals.breakEvenMonth ? `Month ${totals.breakEvenMonth}` : "Not reached"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Worst Dip</p>
                <p className="mt-2 text-xl font-bold text-rose-700">{formatInr(totals.worstCumulative)}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[900px] table-fixed text-sm">
                <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                    <th className="w-[22%] px-4 py-3">Particulars</th>
                    {Array.from({ length: selectedAmortizationYearCount }, (_, index) => (
                      <th key={`year-header-${index}`} className="px-4 py-3 text-center">
                        Year {index + 1}
                      </th>
                    ))}
                    <th className="w-[16%] px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlowGridRows.filter((row) => row.visible).map((row) => (
                    <tr key={row.id} className={`border-t border-slate-100 transition ${row.saved ? "bg-emerald-50/40" : "odd:bg-slate-50/60 even:bg-white"}`}>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-900">{row.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.significance}</div>
                      </td>
                      {row.values.map((value, yearIndex) => (
                        <td key={`${row.id}-${yearIndex}`} className="px-3 py-3 align-top">
                          {row.editable ? (
                            <input
                              type="number"
                              step="any"
                              value={value}
                              onChange={(event) =>
                                updateGridRowValues(row.id, (currentValues) =>
                                  currentValues.map((currentValue, currentIndex) =>
                                    currentIndex === yearIndex ? Number(event.target.value) || 0 : currentValue,
                                  ),
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            />
                          ) : (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center font-semibold text-slate-900">
                              {formatInr(value)}
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 align-top">
                        {row.editable ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => saveGridRow(row.id)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >
                              <Check size={14} />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => clearGridRow(row.id)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <RotateCcw size={14} />
                              Clear
                            </button>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Locked Summary
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Rows unlock one by one after save. Year columns follow the maximum repayment year from the selected amortization.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DirectorCashFlow;