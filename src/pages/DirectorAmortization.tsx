import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Trash2, Download, Plus, ChevronDown, Table2 } from "lucide-react";
import {
  fetchLatestProjectFile,
  formatInr,
  fetchProjectCapexList,
  fetchProjectAmortizationList,
  createNewAmmortization,
  replaceExistingAmmortization,
  readJsonFromUrl,
  ProjectCapexItem,
  ProjectAmortizationItem,
} from "@/services/projectData";
import "@xyflow/react/dist/style.css";
import "./DirectorAmortization.css";

type CapexItem = {
  capexKey: string;
  sourceItemKey: string;
  sNo: number;
  itemName: string;
  uom: string;
  quantity: number;
  perUnitCostInr: number;
  amountInr: number;
};

type AmortizationConfigRow = {
  bifurcationName: string;
  selectedCapexKeys: string[];
  lineItemKeys?: string[];
  assetCostInr: number;
  amortizationYears: number;
  interestRatePct: number;
  moratoriumMonths: number;
};

type AmortizationSheetNodeData = {
  sourceBifurcationId: string;
  bifurcationName: string;
  selectedCapexKeys: string[];
  lineItemKeys?: string[];
  sheetTotalInr: number;
  amortizationYears: number;
  interestRatePct: number;
  moratoriumMonths: number;
};

type AmortizationRow = {
  month: number;
  year: number;
  monthLabel: string;
  openingBalanceInr: number;
  interestInr: number;
  principalInr: number;
  emiInr: number;
  closingBalanceInr: number;
};

type RootNodeData = {
  title: string;
  subtitle: string;
};

type BifurcationNodeData = AmortizationConfigRow;

type AmortizationRecord = {
  id: string;
  name: string;
  capexId?: string;
  capexName?: string;
  fileUrl?: string;
  isNew?: boolean;
  isSaved?: boolean;
};

type AmortizationConfigSummary = {
  config: {
    bifurcation_name: string;
    rate_of_intrest: number;
    repayment_year: number;
    selected_capex_keys: string[];
    asset_cost_inr: number;
    line_item: string[];
  };
  sheet: Record<string, {
    opening_balance: number;
    intrest: number;
    principal_payment: number;
    emi: number;
    closing_balance: number;
  }>;
};

const buildAmortizationSchedule = (
  loanAmount: number,
  annualRate: number,
  moratoriumMonths: number,
  totalTenureMonths: number,
) => {
  if (loanAmount <= 0) {
    return [] as AmortizationRow[];
  }

  const monthlyRate = annualRate / 12 / 100;
  const repayMonths = Math.max(1, totalTenureMonths - moratoriumMonths);
  const principalAfterMoratorium = monthlyRate === 0
    ? loanAmount
    : loanAmount * Math.pow(1 + monthlyRate, moratoriumMonths);
  const emi = monthlyRate === 0
    ? principalAfterMoratorium / repayMonths
    : (principalAfterMoratorium * monthlyRate * Math.pow(1 + monthlyRate, repayMonths)) / (Math.pow(1 + monthlyRate, repayMonths) - 1);

  const rows: AmortizationRow[] = [];
  let openingBalance = loanAmount;

  for (let month = 1; month <= totalTenureMonths; month += 1) {
    const year = Math.ceil(month / 12);
    const monthLabel = `M-${month}`;
    const interest = openingBalance * monthlyRate;
    let principal = 0;
    let emiValue = 0;

    if (month <= moratoriumMonths) {
      emiValue = monthlyRate === 0 ? 0 : interest;
    } else {
      emiValue = emi;
      principal = Math.max(0, emiValue - interest);
    }

    const closingBalance = Math.max(0, openingBalance - principal);

    rows.push({
      month,
      year,
      monthLabel,
      openingBalanceInr: openingBalance,
      interestInr: interest,
      principalInr: principal,
      emiInr: emiValue,
      closingBalanceInr: closingBalance,
    });

    openingBalance = closingBalance;
  }

  return rows;
};

const normalizeSavedAmortizationPayload = (payload: unknown) => {
  const typedPayload = payload as {
    ammortization_json?: unknown;
    amortization_json?: unknown;
    capex_config?: {
      capex_id?: string;
      capex_name?: string;
      total_amount?: number;
    };
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

  const capexConfig =
    (amortizationJson && typeof amortizationJson === "object"
      ? (amortizationJson as { capex_config?: typeof typedPayload.capex_config }).capex_config
      : undefined) ??
    typedPayload.capex_config;

  return { capexConfig, config };
};

type GraphContextValue = {
  capexItems: CapexItem[];
  capexTotal: number;
  usedCapexKeys: Set<string>;
  projectCapexList: ProjectCapexItem[];
  selectedProjectCapexId: string | null;
  loadCapexById: (capexId: string | null) => Promise<void>;
  updateNodeData: (id: string, patch: Partial<BifurcationNodeData>) => void;
  toggleCapexItem: (id: string, capexKey: string) => void;
  removeCapexItem: (id: string, capexKey: string) => void;
  createAmortizationSheetNode: (id: string) => void;
  removeNode: (id: string) => void;
};

const GraphContext = createContext<GraphContextValue | null>(null);

const useGraphContext = () => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error("Graph context is missing");
  }
  return context;
};

const rootNodeStyle = {
  width: 360,
  borderRadius: 24,
  border: "1px solid rgb(226 232 240)",
  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 45%, #ecfeff 100%)",
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
};

const bifurcationNodeStyle = {
  width: 360,
  borderRadius: 24,
  border: "1px solid rgb(226 232 240)",
  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
};

const amortizationSheetNodeStyle = {
  width: 1180,
  borderRadius: 24,
  border: "1px solid rgb(191 219 254)",
  background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 45%, #f8fafc 100%)",
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
};

const getLineItemKey = (sourceItemKey: string | undefined, capexKey: string, index: number) => {
  return sourceItemKey || capexKey || `item_${index + 1}`;
};
const CapexRootNode = (_props: any) => {
  const { capexTotal, capexItems, projectCapexList, selectedProjectCapexId, loadCapexById } = useGraphContext();

  return (
    <div style={rootNodeStyle} className="overflow-hidden">
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-slate-900 !bg-emerald-500" />
      <div className="border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-300">Header Node</p>
        <h2 className="mt-1 text-lg font-semibold">Total CAPEX</h2>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total amount</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatInr(capexTotal)}</p>
        </div>
        <p className="text-sm text-slate-600">
          Drag from the bottom handle to create a CAPEX bifurcation node.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
          {projectCapexList.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Saved CAPEX</div>
                  <div className="text-sm font-semibold text-slate-900">{projectCapexList.length} table{projectCapexList.length === 1 ? "" : "s"}</div>
                  <div className="text-xs text-slate-500">{capexItems.length > 0 ? `${capexItems.length} line item${capexItems.length === 1 ? "" : "s"} loaded` : "No CAPEX items loaded"}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <select
                    value={selectedProjectCapexId ?? ""}
                    onChange={(e) => void loadCapexById(e.target.value || null)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none"
                  >
                    <option value="">Select CAPEX</option>
                    {projectCapexList.map((c) => (
                      <option key={c.capex_id} value={c.capex_id}>
                        {c.capex_name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => void loadCapexById(selectedProjectCapexId)}
                  className="whitespace-nowrap rounded-2xl border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Load
                </button>
              </div>
            </div>
          ) : (
            <div>{capexItems.length > 0 ? `${capexItems.length} CAPEX line item${capexItems.length === 1 ? "" : "s"} available` : "No CAPEX items loaded"}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const BifurcationNode = ({ id, data }: any) => {
  const { capexItems, usedCapexKeys, updateNodeData, toggleCapexItem, removeCapexItem, createAmortizationSheetNode, removeNode } = useGraphContext();
  const selectedItems = capexItems.filter((item) => (data.selectedCapexKeys ?? []).includes(item.capexKey));
  const selectedTotal = selectedItems.reduce((sum: number, item: CapexItem) => sum + item.amountInr, 0);

  return (
    <div style={bifurcationNodeStyle} className="overflow-hidden">
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-slate-900 !bg-slate-300" />
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Capex bifurcation</p>
          <input
            value={data.bifurcationName}
            onChange={(event) => updateNodeData(id, { bifurcationName: event.target.value })}
            placeholder="Editable bifurcation name"
            className="mt-1 w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
        <button
          type="button"
          onClick={() => removeNode(id)}
          className="rounded-full border border-rose-200 bg-white p-2 text-rose-700 transition hover:bg-rose-50"
          aria-label="Delete bifurcation"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Line item selector</p>
          {capexItems.length > 0 ? (
            <select
              value=""
              onChange={(event) => {
                const selectedKey = event.target.value;
                if (!selectedKey) {
                  return;
                }

                toggleCapexItem(id, selectedKey);
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Add a CAPEX line item</option>
              {capexItems.map((item) => {
                const isSelected = (data.selectedCapexKeys ?? []).includes(item.capexKey);
                const isDisabled = usedCapexKeys.has(item.capexKey) && !isSelected;

                return (
                  <option key={item.capexKey} value={item.capexKey} disabled={isDisabled}>
                    {item.itemName}
                  </option>
                );
              })}
            </select>
          ) : (
            <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              No CAPEX line items available.
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-500">Use the dropdown to add multiple line items as tags inside the same bifurcation.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bifurcation total</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatInr(selectedTotal ?? data.assetCostInr ?? 0)}</p>
          <p className="mt-1 text-xs text-slate-500">Automatically pulled from the selected CAPEX line item.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <span key={item.capexKey} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {item.itemName}
                  <button
                    type="button"
                    onClick={() => removeCapexItem(id, item.capexKey)}
                    className="rounded-full px-1 text-emerald-700 transition hover:bg-emerald-100"
                    aria-label={`Remove ${item.itemName}`}
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className="rounded-full border border-dashed border-slate-300 bg-white px-3 py-1 text-xs text-slate-500">
                No tag selected yet
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">rate of interest (%)</span>
            <input
              type="number"
              min="0"
              step="any"
              value={data.interestRatePct}
              onChange={(event) => updateNodeData(id, { interestRatePct: Number(event.target.value) || 0 })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Debt repayment years</span>
            <input
              type="number"
              min="1"
              step="1"
              value={data.amortizationYears}
              onChange={(event) => updateNodeData(id, { amortizationYears: Number(event.target.value) || 1 })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Moratorium years</span>
            <input
              type="number"
              min="0"
              step="1"
              value={data.moratoriumMonths}
              onChange={(event) => updateNodeData(id, { moratoriumMonths: Number(event.target.value) || 0 })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-3">
            <span>{selectedItems.length > 0 ? `${selectedItems.length} line item${selectedItems.length === 1 ? "" : "s"}` : "Select CAPEX line items"}</span>
            <span className="font-semibold text-slate-900">{formatInr(selectedTotal)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => createAmortizationSheetNode(id)}
          className="w-full rounded-2xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Create Amortization Sheet
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-slate-900 !bg-emerald-500" />
    </div>
  );
};

const AmortizationSheetNode = ({ id, data }: any) => {
  const { capexItems, removeNode } = useGraphContext();
  const selectedItems = capexItems.filter((item) => (data.selectedCapexKeys ?? []).includes(item.capexKey));
  const selectedTotal = selectedItems.reduce((sum: number, item: CapexItem) => sum + item.amountInr, 0);
  const loanAmount = data.sheetTotalInr || selectedTotal;
  const annualRate = Number(data.interestRatePct) || 0;
  const moratoriumMonths = Number(data.moratoriumMonths) || 0;
  const totalTenureMonths = Math.max(1, (Number(data.amortizationYears) || 1) * 12);

  const schedule = useMemo(() => {
    if (loanAmount <= 0) {
      return [] as AmortizationRow[];
    }

    const monthlyRate = annualRate / 12 / 100;
    const repayMonths = Math.max(1, totalTenureMonths - moratoriumMonths);
    const principalAfterMoratorium = monthlyRate === 0
      ? loanAmount
      : loanAmount * Math.pow(1 + monthlyRate, moratoriumMonths);
    const emi = monthlyRate === 0
      ? principalAfterMoratorium / repayMonths
      : (principalAfterMoratorium * monthlyRate * Math.pow(1 + monthlyRate, repayMonths)) / (Math.pow(1 + monthlyRate, repayMonths) - 1);

    const rows: AmortizationRow[] = [];
    let openingBalance = loanAmount;

    for (let month = 1; month <= totalTenureMonths; month += 1) {
      const year = Math.ceil(month / 12);
      const monthLabel = `M-${month}`;
      const interest = openingBalance * monthlyRate;
      let principal = 0;
      let emiValue = 0;

      if (month <= moratoriumMonths) {
        emiValue = monthlyRate === 0 ? 0 : interest;
      } else {
        emiValue = emi;
        principal = Math.max(0, emiValue - interest);
      }

      const closingBalance = Math.max(0, openingBalance - principal);

      rows.push({
        month,
        year,
        monthLabel,
        openingBalanceInr: openingBalance,
        interestInr: interest,
        principalInr: principal,
        emiInr: emiValue,
        closingBalanceInr: closingBalance,
      });

      openingBalance = closingBalance;
    }

    return rows;
  }, [annualRate, loanAmount, moratoriumMonths, totalTenureMonths]);

  const yearlyRows = useMemo(() => {
    const groups = new Map<number, AmortizationRow[]>();

    schedule.forEach((row) => {
      const groupRows = groups.get(row.year) ?? [];
      groupRows.push(row);
      groups.set(row.year, groupRows);
    });

    return Array.from(groups.entries()).map(([year, rows]) => {
      const lastRow = rows[rows.length - 1];
      return {
        year,
        rows,
        principalTotalInr: rows.reduce((sum, row) => sum + row.principalInr, 0),
        interestTotalInr: rows.reduce((sum, row) => sum + row.interestInr, 0),
        emiTotalInr: rows.reduce((sum, row) => sum + row.emiInr, 0),
        openingBalanceInr: rows[0]?.openingBalanceInr ?? 0,
        closingBalanceInr: lastRow?.closingBalanceInr ?? 0,
      };
    });
  }, [schedule]);

  return (
    <div style={amortizationSheetNodeStyle} className="overflow-hidden">
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-blue-900 !bg-blue-400" />
      <div className="border-b border-blue-200 bg-blue-950 px-4 py-3 text-white flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-200">Amortization sheet</p>
          <h3 className="mt-1 text-lg font-semibold">{data.bifurcationName || "Untitled bifurcation"}</h3>
          <p className="mt-1 text-xs text-blue-100">Linked to bifurcation node {data.sourceBifurcationId}</p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => removeNode(id)}
            className="rounded-full border border-rose-200 bg-white p-2 text-rose-700 transition hover:bg-rose-50"
            aria-label="Delete amortization sheet"
            title="Delete amortization sheet"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-blue-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Loan amount</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{formatInr(loanAmount)}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Term</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{data.amortizationYears} years</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interest rate</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{annualRate}%</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Moratorium</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{moratoriumMonths} months</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected CAPEX</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{formatInr(selectedTotal)}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{selectedItems.length}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Line items in this sheet</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <span key={item.capexKey} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {item.itemName}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                No line items selected
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900">
          This sheet shows the loan balance, monthly repayment, principal, and interest split over time.
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1140px] w-full border-collapse text-sm">
              <thead className="bg-slate-900 text-white">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                  <th className="px-3 py-3">Year</th>
                  <th className="px-3 py-3">Month</th>
                  <th className="px-3 py-3">Opening Balance</th>
                  <th className="px-3 py-3">Interest</th>
                  <th className="px-3 py-3">Principal Repayment</th>
                  <th className="px-3 py-3">EMI</th>
                  <th className="px-3 py-3">Closing Balance</th>
                  <th className="px-3 py-3">Yearly Principal Total</th>
                  <th className="px-3 py-3">Yearly Interest Total</th>
                  <th className="px-3 py-3">Total EMI</th>
                </tr>
              </thead>
              <tbody>
                {yearlyRows.length > 0 ? (
                  yearlyRows.map((group) => (
                    <>
                      {group.rows.map((row, index) => (
                        <tr key={`${group.year}-${row.month}`} className="border-t border-slate-200 odd:bg-white even:bg-slate-50/70">
                          <td className="px-3 py-2 font-semibold text-slate-700">{index === 0 ? group.year : ""}</td>
                          <td className="px-3 py-2 font-medium text-slate-700">{row.monthLabel}</td>
                          <td className="px-3 py-2">{formatInr(row.openingBalanceInr)}</td>
                          <td className="px-3 py-2">{formatInr(row.interestInr)}</td>
                          <td className="px-3 py-2">{formatInr(row.principalInr)}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{formatInr(row.emiInr)}</td>
                          <td className="px-3 py-2 font-semibold text-emerald-700">{formatInr(row.closingBalanceInr)}</td>
                          <td className="px-3 py-2">{index === group.rows.length - 1 ? formatInr(group.principalTotalInr) : ""}</td>
                          <td className="px-3 py-2">{index === group.rows.length - 1 ? formatInr(group.interestTotalInr) : ""}</td>
                          <td className="px-3 py-2">{index === group.rows.length - 1 ? formatInr(group.emiTotalInr) : ""}</td>
                        </tr>
                      ))}
                    </>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      No amortization rows available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const nodeTypes: any = {
  capexRoot: CapexRootNode,
  bifurcation: BifurcationNode,
  amortizationSheet: AmortizationSheetNode,
};

const edgeStyle = {
  stroke: "#94a3b8",
  strokeWidth: 2,
  strokeDasharray: "6 6",
};

const initialNodes: Node<RootNodeData | BifurcationNodeData | AmortizationSheetNodeData>[] = [
  {
    id: "capex-root",
    type: "capexRoot",
    position: { x: 360, y: 40 },
    draggable: false,
    data: {
      title: "Total CAPEX",
      subtitle: "Drag from the handle to create bifurcations",
    },
  },
];

const initialEdges = [];

const DirectorAmortizationCanvas = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [capexItems, setCapexItems] = useState<CapexItem[]>([]);
  const [projectCapexList, setProjectCapexList] = useState<ProjectCapexItem[]>([]);
  const [selectedProjectCapexId, setSelectedProjectCapexId] = useState<string | null>(null);
  const [amortizationRecords, setAmortizationRecords] = useState<AmortizationRecord[]>([]);
  const [selectedAmortizationId, setSelectedAmortizationId] = useState<string | null>(null);
  const [selectedAmortizationName, setSelectedAmortizationName] = useState("Amortization 1");
  const [isSaving, setIsSaving] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { meta, data } = await fetchLatestProjectFile();
        setProjectName(data.step1_projectDetails?.projectName ?? "");
        if (meta?.project_id) {
          setProjectId(meta.project_id);
        }

        const loadedCapexItems = (data.step3_capex?.lineItems ?? []).map((item, index) => ({
          capexKey: `capex-${index + 1}`,
          sourceItemKey: `item_${index + 1}`,
          sNo: item.sNo ?? index + 1,
          itemName: item.itemName ?? `CAPEX ${index + 1}`,
          uom: item.uom ?? "-",
          quantity: item.quantity ?? 0,
          perUnitCostInr: item.perUnitCostInr ?? 0,
          amountInr: item.amountInr ?? 0,
        }));

        setCapexItems(loadedCapexItems);

        // fetch saved CAPEX tables for this project and preselect first
        try {
          const effectiveProjectId = meta?.project_id ?? projectId ?? null;
          if (effectiveProjectId) {
            const capexList = await fetchProjectCapexList(effectiveProjectId);
            setProjectCapexList(capexList);
            if (capexList.length > 0) {
              const firstId = capexList[0].capex_id;
              setSelectedProjectCapexId(firstId);
            }
          }
        } catch (err) {
          console.warn("Unable to fetch saved capex list:", err);
        }

        // fetch saved amortization records for the project
        try {
          const effectiveProjectId = meta?.project_id ?? projectId ?? null;
          if (effectiveProjectId) {
            const amortizationList = await fetchProjectAmortizationList(effectiveProjectId);
            const loadedRecords = amortizationList.map((item, index) => ({
              id: item.ammortization_id,
              name: item.ammortization_name || `Amortization ${index + 1}`,
              capexId: item.capex_id,
              capexName: item.capex_name,
              fileUrl: item.ammortization_file_url,
              isNew: false,
              isSaved: true,
            }));

            if (loadedRecords.length > 0) {
              setAmortizationRecords(loadedRecords);
              setSelectedAmortizationId(loadedRecords[0].id);
              setSelectedAmortizationName(loadedRecords[0].name);
            } else {
              const newRecord: AmortizationRecord = {
                id: `ammortization-${Date.now()}`,
                name: "Amortization 1",
                capexId: undefined,
                capexName: undefined,
                isNew: true,
                isSaved: false,
              };
              setAmortizationRecords([newRecord]);
              setSelectedAmortizationId(newRecord.id);
              setSelectedAmortizationName(newRecord.name);
            }
          }
        } catch (err) {
          console.warn("Unable to fetch saved amortization list:", err);
          const fallbackRecord: AmortizationRecord = {
            id: `ammortization-${Date.now()}`,
            name: "Amortization 1",
            isNew: true,
            isSaved: false,
          };
          setAmortizationRecords([fallbackRecord]);
          setSelectedAmortizationId(fallbackRecord.id);
          setSelectedAmortizationName(fallbackRecord.name);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load amortization data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (selectedProjectCapexId) {
      void loadCapexById(selectedProjectCapexId);
    }
  }, [selectedProjectCapexId]);

  const capexTotal = useMemo(() => capexItems.reduce((sum, item) => sum + item.amountInr, 0), [capexItems]);
  const usedCapexKeys = useMemo(() => {
    const selectedKeys = nodes
      .filter((node) => node.type === "bifurcation")
      .flatMap((node) => (node.data as BifurcationNodeData | undefined)?.selectedCapexKeys ?? [])
      .filter((key): key is string => Boolean(key));
    return new Set(selectedKeys);
  }, [nodes]);

  const normalizeCapexRows = (payload: unknown): CapexItem[] => {
    const rawRows = Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object"
      ? (() => {
          const typedPayload = payload as { lineItems?: unknown; step3_capex?: { lineItems?: unknown }; [key: string]: unknown };

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
      const itemName = typeof row.itemName === "string" ? row.itemName : typeof row.item_name === "string" ? row.item_name : `CAPEX ${index + 1}`;
      const uom = typeof row.uom === "string" ? row.uom : typeof row.item_UOM === "string" ? row.item_UOM : "-";
      const quantity = typeof row.quantity === "number" ? row.quantity : typeof row.item_quanity === "number" ? row.item_quanity : 0;
      const perUnitCostInr = typeof row.perUnitCostInr === "number" ? row.perUnitCostInr : typeof row.item_per_unit_cost === "number" ? row.item_per_unit_cost : 0;
      const amountInr = typeof row.amountInr === "number" ? row.amountInr : typeof row.amount === "number" ? row.amount : quantity * perUnitCostInr;
      const sourceItemKey = typeof row.sourceItemKey === "string"
        ? row.sourceItemKey
        : typeof row.itemKey === "string"
          ? row.itemKey
          : typeof row.key === "string"
            ? row.key
            : `item_${index + 1}`;

      return {
        capexKey: `capex-${index + 1}`,
        sourceItemKey,
        sNo: typeof row.sNo === "number" ? row.sNo : index + 1,
        itemName,
        uom,
        quantity,
        perUnitCostInr,
        amountInr,
      } as CapexItem;
    });
  };

  const loadCapexById = async (capexId: string | null) => {
    if (!capexId) return;
    try {
      setLoading(true);
      const capexEntry = projectCapexList.find((c) => c.capex_id === capexId);
      if (!capexEntry) return;
      const payload = await readJsonFromUrl<unknown>(capexEntry.capex_file_url);
      const rows = normalizeCapexRows(payload);
      setCapexItems(rows);
      setSelectedProjectCapexId(capexId);
    } catch (err) {
      console.error("Failed to load selected CAPEX", err);
      setError(err instanceof Error ? err.message : "Failed to load selected CAPEX");
    } finally {
      setLoading(false);
    }
  };
  const updateNodeData = useCallback((id: string, patch: Partial<BifurcationNodeData>) => {
    setNodes((previousNodes) =>
      previousNodes.map((node) =>
        node.id === id ? { ...node, data: { ...(node.data as BifurcationNodeData), ...patch } } : node,
      ),
    );
  }, [setNodes]);

  const toggleCapexItem = useCallback((id: string, capexKey: string) => {
    const item = capexItems.find((entry) => entry.capexKey === capexKey);
    if (!item) {
      return;
    }

    setNodes((previousNodes) =>
      previousNodes.map((node) => {
        if (node.id !== id) {
          return node;
        }

        const currentKeys = (node.data as BifurcationNodeData).selectedCapexKeys ?? [];
        const nextKeys = currentKeys.includes(capexKey)
          ? currentKeys.filter((key) => key !== capexKey)
          : [...currentKeys, capexKey];
        const nextTotal = nextKeys.reduce(
          (sum, key) => sum + (capexItems.find((entry) => entry.capexKey === key)?.amountInr ?? 0),
          0,
        );
        return {
          ...node,
          data: {
            ...(node.data as BifurcationNodeData),
            selectedCapexKeys: nextKeys,
            assetCostInr: nextTotal,
          },
        };
      }),
    );
  }, [capexItems, setNodes]);

  const removeCapexItem = useCallback((id: string, capexKey: string) => {
    setNodes((previousNodes) =>
      previousNodes.map((node) => {
        if (node.id !== id) {
          return node;
        }

        const currentKeys = (node.data as BifurcationNodeData).selectedCapexKeys ?? [];
        const nextKeys = currentKeys.filter((key) => key !== capexKey);
        const nextTotal = nextKeys.reduce(
          (sum, key) => sum + (capexItems.find((entry) => entry.capexKey === key)?.amountInr ?? 0),
          0,
        );

        return {
          ...node,
          data: {
            ...(node.data as BifurcationNodeData),
            selectedCapexKeys: nextKeys,
            assetCostInr: nextTotal,
          },
        };
      }),
    );
  }, [capexItems, setNodes]);

  const createAmortizationSheetNode = useCallback((bifurcationId: string) => {
    setNodes((previousNodes) => {
      const bifurcationNode = previousNodes.find((node) => node.id === bifurcationId && node.type === "bifurcation");
      if (!bifurcationNode) {
        return previousNodes;
      }

      const existingSheet = previousNodes.find((node) => (node.data as Partial<AmortizationSheetNodeData> | undefined)?.sourceBifurcationId === bifurcationId);
      if (existingSheet) {
        return previousNodes;
      }

      const bifurcationData = bifurcationNode.data as BifurcationNodeData;
      const sheetId = `amortization-sheet-${bifurcationId}`;
      const newNode: Node<AmortizationSheetNodeData> = {
        id: sheetId,
        type: "amortizationSheet",
        position: {
          x: bifurcationNode.position.x - 40,
          y: bifurcationNode.position.y + 330,
        },
        data: {
          sourceBifurcationId: bifurcationId,
          bifurcationName: bifurcationData.bifurcationName,
          selectedCapexKeys: [...(bifurcationData.selectedCapexKeys ?? [])],
          sheetTotalInr: bifurcationData.assetCostInr,
          amortizationYears: bifurcationData.amortizationYears,
          interestRatePct: bifurcationData.interestRatePct,
          moratoriumMonths: bifurcationData.moratoriumMonths,
        },
      };

      setEdges((previousEdges) =>
        addEdge(
          {
            id: `edge-${bifurcationId}-${sheetId}`,
            source: bifurcationId,
            target: sheetId,
            type: "smoothstep",
            style: {
              ...edgeStyle,
              stroke: "#2563eb",
            },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#2563eb" },
          },
          previousEdges,
        ),
      );

      return [...previousNodes, newNode];
    });
  }, [capexItems, setEdges, setNodes]);

  const removeNode = useCallback((id: string) => {
    setNodes((previousNodes) =>
      previousNodes.filter((node) => {
        const nodeData = node.data as Partial<AmortizationSheetNodeData> | Partial<BifurcationNodeData> | undefined;
        return node.id !== id && !(nodeData && "sourceBifurcationId" in nodeData && nodeData.sourceBifurcationId === id);
      }),
    );
    setEdges((previousEdges) => previousEdges.filter((edge) => edge.source !== id && edge.target !== id));
  }, [setEdges, setNodes]);

  const resetGraph = useCallback(() => {
    setNodes(initialNodes.map((node) => ({ ...node, data: { ...(node.data as RootNodeData) } })));
    setEdges([]);
  }, [setEdges, setNodes]);

  const loadAmortizationRecord = useCallback(async (record: AmortizationRecord | null) => {
    if (!record) {
      resetGraph();
      return;
    }

    setSelectedAmortizationName(record.name);

    if (record.capexId) {
      setSelectedProjectCapexId(record.capexId);
    }

    if (!record.fileUrl) {
      resetGraph();
      return;
    }

    try {
      setLoading(true);
      const payload = await readJsonFromUrl<unknown>(record.fileUrl);
      const { capexConfig, config } = normalizeSavedAmortizationPayload(payload);
      const savedCapexId = capexConfig?.capex_id ?? record.capexId ?? null;
      if (savedCapexId) {
        setSelectedProjectCapexId(savedCapexId);
      }

      const savedCapexName = capexConfig?.capex_name ?? record.capexName ?? selectedAmortizationName;
      setSelectedAmortizationName(record.name || savedCapexName);

      const nextNodes: Node<RootNodeData | BifurcationNodeData | AmortizationSheetNodeData>[] = [
        ...initialNodes.map((node) => ({ ...node, data: { ...(node.data as RootNodeData) } })),
      ];
      const nextEdges = [] as typeof initialEdges;

      const bifurcationEntries = Object.entries(config ?? {}).filter(([key]) => /^bifurcation_\d+$/i.test(key));
      bifurcationEntries.sort(([leftKey], [rightKey]) => {
        const leftIndex = Number(leftKey.match(/\d+/)?.[0] ?? 0);
        const rightIndex = Number(rightKey.match(/\d+/)?.[0] ?? 0);
        return leftIndex - rightIndex;
      });

      bifurcationEntries.forEach(([, bifurcationValue], index) => {
        const payloadRow = bifurcationValue as {
          config?: {
            bifurcation_name?: string;
            rate_of_intrest?: number;
            repayment_year?: number;
            moratorium_months?: number;
            selected_capex_keys?: string[];
            asset_cost_inr?: number;
          };
        };

        const bifurcationConfig = payloadRow.config ?? {};
        const selectedCapexKeys = Array.isArray(bifurcationConfig.selected_capex_keys) ? bifurcationConfig.selected_capex_keys : [];
        const savedLineItems = Array.isArray((bifurcationConfig as { line_item?: unknown }).line_item)
          ? ((bifurcationConfig as { line_item?: unknown }).line_item as string[])
          : [];
        const selectedLineItemKeys = savedLineItems.length > 0
          ? savedLineItems
          : selectedCapexKeys
              .map((key) => capexItems.find((entry) => entry.capexKey === key)?.sourceItemKey)
              .filter((key): key is string => Boolean(key));
        const assetCostInr =
          typeof bifurcationConfig.asset_cost_inr === "number"
            ? bifurcationConfig.asset_cost_inr
            : selectedCapexKeys.reduce(
                (sum, key) => sum + (capexItems.find((entry) => entry.capexKey === key)?.amountInr ?? 0),
                0,
              );
        const bifurcationId = `bifurcation-${index + 1}`;
        const bifurcationNode: Node<BifurcationNodeData> = {
          id: bifurcationId,
          type: "bifurcation",
          position: {
            x: 160 + (index % 2) * 420,
            y: 240 + Math.floor(index / 2) * 280,
          },
          data: {
            bifurcationName: bifurcationConfig.bifurcation_name ?? `Bifurcation ${index + 1}`,
            selectedCapexKeys,
            assetCostInr,
            amortizationYears: Number(bifurcationConfig.repayment_year) || 1,
            interestRatePct: Number(bifurcationConfig.rate_of_intrest) || 0,
            moratoriumMonths: Number(bifurcationConfig.moratorium_months) || 0,
            lineItemKeys: selectedLineItemKeys,
          },
        };

        const sheetId = `amortization-sheet-${bifurcationId}`;
        const sheetNode: Node<AmortizationSheetNodeData> = {
          id: sheetId,
          type: "amortizationSheet",
          position: {
            x: bifurcationNode.position.x - 40,
            y: bifurcationNode.position.y + 330,
          },
          data: {
            sourceBifurcationId: bifurcationId,
            bifurcationName: bifurcationNode.data.bifurcationName,
            selectedCapexKeys: [...selectedCapexKeys],
            lineItemKeys: [...selectedLineItemKeys],
            sheetTotalInr: assetCostInr,
            amortizationYears: bifurcationNode.data.amortizationYears,
            interestRatePct: bifurcationNode.data.interestRatePct,
            moratoriumMonths: bifurcationNode.data.moratoriumMonths,
          },
        };

        nextNodes.push(bifurcationNode, sheetNode);
        nextEdges.push(
          {
            id: `edge-capex-root-${bifurcationId}`,
            source: "capex-root",
            target: bifurcationId,
            type: "bezier",
            style: edgeStyle,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
          },
          {
            id: `edge-${bifurcationId}-${sheetId}`,
            source: bifurcationId,
            target: sheetId,
            type: "smoothstep",
            style: {
              ...edgeStyle,
              stroke: "#2563eb",
            },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#2563eb" },
          },
        );
      });

      setNodes(nextNodes);
      setEdges(nextEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load amortization record");
    } finally {
      setLoading(false);
    }
  }, [capexItems, resetGraph, setEdges, setNodes]);

  const buildAmortizationJson = useCallback(() => {
    const selectedCapex = projectCapexList.find((item) => item.capex_id === selectedProjectCapexId);
    const capexConfig = {
      capex_id: selectedCapex?.capex_id ?? selectedProjectCapexId ?? "",
      capex_name: selectedCapex?.capex_name ?? "",
      total_amount: capexTotal,
    };

    const amortizationConfig = nodes
      .filter((node) => node.type === "bifurcation")
      .reduce<Record<string, AmortizationConfigSummary>>((accumulator, node, index) => {
        const data = node.data as BifurcationNodeData;
        const selectedTotal = data.selectedCapexKeys.reduce(
          (sum, key) => sum + (capexItems.find((entry) => entry.capexKey === key)?.amountInr ?? 0),
          0,
        );
        const loanAmount = data.assetCostInr || selectedTotal;
        const totalTenureMonths = Math.max(1, (Number(data.amortizationYears) || 1) * 12);
        const schedule = buildAmortizationSchedule(loanAmount, Number(data.interestRatePct) || 0, Number(data.moratoriumMonths) || 0, totalTenureMonths);
        const lineItemKeys = (data.selectedCapexKeys ?? [])
          .map((key) => capexItems.find((entry) => entry.capexKey === key)?.sourceItemKey)
          .filter((key): key is string => Boolean(key));

        const sheet = schedule.reduce<Record<string, {
          opening_balance: number;
          intrest: number;
          principal_payment: number;
          emi: number;
          closing_balance: number;
        }>>((sheetAccumulator, row) => {
          sheetAccumulator[`month_${row.month}`] = {
            opening_balance: row.openingBalanceInr,
            intrest: row.interestInr,
            principal_payment: row.principalInr,
            emi: row.emiInr,
            closing_balance: row.closingBalanceInr,
          };
          return sheetAccumulator;
        }, {});

        accumulator[`bifurcation_${index + 1}`] = {
          config: {
            bifurcation_name: data.bifurcationName,
            rate_of_intrest: Number(data.interestRatePct) || 0,
            repayment_year: Number(data.amortizationYears) || 1,
            selected_capex_keys: [...(data.selectedCapexKeys ?? [])],
            asset_cost_inr: loanAmount,
            line_item: lineItemKeys,
          },
          sheet,
        };

        return accumulator;
      }, {});

    return {
      capex_config: capexConfig,
      ammortization_config: amortizationConfig,
    };
  }, [amortizationRecords, capexItems, capexTotal, nodes, projectCapexList, selectedAmortizationName, selectedProjectCapexId]);

  const saveAmortization = useCallback(async (mode: "create" | "update") => {
    if (!projectId) {
      setError("Project ID not available for saving amortization.");
      return;
    }

    if (!selectedProjectCapexId) {
      setError("Select a CAPEX before saving amortization.");
      return;
    }

    const selectedCapex = projectCapexList.find((item) => item.capex_id === selectedProjectCapexId);
    const amortizationJson = buildAmortizationJson();
    const recordName = selectedAmortizationName.trim() || "Amortization 1";

    try {
      setIsSaving(true);
      setError(null);

      if (mode === "create" || !selectedAmortizationId) {
        const response = (await createNewAmmortization({
          project_id: projectId,
          ammortization_json: amortizationJson,
          ammortization_name: recordName,
          capex_id: selectedProjectCapexId,
        })) as { ammortization_id?: string; success?: boolean };

        const nextId = response.ammortization_id ?? `ammortization-${Date.now()}`;
        const nextRecord: AmortizationRecord = {
          id: nextId,
          name: recordName,
          capexId: selectedProjectCapexId,
          capexName: selectedCapex?.capex_name,
          isNew: false,
          isSaved: true,
        };

        setAmortizationRecords((previous) => {
          const filtered = previous.filter((record) => record.id !== nextRecord.id);
          return [...filtered, nextRecord];
        });
        setSelectedAmortizationId(nextRecord.id);
        setSelectedAmortizationName(nextRecord.name);
        return;
      }

      await replaceExistingAmmortization({
        project_id: projectId,
        ammortization_id: selectedAmortizationId,
        ammortization_json: amortizationJson,
        ammortization_name: recordName,
        capex_id: selectedProjectCapexId,
      });

      setAmortizationRecords((previous) =>
        previous.map((record) =>
          record.id === selectedAmortizationId
            ? {
                ...record,
                name: recordName,
                capexId: selectedProjectCapexId,
                capexName: selectedCapex?.capex_name,
                isNew: false,
                isSaved: true,
              }
            : record,
        ),
      );
      setSelectedAmortizationName(recordName);
    } catch (err) {
      console.error("Error saving amortization:", err);
      setError(err instanceof Error ? err.message : "Failed to save amortization record");
    } finally {
      setIsSaving(false);
    }
  }, [buildAmortizationJson, projectCapexList, projectId, selectedAmortizationId, selectedAmortizationName, selectedProjectCapexId]);

  const createNewAmortizationRecord = useCallback(() => {
    const nextRecord: AmortizationRecord = {
      id: `ammortization-${Date.now()}`,
      name: `Amortization ${amortizationRecords.length + 1}`,
      capexId: selectedProjectCapexId ?? undefined,
      capexName: projectCapexList.find((item) => item.capex_id === selectedProjectCapexId)?.capex_name,
      isNew: true,
      isSaved: false,
    };

    setAmortizationRecords((previous) => [...previous, nextRecord]);
    setSelectedAmortizationId(nextRecord.id);
    setSelectedAmortizationName(nextRecord.name);
    resetGraph();
  }, [amortizationRecords.length, projectCapexList, resetGraph, selectedProjectCapexId]);

  const createBifurcationNode = useCallback(() => {
    setNodes((previousNodes) => {
      const bifurcationCount = previousNodes.filter((node) => node.type === "bifurcation").length;
      const newId = `bifurcation-${Date.now()}`;
      const position = {
        x: 160 + (bifurcationCount % 2) * 420,
        y: 240 + Math.floor(bifurcationCount / 2) * 280,
      };

      const newNode: Node<BifurcationNodeData> = {
        id: newId,
        type: "bifurcation",
        position,
        data: {
          bifurcationName: `Bifurcation ${bifurcationCount + 1}`,
          selectedCapexKeys: [],
          assetCostInr: 0,
          amortizationYears: 5,
          interestRatePct: 10,
          moratoriumMonths: 0,
        },
      };

      setEdges((previousEdges) =>
        addEdge(
          {
            id: `edge-capex-root-${newId}`,
            source: "capex-root",
            target: newId,
            type: "bezier",
            style: edgeStyle,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
          },
          previousEdges,
        ),
      );

      return [...previousNodes, newNode];
    });
  }, [setEdges, setNodes]);

  const onConnect = useCallback((connection: { source?: string; target?: string }) => {
    if (!connection.source || !connection.target) {
      return;
    }

    setEdges((previousEdges) =>
      addEdge(
        {
          id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          type: "bezier",
          style: edgeStyle,
          markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
        },
        previousEdges,
      ),
    );
  }, [setEdges]);

  const onConnectEnd = useCallback((event: unknown) => {
    const pointerEvent = event as MouseEvent;
    const target = pointerEvent.target as HTMLElement | null;
    if (target?.closest(".react-flow__pane")) {
      createBifurcationNode();
    }
  }, [createBifurcationNode]);

  useEffect(() => {
    const selectedRecord = amortizationRecords.find((record) => record.id === selectedAmortizationId) ?? null;
    void loadAmortizationRecord(selectedRecord);
  }, [amortizationRecords, loadAmortizationRecord, selectedAmortizationId]);

  return (
    <GraphContext.Provider
      value={{
        capexItems,
        capexTotal,
        usedCapexKeys,
        projectCapexList,
        selectedProjectCapexId,
        loadCapexById,
        updateNodeData,
        toggleCapexItem,
        removeCapexItem,
        createAmortizationSheetNode,
        removeNode,
      }}
    >
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Amortization graph</p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">CAPEX to Bifurcation Flow</h1>
                <p className="mt-1 text-sm text-slate-600">
                  {projectName ? `Project: ${projectName}` : "Create amortization bifurcations from the total CAPEX node"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Drag from the bottom handle of Total CAPEX to create a new bifurcation node.
              </div>
            </div>
            {loading && (
              <div className="mt-4 flex items-center gap-3">
                <div className="spinner"></div>
                <p className="text-sm text-slate-500">Loading CAPEX data...</p>
              </div>
            )}
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          </div>

          {!loading && (
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="relative h-[78vh] w-full">
                  <div className="absolute right-4 top-4 z-10 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                      <Table2 className="h-4 w-4 text-slate-500" />
                      <span>Selected Ammortization</span>
                      <div className="relative">
                        <select
                          value={selectedAmortizationId ?? ""}
                          onChange={(event) => setSelectedAmortizationId(event.target.value || null)}
                          className="appearance-none rounded-xl border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        >
                          {amortizationRecords.length === 0 ? (
                            <option value="">No ammortization records</option>
                          ) : (
                            amortizationRecords.map((record) => (
                              <option key={record.id} value={record.id}>
                                {record.name}
                              </option>
                            ))
                          )}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                      <span className="font-medium text-slate-500">Ammortization Name</span>
                      <input
                        value={selectedAmortizationName}
                        onChange={(event) => {
                          const nextName = event.target.value;
                          setSelectedAmortizationName(nextName);
                          setAmortizationRecords((previous) =>
                            previous.map((record) =>
                              record.id === selectedAmortizationId
                                ? {
                                    ...record,
                                    name: nextName,
                                  }
                                : record,
                            ),
                          );
                        }}
                        className="min-w-[220px] rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Enter ammortization name"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={createNewAmortizationRecord}
                      className="flex items-center gap-2 rounded-2xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      aria-label="Create new amortization"
                      title="Create new ammortization"
                    >
                      <Plus className="h-4 w-4" />
                      New
                    </button>

                    <button
                      type="button"
                      onClick={() => void saveAmortization("create")}
                      disabled={isSaving}
                      className="flex items-center gap-2 rounded-2xl border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                      aria-label="Save amortization"
                      title="Create new ammortization record"
                    >
                      <Download className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void saveAmortization("update")}
                      disabled={isSaving || !selectedAmortizationId}
                      className="flex items-center gap-2 rounded-2xl border border-slate-500 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                      aria-label="Save current amortization"
                      title="Save current ammortization record"
                    >
                      <Download className="h-4 w-4" />
                      Save Current
                    </button>
                  </div>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onConnectEnd={onConnectEnd}
                  nodeTypes={nodeTypes}
                  defaultEdgeOptions={{ type: "bezier", style: edgeStyle }}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                >
                  <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
                  <Controls />
                  <MiniMap
                    nodeColor={(node) => (node.type === "capexRoot" ? "#0f172a" : "#10b981")}
                    pannable
                    zoomable
                  />
                </ReactFlow>
              </div>
            </div>
          )}
        </div>
      </div>
    </GraphContext.Provider>
  );
};

const DirectorAmortization = () => (
  <ReactFlowProvider>
    <DirectorAmortizationCanvas />
  </ReactFlowProvider>
);

export default DirectorAmortization;
