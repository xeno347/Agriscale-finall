export type LeadStatus = 'contacted' | 'verified' | 'registered' | 'rejected';

export interface Lead {
  id: string;
  fullName: string;
  phoneNumber: string;
  alternatePhone?: string;
  leadSource: string;
  village: string;
  taluka?: string;
  district: string;
  state: string;
  estimatedLandArea?: number;
  location?: { lat: number; lng: number };
  waterAvailable: boolean;
  notes?: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface KYCDetails {
  aadhaarNumber: string;
  panNumber?: string;
  address: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  verified: boolean;
}

export interface Agreement {
  id: string;
  title: string;
  signedDate: Date;
  documentUrl: string;
}

export interface LandMapping {
  totalArea: number;
  coordinates: { lat: number; lng: number }[];
  soilType?: string;
  irrigationType?: string;
  satelliteImageUrl?: string;
}

export interface Farmer {
  id: string;
  fullName: string;
  phoneNumber: string;
  alternatePhone?: string;
  village: string;
  taluka?: string;
  district: string;
  state: string;
  profileImageUrl?: string;
  kyc?: KYCDetails;
  landMapping?: LandMapping;
  agreements: Agreement[];
  createdAt: Date;
}
