import { getBaseUrl } from "@/lib/config";

export interface ProjectListItem {
  project_name: string;
  created_at: string;
  project_id: string;
  file_url: string;
  project_json?: unknown;
}

export interface ProjectCapexItem {
  capex_id: string;
  capex_name: string;
  capex_s3_key: string;
  capex_file_url: string;
  capex_created_at: string;
}

export interface ProjectOpexItem {
  opex_id: string;
  opex_name: string;
  opex_s3_key: string;
  opex_file_url: string;
  opex_created_at: string;
}

export interface ProjectAmortizationItem {
  ammortization_id: string;
  ammortization_name: string;
  ammortization_s3_key: string;
  ammortization_file_url: string;
  ammortization_created_at: string;
  capex_id?: string;
  capex_name?: string;
}

export interface CreateCapexRequest {
  project_id: string;
  capex_json: Record<string, {
    item_name: string;
    item_UOM: string;
    item_quanity: number;
    item_per_unit_cost: number;
    amount: number;
  }>;
  capex_name: string;
}

export interface CreateOpexRequest {
  project_id: string;
  opex_json: Record<string, Record<string, string | number | undefined>>;
  opex_name: string;
}

interface ProjectListResponse {
  success: boolean;
  projects: ProjectListItem[];
}

interface ProjectCapexResponse {
  success: boolean;
  capex?: ProjectCapexItem[];
  message?: string;
}

interface ProjectOpexResponse {
  success: boolean;
  opex?: ProjectOpexItem[];
  message?: string;
}

interface ProjectAmortizationResponse {
  success: boolean;
  ammortization?: ProjectAmortizationItem[];
  ammortizations?: ProjectAmortizationItem[][];
  message?: string;
}
const PROJECTS_COOKIE_KEY = "erp_projects_latest";

export interface ProjectFileData {
  step1_projectDetails?: {
    projectName?: string;
    projectLocation?: string;
    clusterName?: string;
    zoneName?: string;
    projectStartDate?: string;
  };
  step2_timelineGoalGeography?: {
    projectTimeline?: {
      startDate?: string;
      endDate?: string;
    };
    projectGoal?: {
      napierCutCycleDays?: number;
      napierNeededPerDayTons?: number;
      totalNapierRequiredPerCycleTons?: number;
    };
    projectGeography?: {
      acresRequired?: number;
      napierPerAcrePerCycleTons?: number;
    };
  };
  step3_capex?: {
    lineItems?: Array<{
      sNo?: number;
      itemName?: string;
      uom?: string;
      quantity?: number;
      perUnitCostInr?: number;
      amountInr?: number;
    }>;
    totalCapexInr?: number;
  };
  step4_opex?: {
    lineItems?: Array<{
      sNo?: number;
      itemName?: string;
      uom?: string;
      quantity?: number;
      perUnitCostInr?: number;
      perYearCosts?: number[];
      restPerUnitCost?: number;
      amountInr?: number;
    }>;
    totalOpexInr?: number;
  };
  step6_amortizationAndViability?: {
    amortizationBalanceSheet?: Array<{
      month?: number;
      openingBalanceInr?: number;
      principalPaidInr?: number;
      interestPaidInr?: number;
      emiInr?: number;
      closingBalanceInr?: number;
    }>;
    napierCostPerTonInr?: number;
    cycleRevenueInr?: number;
    cycleDurationMonths?: number;
    cycleEmiObligationInr?: number;
  };
}

export const formatInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export const readProjectJson = async (fileUrl: string): Promise<ProjectFileData> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/admin_project/read_project_json/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_url: fileUrl }),
  });

  if (!response.ok) {
    throw new Error(`Failed to read project JSON: ${response.statusText}`);
  }

  const payload = (await response.json()) as { success: boolean; data: ProjectFileData };
  if (!payload.success || !payload.data) {
    throw new Error("Invalid response from read_project_json endpoint");
  }

  return payload.data;
};

export const fetchProjectCapexList = async (projectId: string): Promise<ProjectCapexItem[]> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/admin_project/get_capex/${projectId}`);

  if (!response.ok) {
    throw new Error(`Failed to load project capex list: ${response.statusText}`);
  }

  const payload = (await response.json()) as ProjectCapexResponse;
  if (!payload.success) {
    return [];
  }

  return Array.isArray(payload.capex) ? payload.capex : [];
};

export const fetchProjectOpexList = async (projectId: string): Promise<ProjectOpexItem[]> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/admin_project/get_opex/${projectId}`);

  if (!response.ok) {
    throw new Error(`Failed to load project opex list: ${response.statusText}`);
  }

  const payload = (await response.json()) as ProjectOpexResponse;
  if (!payload.success) {
    return [];
  }

  return Array.isArray(payload.opex) ? payload.opex : [];
};

export const readJsonFromUrl = async <T = unknown>(fileUrl: string): Promise<T> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/admin_project/read_project_json/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_url: fileUrl }),
  });

  if (!response.ok) {
    throw new Error(`Failed to read JSON from backend: ${response.statusText}`);
  }

  const payload = (await response.json()) as { success: boolean; data?: T; message?: string };
  if (!payload.success || payload.data === undefined) {
    throw new Error(payload.message ?? "Invalid response from read_project_json endpoint");
  }

  return payload.data;
};

export const createNewCapex = async (payload: CreateCapexRequest): Promise<unknown> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/admin_project/create_new_capex`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create capex: ${response.statusText}`);
  }

  return response.json();
};

export const createNewOpex = async (payload: CreateOpexRequest): Promise<unknown> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/admin_project/create_new_opex`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create opex: ${response.statusText}`);
  }

  return response.json();
};

export const replaceExistingCapex = async (payload: {
  project_id: string;
  capex_id: string;
  new_capex_json: CreateCapexRequest["capex_json"];
}): Promise<unknown> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/admin_project/replace_existing_capex`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to replace capex: ${response.statusText}`);
  }

  return response.json();
};

export const replaceExistingOpex = async (payload: {
  project_id: string;
  opex_id: string;
  new_opex_json: CreateOpexRequest["opex_json"];
}): Promise<unknown> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/admin_project/replace_existing_opex`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to replace opex: ${response.statusText}`);
  }

  return response.json();
};

export const fetchProjectAmortizationList = async (projectId: string): Promise<ProjectAmortizationItem[]> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/admin_project/get_ammortization/${projectId}`);

  if (!response.ok) {
    throw new Error(`Failed to load project amortization list: ${response.statusText}`);
  }

  const payload = (await response.json()) as ProjectAmortizationResponse;
  if (!payload.success) {
    return [];
  }

  if (Array.isArray(payload.ammortization)) {
    return payload.ammortization;
  }

  if (Array.isArray(payload.ammortizations)) {
    return payload.ammortizations.flat().filter((item): item is ProjectAmortizationItem => Boolean(item));
  }

  return [];
};

export const createNewAmmortization = async (payload: {
  project_id: string;
  ammortization_json: Record<string, unknown>;
  ammortization_name: string;
  capex_id: string;
}): Promise<unknown> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/admin_project/create_new_ammortization`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create ammortization: ${response.statusText}`);
  }

  return response.json();
};

export const replaceExistingAmmortization = async (payload: {
  project_id: string;
  ammortization_id: string;
  ammortization_json: Record<string, unknown>;
  ammortization_name: string;
  capex_id: string;
}): Promise<unknown> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/admin_project/replace_existing_ammortization`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to replace ammortization: ${response.statusText}`);
  }

  return response.json();
};

export const fetchLatestProjectFile = async (): Promise<{ meta: ProjectListItem; data: ProjectFileData }> => {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  let projects: ProjectListItem[] = [];
  const response = await fetch(`${baseUrl}/admin_project/get_all_projects`);
  if (response.ok) {
    const payload = (await response.json()) as ProjectListResponse;
    projects = Array.isArray(payload.projects) ? payload.projects : [];
  }

  // Fallback to cached payload from AppLayout cookie if needed.
  if (!projects.length && typeof document !== "undefined") {
    const cookieEntry = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${PROJECTS_COOKIE_KEY}=`));
    if (cookieEntry) {
      try {
        const decoded = decodeURIComponent(cookieEntry.split("=")[1] ?? "");
        const parsed = JSON.parse(decoded) as ProjectListResponse;
        projects = Array.isArray(parsed.projects) ? parsed.projects : [];
      } catch {
        // Ignore cookie parse errors.
      }
    }
  }

  if (!projects.length) {
    throw new Error("No projects found.");
  }

  const latest = [...projects].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  // Try to read project JSON using the new read_project_json endpoint
  const data = await readProjectJson(latest.file_url);
  return { meta: latest, data };
};
