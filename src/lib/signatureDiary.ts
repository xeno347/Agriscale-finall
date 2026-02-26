/**
 * Signature Diary — global per-person signature/stamp store.
 * Shared across Admin Ops Indent and Finance Admin Ops Indent pages.
 */

export type PersonEntry = {
  signature: string; // base64 data-url or ''
  stamp: string;     // base64 data-url or ''
};

export type SignatureDiary = Record<string, PersonEntry>; // name → entry

const DIARY_KEY = 'farmconnect.signatureDiary.v1';

/** Current logged-in user profile stored locally */
export type UserProfile = {
  name: string;
  role: string;
};

const PROFILE_KEY = 'farmconnect.userProfile.v1';

// ─── Diary ────────────────────────────────────────────────────────────────────

export const readSignatureDiary = (): SignatureDiary => {
  try {
    const raw = window.localStorage.getItem(DIARY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const diary: SignatureDiary = {};
    for (const [k, v] of Object.entries(parsed)) {
      const key = String(k).trim();
      if (!key) continue;
      diary[key] = {
        signature: String((v as any)?.signature ?? ''),
        stamp: String((v as any)?.stamp ?? ''),
      };
    }
    return diary;
  } catch {
    return {};
  }
};

export const writeSignatureDiary = (diary: SignatureDiary) => {
  try {
    const safe: SignatureDiary = {};
    for (const [k, v] of Object.entries(diary)) {
      const key = String(k).trim();
      if (!key) continue;
      safe[key] = {
        signature: String(v?.signature ?? ''),
        stamp: String(v?.stamp ?? ''),
      };
    }
    window.localStorage.setItem(DIARY_KEY, JSON.stringify(safe));
  } catch {
    // ignore quota errors
  }
};

export const getPersonEntry = (name: string): PersonEntry | null => {
  const diary = readSignatureDiary();
  return diary[name.trim()] ?? null;
};

// ─── User Profile ─────────────────────────────────────────────────────────────

export const readUserProfile = (): UserProfile => {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return { name: '', role: '' };
    const parsed = JSON.parse(raw);
    return {
      name: String(parsed?.name ?? ''),
      role: String(parsed?.role ?? ''),
    };
  } catch {
    return { name: '', role: '' };
  }
};

export const writeUserProfile = (profile: UserProfile) => {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify({
      name: String(profile.name ?? ''),
      role: String(profile.role ?? ''),
    }));
  } catch {
    // ignore
  }
};

const ATTACH_KEY = 'farmconnect.adminOps.attached.v1';
const DIRECTOR_ATTACHED_KEY = 'farmconnect.directorsAttached.v1';

export const readAttachedMap = (): Record<string, boolean> => {
  try {
    const raw = window.localStorage.getItem(ATTACH_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const map: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) {
      map[String(k)] = Boolean(v);
    }
    return map;
  } catch {
    return {};
  }
};

export const writeAttachedMap = (map: Record<string, boolean>) => {
  try {
    window.localStorage.setItem(ATTACH_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
};

export const readDirectorsAttachedMap = (): Record<string, boolean> => {
  try {
    const raw = window.localStorage.getItem(DIRECTOR_ATTACHED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const map: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) {
      map[String(k)] = Boolean(v);
    }
    return map;
  } catch {
    return {};
  }
};

export const writeDirectorsAttachedMap = (map: Record<string, boolean>) => {
  try {
    window.localStorage.setItem(DIRECTOR_ATTACHED_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
};
