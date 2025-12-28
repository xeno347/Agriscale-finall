export type LeadStatus = 'contacted' | 'verified' | 'registered' | 'rejected';

export interface Lead {
  id: string; // Local or backend id
  backendId?: string; // Always set for backend leads
  farmerId?: string;
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
  landCoordinates?: { lat: number; lng: number }[];
  waterAvailable?: boolean;
  notes?: string;
  farmingOption?: string;
  status: LeadStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  kycData?: any;
  agreementData?: any;
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

export type HarvestPlanStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled';
export type HarvestOrderStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';

export interface HarvestPlan {
  id: string;
  farmerId: string;
  farmerName: string;
  cropType: string;
  planningDate: Date | string;
  expectedHarvestDate: Date | string;
  estimatedYield: number;
  yieldUnit: 'kg' | 'tonnes' | 'quintals';
  notes?: string;
  status: HarvestPlanStatus;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface HarvestOrder {
  id: string;
  farmerId: string;
  farmerName: string;
  cropType: string;
  quantity: number;
  quantityUnit: 'kg' | 'tonnes' | 'quintals';
  orderDate: Date | string;
  expectedDeliveryDate: Date | string;
  buyerName?: string;
  price?: number;
  totalAmount?: number;
  notes?: string;
  status: HarvestOrderStatus;
  createdAt: Date | string;
  updatedAt?: Date | string;
}
