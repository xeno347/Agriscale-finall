import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import jsPDF from "jspdf";
import { getBaseUrl } from "@/lib/config";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateProjectFormState {
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
  equityPercentage: string;
  debtInterestRate: string;
  amortizationTimeline: string;
  napierCostPerTon: string;
}

interface CapexRow {
  itemName: string;
  uom: string;
  quantity: string;
  perUnitCost: string;
}

interface OpexRow {
  itemName: string;
  uom: string;
  quantity: string;
  perUnitCost: string;
}

const steps = [
  "Step 1: Project Details",
  "Step 2: Timeline, Goal & Geography",
  "Step 3: Project CAPEX",
  "Step 4: Project OPEX",
  "Step 5: Investment Structure",
  "Step 6: Amortization & Viability",
  "Step 7: Project DPR",
] as const;

const initialForm: CreateProjectFormState = {
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
  equityPercentage: "",
  debtInterestRate: "",
  amortizationTimeline: "",
  napierCostPerTon: "",
};

const initialCapexRows: CapexRow[] = [
  { itemName: "Irrigation Setup", uom: "Set", quantity: "1", perUnitCost: "0" },
  { itemName: "Land Preparation", uom: "Acre", quantity: "0", perUnitCost: "0" },
];

const initialOpexRows: OpexRow[] = [
  { itemName: "Labor Cost", uom: "Month", quantity: "1", perUnitCost: "0" },
  { itemName: "Maintenance", uom: "Month", quantity: "1", perUnitCost: "0" },
];

const formatINR = (value: number) => {
  if (!Number.isFinite(value)) return "₹0";
  return `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
};

const parseAmortizationToMonths = (input: string) => {
  const normalized = input.toLowerCase();
  const yearsMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(year|years|yr|yrs)/);
  const monthsMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(month|months|mon)/);
  const daysMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(day|days)/);

  const years = yearsMatch ? Number(yearsMatch[1]) : 0;
  const months = monthsMatch ? Number(monthsMatch[1]) : 0;
  const days = daysMatch ? Number(daysMatch[1]) : 0;

  const totalMonths = years * 12 + months + days / 30;

  return Number.isFinite(totalMonths) ? totalMonths : 0;
};

const buildAmortizationRows = (debtAmount: number, interestAmount: number, durationMonths: number) => {
  const months = Math.floor(durationMonths);
  if (debtAmount <= 0 || months <= 0) return [];

  const monthlyPrincipal = debtAmount / months;
  const monthlyInterest = interestAmount / months;

  return Array.from({ length: months }, (_, idx) => {
    const month = idx + 1;
    const openingBalance = Math.max(debtAmount - monthlyPrincipal * idx, 0);
    const principalPaid = monthlyPrincipal;
    const interestPaid = monthlyInterest;
    const emi = principalPaid + interestPaid;
    const closingBalance = Math.max(openingBalance - principalPaid, 0);
    return { month, openingBalance, principalPaid, interestPaid, emi, closingBalance };
  });
};

const CreateProjectDialog = ({ open, onOpenChange }: CreateProjectDialogProps) => {
  const [form, setForm] = useState<CreateProjectFormState>(initialForm);
  const [currentStep, setCurrentStep] = useState(1);
  const [capexRows, setCapexRows] = useState<CapexRow[]>(initialCapexRows);
  const [opexRows, setOpexRows] = useState<OpexRow[]>(initialOpexRows);

  const updateField = (field: keyof CreateProjectFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setCurrentStep(1);
    setCapexRows(initialCapexRows);
    setOpexRows(initialOpexRows);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const isSubmitDisabled = Object.values(form).some((value) => !value.trim()) || currentStep !== steps.length;
  const napierCutCycleDaysValue = Number(form.napierCutCycleDays);
  const napierNeededPerDayValue = Number(form.napierNeededPerDay);
  const geographyValue = Number(form.projectGeographyAcres);
  const totalNapierPerCycle =
    Number.isFinite(napierCutCycleDaysValue) &&
    Number.isFinite(napierNeededPerDayValue) &&
    napierCutCycleDaysValue > 0 &&
    napierNeededPerDayValue >= 0
      ? napierCutCycleDaysValue * napierNeededPerDayValue
      : null;
  const napierPerAcre =
    totalNapierPerCycle !== null &&
    Number.isFinite(geographyValue) &&
    geographyValue > 0
      ? totalNapierPerCycle / geographyValue
      : null;

  const updateCapexRow = (index: number, field: keyof CapexRow, value: string) => {
    setCapexRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const addCapexRow = () => {
    setCapexRows((prev) => [
      ...prev,
      { itemName: "", uom: "", quantity: "", perUnitCost: "" },
    ]);
  };

  const updateOpexRow = (index: number, field: keyof OpexRow, value: string) => {
    setOpexRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const addOpexRow = () => {
    setOpexRows((prev) => [
      ...prev,
      { itemName: "", uom: "", quantity: "", perUnitCost: "" },
    ]);
  };

  const getRowsTotal = (rows: Array<{ quantity: string; perUnitCost: string }>) =>
    rows.reduce((sum, row) => {
      const quantity = Number(row.quantity);
      const perUnitCost = Number(row.perUnitCost);
      const amount =
        Number.isFinite(quantity) && Number.isFinite(perUnitCost)
          ? quantity * perUnitCost
          : 0;
      return sum + amount;
    }, 0);

  const buildProjectJson = () => {
    const capexLineItems = capexRows.map((row, index) => {
      const quantity = Number(row.quantity) || 0;
      const perUnitCostInr = Number(row.perUnitCost) || 0;
      const amountInr = quantity * perUnitCostInr;
      return {
        sNo: index + 1,
        itemName: row.itemName || "",
        uom: row.uom || "",
        quantity,
        perUnitCostInr,
        amountInr,
      };
    });

    const opexLineItems = opexRows.map((row, index) => {
      const quantity = Number(row.quantity) || 0;
      const perUnitCostInr = Number(row.perUnitCost) || 0;
      const amountInr = quantity * perUnitCostInr;
      return {
        sNo: index + 1,
        itemName: row.itemName || "",
        uom: row.uom || "",
        quantity,
        perUnitCostInr,
        amountInr,
      };
    });

    const capexTotal = getRowsTotal(capexRows);
    const opexTotal = getRowsTotal(opexRows);
    const totalInvestment = capexTotal + opexTotal;
    const equityPercentRaw = Number(form.equityPercentage);
    const equityPercentage = Number.isFinite(equityPercentRaw)
      ? Math.min(Math.max(equityPercentRaw, 0), 100)
      : 0;
    const equityAmount = totalInvestment * (equityPercentage / 100);
    const debtAmount = Math.max(totalInvestment - equityAmount, 0);

    const durationMonths = parseAmortizationToMonths(form.amortizationTimeline);
    const durationYears = durationMonths / 12;
    const annualRatePercent = Number(form.debtInterestRate) || 0;
    const interestAmountInr =
      debtAmount > 0 && durationYears > 0
        ? debtAmount * (annualRatePercent / 100) * durationYears
        : 0;
    const totalRepaymentAmountInr = debtAmount + interestAmountInr;
    const monthlyEmiInr =
      debtAmount > 0 && durationMonths > 0
        ? totalRepaymentAmountInr / durationMonths
        : 0;

    const napierCutCycleDays = Number(form.napierCutCycleDays) || 0;
    const napierNeededPerDayTons = Number(form.napierNeededPerDay) || 0;
    const totalNapierRequiredPerCycleTons = napierCutCycleDays * napierNeededPerDayTons;
    const acresRequired = Number(form.projectGeographyAcres) || 0;
    const napierPerAcrePerCycleTons =
      acresRequired > 0 ? totalNapierRequiredPerCycleTons / acresRequired : 0;

    const cycleDurationMonths = napierCutCycleDays > 0 ? napierCutCycleDays / 30 : 0;
    const napierCostPerTonInr = Number(form.napierCostPerTon) || 0;
    const cycleRevenueInr = totalNapierRequiredPerCycleTons * napierCostPerTonInr;
    const cycleEmiObligationInr = cycleDurationMonths * monthlyEmiInr;
    const isViable =
      debtAmount > 0 &&
      cycleRevenueInr > 0 &&
      cycleEmiObligationInr > 0 &&
      cycleRevenueInr >= cycleEmiObligationInr;

    const amortizationBalanceSheet = buildAmortizationRows(debtAmount, interestAmountInr, durationMonths).map((row) => ({
      month: row.month,
      openingBalanceInr: row.openingBalance,
      principalPaidInr: row.principalPaid,
      interestPaidInr: row.interestPaid,
      emiInr: row.emi,
      closingBalanceInr: row.closingBalance,
    }));

    return {
      projectMeta: {
        projectId: `proj_${Date.now()}`,
        createdAt: new Date().toISOString(),
        version: "1.0.0",
      },
      step1_projectDetails: {
        projectName: form.projectName || "",
        projectLocation: form.projectLocation || "",
        clusterName: form.clusterName || "",
        zoneName: form.zoneName || "",
        projectStartDate: form.projectStartDate || "",
      },
      step2_timelineGoalGeography: {
        projectTimeline: {
          startDate: form.timelineStartDate || "",
          endDate: form.timelineEndDate || "",
        },
        projectGoal: {
          napierCutCycleDays,
          napierNeededPerDayTons,
          totalNapierRequiredPerCycleTons,
        },
        projectGeography: {
          acresRequired,
          napierPerAcrePerCycleTons,
        },
      },
      step3_capex: {
        lineItems: capexLineItems,
        totalCapexInr: capexTotal,
      },
      step4_opex: {
        lineItems: opexLineItems,
        totalOpexInr: opexTotal,
        capexPlusOpexInr: totalInvestment,
      },
      step5_investmentStructure: {
        totalInvestmentInr: totalInvestment,
        equity: {
          percentage: equityPercentage,
          amountInr: equityAmount,
        },
        debt: {
          percentage: 100 - equityPercentage,
          amountInr: debtAmount,
        },
        interest: {
          annualRatePercent,
        },
        amortization: {
          rawInput: form.amortizationTimeline || "",
          durationMonths,
        },
        repayment: {
          interestAmountInr,
          totalRepaymentAmountInr,
          monthlyEmiInr,
        },
      },
      step6_amortizationAndViability: {
        napierCostPerTonInr,
        cycleDurationMonths,
        cycleRevenueInr,
        cycleEmiObligationInr,
        viability: {
          isViable,
          tag: isViable ? "VIABLE" : "NOT_VIABLE",
          rule: "cycleRevenueInr >= cycleEmiObligationInr",
        },
        amortizationBalanceSheet,
      },
      step7_dpr: {
        generatedAt: new Date().toISOString(),
        summary: {
          projectObjective: "Napier production and supply for recurring cut cycles",
          financialSnapshot: {
            totalCapexInr: capexTotal,
            totalOpexInr: opexTotal,
            totalInvestmentInr: totalInvestment,
            monthlyEmiInr,
          },
          viabilityTag: isViable ? "VIABLE" : "NOT_VIABLE",
        },
        pdf: {
          fileName: `${form.projectName || "project"}-DPR.pdf`,
          storagePath: `/dpr/${form.projectName || "project"}-DPR.pdf`,
        },
      },
    };
  };

  const handleDownloadDprPdf = () => {
    const projectJson = buildProjectJson();
    const capexTotal = projectJson.step3_capex.totalCapexInr;
    const opexTotal = projectJson.step4_opex.totalOpexInr;
    const totalInvestment = projectJson.step4_opex.capexPlusOpexInr;
    const sanitizedEquityPercent = projectJson.step5_investmentStructure.equity.percentage;
    const equityAmount = projectJson.step5_investmentStructure.equity.amountInr;
    const debtAmount = projectJson.step5_investmentStructure.debt.amountInr;
    const durationMonths = projectJson.step5_investmentStructure.amortization.durationMonths;
    const interestRateValue = projectJson.step5_investmentStructure.interest.annualRatePercent;
    const interestAmount = projectJson.step5_investmentStructure.repayment.interestAmountInr;
    const totalRepaymentAmount = projectJson.step5_investmentStructure.repayment.totalRepaymentAmountInr;
    const monthlyEmi = projectJson.step5_investmentStructure.repayment.monthlyEmiInr;
    const napierPerTon = projectJson.step6_amortizationAndViability.napierCostPerTonInr;
    const cycleRevenue = projectJson.step6_amortizationAndViability.cycleRevenueInr;
    const cycleEmiObligation = projectJson.step6_amortizationAndViability.cycleEmiObligationInr;
    const isViable = projectJson.step6_amortizationAndViability.viability.isViable;
    const amortizationRows = projectJson.step6_amortizationAndViability.amortizationBalanceSheet.map((r) => ({
      month: r.month,
      openingBalance: r.openingBalanceInr,
      principalPaid: r.principalPaidInr,
      interestPaid: r.interestPaidInr,
      emi: r.emiInr,
      closingBalance: r.closingBalanceInr,
    }));
    const capexDistribution = capexRows.map((row, index) => {
      const amount = (Number(row.quantity) || 0) * (Number(row.perUnitCost) || 0);
      return { index: index + 1, itemName: row.itemName || "-", uom: row.uom || "-", amount };
    });
    const opexDistribution = opexRows.map((row, index) => {
      const amount = (Number(row.quantity) || 0) * (Number(row.perUnitCost) || 0);
      return { index: index + 1, itemName: row.itemName || "-", uom: row.uom || "-", amount };
    });

    const doc = new jsPDF();
    let y = 14;
    const lh = 7;
    const write = (text: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(text, 14, y);
      y += lh;
      if (y > 280) {
        doc.addPage();
        y = 14;
      }
    };

    write("Detailed Project Report (DPR)", true);
    write(`Project: ${form.projectName || "-"}`);
    write(`Location: ${form.projectLocation || "-"} | Cluster: ${form.clusterName || "-"} | Zone: ${form.zoneName || "-"}`);
    write(`Project Start Date: ${form.projectStartDate || "-"}`);
    y += 2;

    write("1. Project Overview", true);
    write(`Timeline: ${form.timelineStartDate || "-"} to ${form.timelineEndDate || "-"}`);
    write(`Napier Cut Cycle: ${form.napierCutCycleDays || "0"} days`);
    write(`Napier Needed Per Day: ${form.napierNeededPerDay || "0"}`);
    write(`Total Napier Per Cycle: ${totalNapierPerCycle ? totalNapierPerCycle.toFixed(2) : "0.00"}`);
    write(`Project Geography: ${form.projectGeographyAcres || "0"} acres`);
    write(`Napier Per Acre: ${napierPerAcre ? napierPerAcre.toFixed(2) : "0.00"}`);
    y += 2;

    write("2. Capital and Operating Structure", true);
    write(`Total CAPEX: ${formatINR(capexTotal)}`);
    write(`Total OPEX: ${formatINR(opexTotal)}`);
    write(`Total Investment: ${formatINR(totalInvestment)}`);
    write("CAPEX Distribution:", true);
    capexDistribution.forEach((row) => write(`${row.index}. ${row.itemName} (${row.uom}) - ${formatINR(row.amount)}`));
    write("OPEX Distribution:", true);
    opexDistribution.forEach((row) => write(`${row.index}. ${row.itemName} (${row.uom}) - ${formatINR(row.amount)}`));
    y += 2;

    write("3. Investment and Debt Structure", true);
    write(`Equity Share: ${sanitizedEquityPercent.toFixed(2)}% -> ${formatINR(equityAmount)}`);
    write(`Debt Share: ${(100 - sanitizedEquityPercent).toFixed(2)}% -> ${formatINR(debtAmount)}`);
    if (debtAmount > 0) {
      write(`Interest Rate (annual): ${interestRateValue.toFixed(2)}%`);
      write(`Amortization Timeline: ${form.amortizationTimeline || "-"} (${durationMonths.toFixed(2)} months)`);
      write(`Interest Amount: ${formatINR(interestAmount)}`);
      write(`Total Repayment Amount: ${formatINR(totalRepaymentAmount)}`);
      write(`Monthly EMI: ${formatINR(monthlyEmi)}/month`);
    }
    y += 2;

    write("4. Revenue and Viability", true);
    write(`Napier Cost Per Ton: ${formatINR(napierPerTon)}`);
    write(`Cycle Revenue: ${formatINR(cycleRevenue)}`);
    write(`Cycle EMI Obligation: ${formatINR(cycleEmiObligation)}`);
    write(`Project Viability: ${isViable ? "Viable" : "Not Viable"}`, true);

    if (amortizationRows.length > 0) {
      y += 2;
      write("5. Amortization Balance Sheet (Month-wise)", true);
      write("Month | Opening | Principal | Interest | EMI | Closing", true);
      amortizationRows.slice(0, 36).forEach((row) => {
        write(
          `${row.month} | ${formatINR(row.openingBalance)} | ${formatINR(row.principalPaid)} | ${formatINR(row.interestPaid)} | ${formatINR(row.emi)} | ${formatINR(row.closingBalance)}`,
        );
      });
      if (amortizationRows.length > 36) {
        write(`... ${amortizationRows.length - 36} more month rows`, true);
      }
    }

    doc.save(`${form.projectName || "project"}-DPR.pdf`);
  };

  const handleCreateProject = async () => {
    try {
      const projectJson = buildProjectJson();
      const baseUrl = getBaseUrl().replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/admin_project/create_new_project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_json: projectJson,
          project_name: form.projectName || "",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      toast({
        title: "Project created",
        description: `${form.projectName} has been created successfully.`,
      });
      handleClose();
    } catch (error) {
      toast({
        title: "Failed to create project",
        description: error instanceof Error ? error.message : "Unable to create project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="project-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Project Name
            </label>
            <input
              id="project-name"
              value={form.projectName}
              onChange={(e) => updateField("projectName", e.target.value)}
              placeholder="Enter project name"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label htmlFor="project-location" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Project Location
            </label>
            <input
              id="project-location"
              value={form.projectLocation}
              onChange={(e) => updateField("projectLocation", e.target.value)}
              placeholder="Enter project location"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label htmlFor="cluster-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cluster Name
            </label>
            <input
              id="cluster-name"
              value={form.clusterName}
              onChange={(e) => updateField("clusterName", e.target.value)}
              placeholder="Enter cluster name"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label htmlFor="zone-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Zone Name
            </label>
            <input
              id="zone-name"
              value={form.zoneName}
              onChange={(e) => updateField("zoneName", e.target.value)}
              placeholder="Enter zone name"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="project-start-date" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Project Start Date
            </label>
            <input
              id="project-start-date"
              type="date"
              value={form.projectStartDate}
              onChange={(e) => updateField("projectStartDate", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-800">Project Timeline</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div>
                <label htmlFor="timeline-start-date" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Start Date
                </label>
                <input
                  id="timeline-start-date"
                  type="date"
                  value={form.timelineStartDate}
                  onChange={(e) => updateField("timelineStartDate", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <p className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Till</p>
              <div>
                <label htmlFor="timeline-end-date" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  End Date
                </label>
                <input
                  id="timeline-end-date"
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
                <label htmlFor="napier-cut-cycle-days" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  1. Napier Cut Cycle (in days)
                </label>
                <input
                  id="napier-cut-cycle-days"
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
                <label htmlFor="napier-needed-per-day" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  2. Napier Needed Per Day
                </label>
                <input
                  id="napier-needed-per-day"
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
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                3. Total Napier Required Per Cycle
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {totalNapierPerCycle === null ? "-" : totalNapierPerCycle.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <label htmlFor="project-geography-acres" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Project Geography (Acres of Land Needed)
            </label>
            <input
              id="project-geography-acres"
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
              Amount of napier per acre required ={" "}
              {napierPerAcre === null ? "Project goal / Project geography" : napierPerAcre.toFixed(2)}
            </p>
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      const capexTotal = getRowsTotal(capexRows);

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total CAPEX Amount</p>
            <p className="mt-1 text-lg font-bold text-emerald-900">{formatINR(capexTotal)}</p>
          </div>

          <div className="max-h-[44vh] overflow-y-auto space-y-4 pr-1">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="w-[8%] px-3 py-2">S.no</th>
                    <th className="w-[23%] px-3 py-2">Items name</th>
                    <th className="w-[20%] px-3 py-2">UOM</th>
                    <th className="w-[15%] px-3 py-2">Quantity</th>
                    <th className="w-[15%] px-3 py-2">Per unit cost (₹)</th>
                    <th className="w-[11%] px-3 py-2">Amount</th>
                    <th className="w-[8%] px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {capexRows.map((row, index) => {
                    const quantity = Number(row.quantity);
                    const perUnitCost = Number(row.perUnitCost);
                    const amount =
                      Number.isFinite(quantity) && Number.isFinite(perUnitCost)
                        ? quantity * perUnitCost
                        : 0;

                    return (
                      <tr key={`capex-row-${index}`} className="border-t border-slate-200 align-top">
                        <td className="px-3 py-2 text-slate-700">{index + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            value={row.itemName}
                            onChange={(e) => updateCapexRow(index, "itemName", e.target.value)}
                            placeholder="Enter item name"
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={row.uom}
                            onChange={(e) => updateCapexRow(index, "uom", e.target.value)}
                            placeholder="UOM"
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.quantity}
                            onChange={(e) => updateCapexRow(index, "quantity", e.target.value)}
                            placeholder="0"
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.perUnitCost}
                              onChange={(e) => updateCapexRow(index, "perUnitCost", e.target.value)}
                              placeholder="0"
                              className="w-full rounded-md border border-slate-200 py-1.5 pl-5 pr-2 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{formatINR(amount)}</td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCapexRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
                            }
                            disabled={capexRows.length === 1}
                            className="text-rose-600 hover:text-rose-700"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <Button type="button" variant="outline" onClick={addCapexRow}>
                Add New Row
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 4) {
      const capexTotal = getRowsTotal(capexRows);
      const opexTotal = getRowsTotal(opexRows);
      const totalCapexOpex = capexTotal + opexTotal;

      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Project CAPEX</p>
              <p className="mt-1 text-lg font-bold text-blue-900">{formatINR(capexTotal)}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total OPEX Amount</p>
              <p className="mt-1 text-lg font-bold text-amber-900">{formatINR(opexTotal)}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">CAPEX + OPEX Total</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{formatINR(totalCapexOpex)}</p>
            </div>
          </div>

          <div className="max-h-[44vh] space-y-4 overflow-y-auto pr-1">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="w-[8%] px-3 py-2">S.no</th>
                    <th className="w-[23%] px-3 py-2">Items name</th>
                    <th className="w-[20%] px-3 py-2">UOM</th>
                    <th className="w-[15%] px-3 py-2">Quantity</th>
                    <th className="w-[15%] px-3 py-2">Per unit cost (₹)</th>
                    <th className="w-[11%] px-3 py-2">Amount</th>
                    <th className="w-[8%] px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {opexRows.map((row, index) => {
                    const quantity = Number(row.quantity);
                    const perUnitCost = Number(row.perUnitCost);
                    const amount =
                      Number.isFinite(quantity) && Number.isFinite(perUnitCost)
                        ? quantity * perUnitCost
                        : 0;

                    return (
                      <tr key={`opex-row-${index}`} className="border-t border-slate-200 align-top">
                        <td className="px-3 py-2 text-slate-700">{index + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            value={row.itemName}
                            onChange={(e) => updateOpexRow(index, "itemName", e.target.value)}
                            placeholder="Enter item name"
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={row.uom}
                            onChange={(e) => updateOpexRow(index, "uom", e.target.value)}
                            placeholder="UOM"
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.quantity}
                            onChange={(e) => updateOpexRow(index, "quantity", e.target.value)}
                            placeholder="0"
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.perUnitCost}
                              onChange={(e) => updateOpexRow(index, "perUnitCost", e.target.value)}
                              placeholder="0"
                              className="w-full rounded-md border border-slate-200 py-1.5 pl-5 pr-2 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{formatINR(amount)}</td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setOpexRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
                            }
                            disabled={opexRows.length === 1}
                            className="text-rose-600 hover:text-rose-700"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <Button type="button" variant="outline" onClick={addOpexRow}>
                Add New Row
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 5) {
      const capexTotal = getRowsTotal(capexRows);
      const opexTotal = getRowsTotal(opexRows);
      const totalInvestment = capexTotal + opexTotal;

      const equityPercent = Number(form.equityPercentage);
      const sanitizedEquityPercent = Number.isFinite(equityPercent)
        ? Math.min(Math.max(equityPercent, 0), 100)
        : 0;
      const equityAmount = totalInvestment * (sanitizedEquityPercent / 100);
      const debtAmount = Math.max(totalInvestment - equityAmount, 0);

      const durationMonths = parseAmortizationToMonths(form.amortizationTimeline);
      const durationYears = durationMonths / 12;

      const interestRate = Number(form.debtInterestRate);
      const interestRateValue = Number.isFinite(interestRate) ? Math.max(interestRate, 0) : 0;

      const interestAmount =
        debtAmount > 0 && durationYears > 0
          ? debtAmount * (interestRateValue / 100) * durationYears
          : 0;
      const totalRepaymentAmount = debtAmount + interestAmount;
      const monthlyEmi =
        debtAmount > 0 && durationMonths > 0
          ? totalRepaymentAmount / durationMonths
          : 0;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Investment</p>
            <p className="mt-1 text-lg font-bold text-emerald-900">{formatINR(totalInvestment)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <label htmlFor="equity-percentage" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Equity to Debt Ratio: Equity Percentage (%)
            </label>
            <input
              id="equity-percentage"
              type="number"
              min="0"
              max="100"
              step="any"
              value={form.equityPercentage}
              onChange={(e) => updateField("equityPercentage", e.target.value)}
              placeholder="Enter equity percentage"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Equity Amount</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{formatINR(equityAmount)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Debt Amount</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{formatINR(debtAmount)}</p>
              </div>
            </div>
          </div>

          {debtAmount > 0 && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label htmlFor="debt-interest-rate" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Debt Interest Rate (% per year)
                </label>
                <input
                  id="debt-interest-rate"
                  type="number"
                  min="0"
                  step="any"
                  value={form.debtInterestRate}
                  onChange={(e) => updateField("debtInterestRate", e.target.value)}
                  placeholder="Enter annual interest rate"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label htmlFor="amortization-timeline" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amortization Timeline
                </label>
                <input
                  id="amortization-timeline"
                  type="text"
                  value={form.amortizationTimeline}
                  onChange={(e) => updateField("amortizationTimeline", e.target.value)}
                  placeholder="e.g. 12 days, 30 month, 3 years"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Parsed duration: {durationMonths > 0 ? `${durationMonths.toFixed(2)} months` : "Not available yet"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Interest Amount</p>
                  <p className="mt-1 text-base font-bold text-blue-900">{formatINR(interestAmount)}</p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Total Repayment</p>
                  <p className="mt-1 text-base font-bold text-indigo-900">{formatINR(totalRepaymentAmount)}</p>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Monthly EMI</p>
                  <p className="mt-1 text-base font-bold text-purple-900">
                    {durationMonths > 0 ? `${formatINR(monthlyEmi)}/month` : "Enter timeline"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    if (currentStep === 6) {
      const capexTotal = getRowsTotal(capexRows);
      const opexTotal = getRowsTotal(opexRows);
      const totalInvestment = capexTotal + opexTotal;

      const equityPercent = Number(form.equityPercentage);
      const sanitizedEquityPercent = Number.isFinite(equityPercent)
        ? Math.min(Math.max(equityPercent, 0), 100)
        : 0;
      const equityAmount = totalInvestment * (sanitizedEquityPercent / 100);
      const debtAmount = Math.max(totalInvestment - equityAmount, 0);

      const durationMonths = parseAmortizationToMonths(form.amortizationTimeline);
      const durationYears = durationMonths / 12;
      const interestRate = Number(form.debtInterestRate);
      const interestRateValue = Number.isFinite(interestRate) ? Math.max(interestRate, 0) : 0;
      const interestAmount =
        debtAmount > 0 && durationYears > 0
          ? debtAmount * (interestRateValue / 100) * durationYears
          : 0;
      const totalRepaymentAmount = debtAmount + interestAmount;
      const monthlyEmi =
        debtAmount > 0 && durationMonths > 0
          ? totalRepaymentAmount / durationMonths
          : 0;

      const napierNeededPerDay = Number(form.napierNeededPerDay);
      const cycleDays = Number(form.napierCutCycleDays);
      const napierCostPerTon = Number(form.napierCostPerTon);

      const cycleMonths =
        Number.isFinite(cycleDays) && cycleDays > 0
          ? cycleDays / 30
          : 0;
      const cycleRevenue =
        Number.isFinite(napierNeededPerDay) &&
        Number.isFinite(cycleDays) &&
        Number.isFinite(napierCostPerTon) &&
        napierNeededPerDay >= 0 &&
        cycleDays > 0 &&
        napierCostPerTon >= 0
          ? napierNeededPerDay * cycleDays * napierCostPerTon
          : 0;
      const cycleEmiObligation =
        cycleMonths > 0 && monthlyEmi > 0
          ? cycleMonths * monthlyEmi
          : 0;

      const hasDebt = debtAmount > 0;
      const canEvaluateViability =
        hasDebt &&
        cycleRevenue > 0 &&
        cycleEmiObligation > 0;
      const isViable = canEvaluateViability ? cycleRevenue >= cycleEmiObligation : false;
      const amortizationMonths = Math.floor(durationMonths);
      const monthlyPrincipal =
        hasDebt && amortizationMonths > 0
          ? debtAmount / amortizationMonths
          : 0;
      const monthlyInterest =
        hasDebt && amortizationMonths > 0
          ? interestAmount / amortizationMonths
          : 0;
      const amortizationRows =
        hasDebt && amortizationMonths > 0
          ? Array.from({ length: amortizationMonths }, (_, idx) => {
              const month = idx + 1;
              const openingBalance = Math.max(debtAmount - monthlyPrincipal * idx, 0);
              const principalPaid = monthlyPrincipal;
              const interestPaid = monthlyInterest;
              const emi = principalPaid + interestPaid;
              const closingBalance = Math.max(openingBalance - principalPaid, 0);
              return {
                month,
                openingBalance,
                principalPaid,
                interestPaid,
                emi,
                closingBalance,
              };
            })
          : [];

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <label htmlFor="napier-cost-per-ton" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cost of Napier Per Ton (₹)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                ₹
              </span>
              <input
                id="napier-cost-per-ton"
                type="number"
                min="0"
                step="any"
                value={form.napierCostPerTon}
                onChange={(e) => updateField("napierCostPerTon", e.target.value)}
                placeholder="Enter napier cost per ton"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-5 pr-3 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Cycle Duration</p>
              <p className="mt-1 text-base font-bold text-blue-900">
                {cycleMonths > 0 ? `${cycleMonths.toFixed(2)} months` : "Not available"}
              </p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Cycle Revenue</p>
              <p className="mt-1 text-base font-bold text-indigo-900">{formatINR(cycleRevenue)}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Cycle EMI Obligation</p>
              <p className="mt-1 text-base font-bold text-amber-900">{formatINR(cycleEmiObligation)}</p>
            </div>
            <div
              className={`rounded-xl border px-4 py-3 ${
                canEvaluateViability
                  ? isViable
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Project Viability</p>
              <p
                className={`mt-1 text-base font-bold ${
                  canEvaluateViability
                    ? isViable
                      ? "text-emerald-800"
                      : "text-rose-800"
                    : "text-slate-700"
                }`}
              >
                {canEvaluateViability ? (isViable ? "Viable" : "Not Viable") : "Pending Inputs"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-900">Amortization Balance Sheet (Snapshot)</p>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="text-slate-600">Debt Amount: <span className="font-semibold text-slate-900">{formatINR(debtAmount)}</span></p>
              <p className="text-slate-600">Interest Amount: <span className="font-semibold text-slate-900">{formatINR(interestAmount)}</span></p>
              <p className="text-slate-600">Total Repayment: <span className="font-semibold text-slate-900">{formatINR(totalRepaymentAmount)}</span></p>
              <p className="text-slate-600">Monthly EMI: <span className="font-semibold text-slate-900">{formatINR(monthlyEmi)}</span></p>
            </div>
          </div>

          {amortizationRows.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">Amortization Balance Sheet (Month-wise)</p>
              <div className="max-h-[30vh] overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Month</th>
                      <th className="px-3 py-2">Opening</th>
                      <th className="px-3 py-2">Principal</th>
                      <th className="px-3 py-2">Interest</th>
                      <th className="px-3 py-2">EMI</th>
                      <th className="px-3 py-2">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortizationRows.map((row) => (
                      <tr key={`amort-${row.month}`} className="border-t border-slate-200">
                        <td className="px-3 py-2 font-medium text-slate-700">{row.month}</td>
                        <td className="px-3 py-2 text-slate-700">{formatINR(row.openingBalance)}</td>
                        <td className="px-3 py-2 text-slate-700">{formatINR(row.principalPaid)}</td>
                        <td className="px-3 py-2 text-slate-700">{formatINR(row.interestPaid)}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{formatINR(row.emi)}</td>
                        <td className="px-3 py-2 text-slate-700">{formatINR(row.closingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    const capexTotal = getRowsTotal(capexRows);
    const opexTotal = getRowsTotal(opexRows);
    const totalInvestment = capexTotal + opexTotal;
    const equityPercent = Number(form.equityPercentage);
    const sanitizedEquityPercent = Number.isFinite(equityPercent) ? Math.min(Math.max(equityPercent, 0), 100) : 0;
    const equityAmount = totalInvestment * (sanitizedEquityPercent / 100);
    const debtAmount = Math.max(totalInvestment - equityAmount, 0);
    const durationMonths = parseAmortizationToMonths(form.amortizationTimeline);
    const durationYears = durationMonths / 12;
    const interestRateValue = Number(form.debtInterestRate) || 0;
    const interestAmount = debtAmount > 0 && durationYears > 0 ? debtAmount * (interestRateValue / 100) * durationYears : 0;
    const totalRepaymentAmount = debtAmount + interestAmount;
    const monthlyEmi = debtAmount > 0 && durationMonths > 0 ? totalRepaymentAmount / durationMonths : 0;
    const cycleDays = Number(form.napierCutCycleDays) || 0;
    const napierPerDay = Number(form.napierNeededPerDay) || 0;
    const napierPerTon = Number(form.napierCostPerTon) || 0;
    const cycleMonths = cycleDays > 0 ? cycleDays / 30 : 0;
    const cycleRevenue = napierPerDay * cycleDays * napierPerTon;
    const cycleEmiObligation = cycleMonths * monthlyEmi;
    const isViable = debtAmount > 0 && cycleRevenue > 0 && cycleEmiObligation > 0 ? cycleRevenue >= cycleEmiObligation : false;
    const amortizationRows = buildAmortizationRows(debtAmount, interestAmount, durationMonths);
    const capexDistribution = capexRows.map((row, index) => ({
      index: index + 1,
      itemName: row.itemName || "-",
      uom: row.uom || "-",
      amount: (Number(row.quantity) || 0) * (Number(row.perUnitCost) || 0),
    }));
    const opexDistribution = opexRows.map((row, index) => ({
      index: index + 1,
      itemName: row.itemName || "-",
      uom: row.uom || "-",
      amount: (Number(row.quantity) || 0) * (Number(row.perUnitCost) || 0),
    }));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Detailed Project Report</p>
            <p className="text-xs text-slate-600">Investor-ready summary from Steps 1 to 6</p>
          </div>
          <Button type="button" onClick={handleDownloadDprPdf}>
            Download PDF
          </Button>
        </div>

        <div className="max-h-[46vh] space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
          <section>
            <p className="text-sm font-semibold text-slate-900">Project Details</p>
            <p className="mt-1 text-sm text-slate-700">{form.projectName || "-"} | {form.projectLocation || "-"}</p>
            <p className="text-sm text-slate-700">Cluster: {form.clusterName || "-"} | Zone: {form.zoneName || "-"}</p>
            <p className="text-sm text-slate-700">Start Date: {form.projectStartDate || "-"}</p>
          </section>

          <section>
            <p className="text-sm font-semibold text-slate-900">Operational Model</p>
            <p className="text-sm text-slate-700">Timeline: {form.timelineStartDate || "-"} to {form.timelineEndDate || "-"}</p>
            <p className="text-sm text-slate-700">Cut Cycle: {form.napierCutCycleDays || "0"} days</p>
            <p className="text-sm text-slate-700">Napier/day: {form.napierNeededPerDay || "0"} | Acres: {form.projectGeographyAcres || "0"}</p>
            <p className="text-sm text-slate-700">Napier per cycle: {totalNapierPerCycle ? totalNapierPerCycle.toFixed(2) : "0.00"}</p>
          </section>

          <section>
            <p className="text-sm font-semibold text-slate-900">Financial Summary</p>
            <p className="text-sm text-slate-700">CAPEX: {formatINR(capexTotal)}</p>
            <p className="text-sm text-slate-700">OPEX: {formatINR(opexTotal)}</p>
            <p className="text-sm font-semibold text-slate-900">Total Investment: {formatINR(totalInvestment)}</p>
            <p className="text-sm text-slate-700">Equity ({sanitizedEquityPercent.toFixed(2)}%): {formatINR(equityAmount)}</p>
            <p className="text-sm text-slate-700">Debt ({(100 - sanitizedEquityPercent).toFixed(2)}%): {formatINR(debtAmount)}</p>
          </section>

          <section>
            <p className="text-sm font-semibold text-slate-900">Distribution of CAPEX and OPEX</p>
            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200">
                <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-600">CAPEX Distribution</p>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-1.5">S.no</th>
                        <th className="px-3 py-1.5">Item</th>
                        <th className="px-3 py-1.5">UOM</th>
                        <th className="px-3 py-1.5">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capexDistribution.map((row) => (
                        <tr key={`dpr-capex-${row.index}`} className="border-t border-slate-100">
                          <td className="px-3 py-1.5">{row.index}</td>
                          <td className="px-3 py-1.5">{row.itemName}</td>
                          <td className="px-3 py-1.5">{row.uom}</td>
                          <td className="px-3 py-1.5 font-medium">{formatINR(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200">
                <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-600">OPEX Distribution</p>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-1.5">S.no</th>
                        <th className="px-3 py-1.5">Item</th>
                        <th className="px-3 py-1.5">UOM</th>
                        <th className="px-3 py-1.5">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opexDistribution.map((row) => (
                        <tr key={`dpr-opex-${row.index}`} className="border-t border-slate-100">
                          <td className="px-3 py-1.5">{row.index}</td>
                          <td className="px-3 py-1.5">{row.itemName}</td>
                          <td className="px-3 py-1.5">{row.uom}</td>
                          <td className="px-3 py-1.5 font-medium">{formatINR(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-slate-900">Debt & Repayment</p>
            <p className="text-sm text-slate-700">Interest Rate: {interestRateValue.toFixed(2)}% yearly</p>
            <p className="text-sm text-slate-700">Amortization: {form.amortizationTimeline || "-"} ({durationMonths.toFixed(2)} months)</p>
            <p className="text-sm text-slate-700">Interest Amount: {formatINR(interestAmount)}</p>
            <p className="text-sm text-slate-700">Total Repayment: {formatINR(totalRepaymentAmount)}</p>
            <p className="text-sm font-semibold text-slate-900">Monthly EMI: {formatINR(monthlyEmi)}/month</p>
          </section>

          <section>
            <p className="text-sm font-semibold text-slate-900">Revenue & Viability</p>
            <p className="text-sm text-slate-700">Napier Cost/Ton: {formatINR(napierPerTon)}</p>
            <p className="text-sm text-slate-700">Cycle Revenue: {formatINR(cycleRevenue)}</p>
            <p className="text-sm text-slate-700">Cycle EMI Obligation: {formatINR(cycleEmiObligation)}</p>
            <p className={`text-sm font-semibold ${isViable ? "text-emerald-700" : "text-rose-700"}`}>
              Project Viability: {isViable ? "Viable" : "Not Viable"}
            </p>
          </section>

          {amortizationRows.length > 0 && (
            <section>
              <p className="text-sm font-semibold text-slate-900">Amortization Balance Sheet</p>
              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2">Month</th>
                      <th className="px-3 py-2">Opening</th>
                      <th className="px-3 py-2">Principal</th>
                      <th className="px-3 py-2">Interest</th>
                      <th className="px-3 py-2">EMI</th>
                      <th className="px-3 py-2">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortizationRows.map((row) => (
                      <tr key={`dpr-amort-${row.month}`} className="border-t border-slate-100">
                        <td className="px-3 py-1.5">{row.month}</td>
                        <td className="px-3 py-1.5">{formatINR(row.openingBalance)}</td>
                        <td className="px-3 py-1.5">{formatINR(row.principalPaid)}</td>
                        <td className="px-3 py-1.5">{formatINR(row.interestPaid)}</td>
                        <td className="px-3 py-1.5 font-semibold">{formatINR(row.emi)}</td>
                        <td className="px-3 py-1.5">{formatINR(row.closingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Complete all steps to configure project, finance, viability, and DPR.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2">
            {steps.map((stepLabel, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isComplete = stepNumber < currentStep;
              return (
                <button
                  key={stepLabel}
                  type="button"
                  onClick={() => setCurrentStep(stepNumber)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? "border-slate-800 bg-slate-800 text-white"
                      : isComplete
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {stepNumber}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto rounded-xl border border-slate-200 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">{steps[currentStep - 1]}</p>
          {renderStepContent()}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          {currentStep < steps.length ? (
            <Button onClick={() => setCurrentStep((prev) => Math.min(steps.length, prev + 1))}>
              Next Step
            </Button>
          ) : (
            <Button onClick={handleCreateProject} disabled={isSubmitDisabled}>
              Create Project
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
