export type InventoryIndentConfig = {
  indentedBy: string;
  forwardedBy: string;
  directorsApproval: string;
  projects: string[];
};

const STORAGE_KEY = 'farmconnect.inventoryIndentConfig.v1';

const normalizeProjects = (projects: unknown): string[] => {
  if (!Array.isArray(projects)) return [];
  const trimmed = projects
    .map((p) => String(p ?? '').trim())
    .filter(Boolean);
  return Array.from(new Set(trimmed));
};

export const readInventoryIndentConfig = (): InventoryIndentConfig => {
  const empty: InventoryIndentConfig = {
    indentedBy: '',
    forwardedBy: '',
    directorsApproval: '',
    projects: [],
  };

  if (typeof window === 'undefined') return empty;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed: any = JSON.parse(raw);
    return {
      indentedBy: String(parsed?.indentedBy ?? ''),
      forwardedBy: String(parsed?.forwardedBy ?? ''),
      directorsApproval: String(parsed?.directorsApproval ?? ''),
      projects: normalizeProjects(parsed?.projects),
    };
  } catch {
    return empty;
  }
};

export const writeInventoryIndentConfig = (next: InventoryIndentConfig) => {
  if (typeof window === 'undefined') return;

  const safe: InventoryIndentConfig = {
    indentedBy: String(next?.indentedBy ?? ''),
    forwardedBy: String(next?.forwardedBy ?? ''),
    directorsApproval: String(next?.directorsApproval ?? ''),
    projects: normalizeProjects(next?.projects),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
};
