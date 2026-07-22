import type { LatLng } from '@/lib/geo';

export type Plot = {
  plot_id: string;
  plot_name?: string;
  plot_area: number;
  plot_coordinates: LatLng[];
  crop_type?: string;
  created_at?: string;
};

export type FarmerCredentials = {
  userId: string | null;
  password: string | null;
  saved: boolean;
};

export type FarmerDetail = {
  farmer_id: string;
  full_name: string;
  phone_number: string;
  alternate_phone_number?: string;
  village?: string;
  district?: string;
  state?: string;
  farming_option?: string;
  address?: string;
  kyc_data?: any;
  agreement_data?: any[];
  bank_details?: any[];
  documents?: Record<string, { url?: string }> | null;
  credentials?: FarmerCredentials | null;
  flagged?: boolean;
};

export type Land = {
  farm_id: string;
  farmer_id: string;
  area: number;
  crop_type?: string;
  created_at?: string;
  land_data: {
    land_coordinates: LatLng[];
    state?: string;
    district?: string;
    village?: string;
    farming_option?: string;
    land_media?: { images?: string[]; video?: string };
  };
  land_plots?: Plot[];
};
