/** Per-person signature/stamp attachment */
export type PersonAttachment = {
  signature: string; // base64 data-url or ''
  stamp: string;     // base64 data-url or ''
};

/** Map of person name → their attachment */
export type AttachmentsMap = Record<string, PersonAttachment>;

export type AdminOpsIndentConfig = {
  indentedBy: string;
  forwardedBy: string;
  directorsApproval: string;
  projects: string[];
  departments: string[];
  /** Legacy single-attachment field kept for backwards compat */
  attachment: { signature: string; stamp: string; name: string };
  /** Per-person attachments keyed by name */
  attachments: AttachmentsMap;
};

const STORAGE_KEY = 'farmconnect.adminOpsIndentConfig.v1';

const normalizeList = (list: unknown): string[] => {
  if (!Array.isArray(list)) return [];
  const trimmed = list.map((p) => String(p ?? '').trim()).filter(Boolean);
  return Array.from(new Set(trimmed));
};

const normalizeAttachmentsMap = (raw: unknown): AttachmentsMap => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: AttachmentsMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = String(k).trim();
    if (!key) continue;
    result[key] = {
      signature: String((v as any)?.signature ?? ''),
      stamp: String((v as any)?.stamp ?? ''),
    };
  }
  return result;
};

export const readAdminOpsIndentConfig = (): AdminOpsIndentConfig => {
  const empty: AdminOpsIndentConfig = {
    indentedBy: '',
    forwardedBy: '',
    directorsApproval: '',
    projects: [],
    departments: [],
    attachment: { signature: '', stamp: '', name: '' },
    attachments: {},
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
      projects: normalizeList(parsed?.projects),
      departments: normalizeList(parsed?.departments),
      attachment: {
        signature: String(parsed?.attachment?.signature ?? ''),
        stamp: String(parsed?.attachment?.stamp ?? ''),
        name: String(parsed?.attachment?.name ?? ''),
      },
      attachments: normalizeAttachmentsMap(parsed?.attachments),
    };
  } catch {
    return empty;
  }
};

export const writeAdminOpsIndentConfig = (next: AdminOpsIndentConfig) => {
  if (typeof window === 'undefined') return;

  const safe: AdminOpsIndentConfig = {
    indentedBy: String(next?.indentedBy ?? ''),
    forwardedBy: String(next?.forwardedBy ?? ''),
    directorsApproval: String(next?.directorsApproval ?? ''),
    projects: normalizeList(next?.projects),
    departments: normalizeList(next?.departments),
    attachment: {
      signature: String(next?.attachment?.signature ?? ''),
      stamp: String(next?.attachment?.stamp ?? ''),
      name: String(next?.attachment?.name ?? ''),
    },
    attachments: normalizeAttachmentsMap(next?.attachments),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
};
