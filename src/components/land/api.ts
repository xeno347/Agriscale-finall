import getBaseUrl from '@/lib/config';
import type { FarmerDetail, Land } from './types';

const base = () => getBaseUrl().replace(/\/$/, '');

export const normalizeFarmer = (item: any): FarmerDetail => {
  const fd = item.farmer_data || {};
  const rawCreds = item.credentials_data ?? item.credentials ?? null;
  return {
    farmer_id: item.farmer_id,
    full_name: fd.full_name || 'AmritAgrotech',
    phone_number: fd.phone_number || '',
    alternate_phone_number: fd.alternate_phone_number ?? '',
    village: fd.village ?? '',
    district: fd.district ?? '',
    state: fd.state ?? '',
    farming_option: fd.farming_option ?? '',
    address: fd.farmer_address || fd.permanent_address || '',
    kyc_data: item.kyc_data ?? null,
    agreement_data: Array.isArray(item.agreement_data) ? item.agreement_data : [],
    bank_details: Array.isArray(item.bank_details) ? item.bank_details : [],
    documents: item.documents ?? null,
    credentials: rawCreds
      ? { userId: rawCreds.user_id ?? rawCreds.userId ?? null, password: rawCreds.password ?? null, saved: true }
      : null,
    flagged: item?.flagged?.flagged === true || item?.flagged === true,
  };
};

export const fetchFarmers = async (): Promise<any[]> => {
  const resp = await fetch(`${base()}/farmer_managment/get_farmers`);
  const body = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(body?.message || 'Failed to load farmers');
  return Array.isArray(body?.farmers) ? body.farmers : [];
};

export const findAmritAgrotech = async (): Promise<FarmerDetail | null> => {
  const farmers = await fetchFarmers();
  const match = farmers.find(
    (f) => String(f?.farmer_data?.full_name ?? '').trim().toLowerCase() === 'amritagrotech'
  );
  return match ? normalizeFarmer(match) : null;
};

export const fetchLands = async (farmerId: string): Promise<Land[]> => {
  const resp = await fetch(`${base()}/farmer_managment/get_farms`);
  const body = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(body?.message || 'Failed to load lands');
  const all = Array.isArray(body?.farms) ? body.farms : [];
  return all.filter((f: any) => String(f?.farmer_id) === farmerId);
};
