export type LeadStatus = 'contacted' | 'verified' | 'registered' | 'rejected' | 'follow_up';

export interface Lead {
  id: string;
  backendId?: string;
  farmerId?: string;
  fullName: string;
  phoneNumber: string;
  alternatePhone?: string;
  leadSource: string;
  village: string;
  taluka?: string;
  tehsil?: string;
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
  
  // NEW FIELDS
  isFlagged: boolean; 
  behaviorNote?: string;
  stopPayments: boolean;
  stopInputs: boolean;
  
  kycData?: KYCDetails;
  agreementData?: LeaseAgreement; // Detailed lease info
}

export interface LeaseAgreement {
  leaseStartDate: string;
  leaseEndDate: string;
  leaseRent: number;
  b1DocumentUrl?: string;
  kissanBookUrl?: string;
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

// ... keep HarvestPlan and HarvestOrder as they were