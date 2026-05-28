export type MrfSignatureRole = 'admin_ops' | 'director';

export type MrfSignatureEntry = {
  signerName: string;
  signerRole: string;
  approvalStatus: string;
  signedAt: string;
  stamp: string;
};

export type MrfSignatureCache = Record<string, Partial<Record<MrfSignatureRole, MrfSignatureEntry>>>;

const STORAGE_KEY = 'farmconnect.mrfSignatureCache.v1';

const isBrowser = typeof window !== 'undefined';

const normalizeRole = (role: string) => String(role || '').trim().toLowerCase().replace(/\s+/g, ' ');

const formatSignatureStamp = (signerName: string, signerRole: string, approvalStatus: string, signedAt: string) => {
  const when = signedAt ? new Date(signedAt) : new Date();
  const hhmmss = when.toTimeString().slice(0, 8);
  const ymd = when.toISOString().slice(0, 10);
  const statusNorm = String(approvalStatus || '').trim().toLowerCase();
  const statusForStamp = statusNorm === 'rejected' ? 'reject' : statusNorm;
  return `[${String(signerName || '').trim()}|${normalizeRole(signerRole)}|${hhmmss}|${ymd}|${statusForStamp}]`;
};

export const buildMrfSignatureEntry = ({
  signerName,
  signerRole,
  approvalStatus,
  signedAt,
}: {
  signerName: string;
  signerRole: string;
  approvalStatus: string;
  signedAt?: string;
}): MrfSignatureEntry => {
  const nextSignedAt = signedAt || new Date().toISOString();
  const normalized = String(approvalStatus || '').trim().toLowerCase();
  const approvalForEntry = normalized === 'rejected' ? 'reject' : normalized;
  return {
    signerName: String(signerName || '').trim(),
    signerRole: String(signerRole || '').trim(),
    approvalStatus: approvalForEntry,
    signedAt: nextSignedAt,
    stamp: formatSignatureStamp(signerName, signerRole, approvalForEntry, nextSignedAt),
  };
};

export const readMrfSignatureCache = (): MrfSignatureCache => {
  if (!isBrowser) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const cache: MrfSignatureCache = {};
    for (const [mrfNo, entries] of Object.entries(parsed as Record<string, unknown>)) {
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) continue;
      const nextEntries: Partial<Record<MrfSignatureRole, MrfSignatureEntry>> = {};
      for (const [roleKey, value] of Object.entries(entries as Record<string, unknown>)) {
        if (roleKey !== 'admin_ops' && roleKey !== 'director') continue;
        nextEntries[roleKey] = {
          signerName: String((value as any)?.signerName ?? '').trim(),
          signerRole: String((value as any)?.signerRole ?? '').trim(),
          approvalStatus: String((value as any)?.approvalStatus ?? '').trim().toLowerCase(),
          signedAt: String((value as any)?.signedAt ?? '').trim(),
          stamp: String((value as any)?.stamp ?? '').trim(),
        };
      }
      cache[String(mrfNo)] = nextEntries;
    }

    return cache;
  } catch {
    return {};
  }
};

export const writeMrfSignatureCache = (cache: MrfSignatureCache) => {
  if (!isBrowser) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
};

export const getMrfSignatureEntry = (cache: MrfSignatureCache, mrfNo: string, role: MrfSignatureRole) => {
  return cache[String(mrfNo)]?.[role] ?? null;
};

export const extractStatusFromEntry = (entryOrValue: MrfSignatureEntry | string | null) => {
  if (!entryOrValue) return null;

  // if it's an object with approvalStatus
  if (typeof entryOrValue === 'object') {
    const aprop = String((entryOrValue as MrfSignatureEntry).approvalStatus || '').trim();
    if (aprop && !aprop.includes('[') && !aprop.includes('|')) {
      const lowered = aprop.toLowerCase();
      return lowered === 'rejected' ? 'reject' : lowered;
    }
    const stamp = String((entryOrValue as MrfSignatureEntry).stamp || '').trim();
    const m = stamp.match(/\|([^|\]]+)\]$/);
    if (m && m[1]) {
      const s = String(m[1]).trim().toLowerCase();
      return s === 'rejected' ? 'reject' : s;
    }
    return null;
  }

  // if it's a raw string (possibly a stamp or a simple status)
  const raw = String(entryOrValue || '').trim();
  if (!raw) return null;
  // if it's already a simple token
  if (!raw.includes('[') && !raw.includes('|')) {
    const lowered = raw.toLowerCase();
    return lowered === 'rejected' ? 'reject' : lowered;
  }
  // parse stamp tail
  const m = raw.match(/\|([^|\]]+)\]$/);
  if (m && m[1]) {
    const s = String(m[1]).trim().toLowerCase();
    return s === 'rejected' ? 'reject' : s;
  }
  return null;
};

export const saveMrfSignatureEntry = (
  cache: MrfSignatureCache,
  mrfNo: string,
  role: MrfSignatureRole,
  entry: MrfSignatureEntry,
) => {
  const next: MrfSignatureCache = { ...cache };
  next[String(mrfNo)] = {
    ...(next[String(mrfNo)] || {}),
    [role]: entry,
  };
  writeMrfSignatureCache(next);
  return next;
};