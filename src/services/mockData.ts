import { Lead, Farmer, LeadStatus } from '@/types/farm';

export const mockLeads: Lead[] = [
  {
    id: '1',
    fullName: 'Rajesh Kumar Singh',
    phoneNumber: '+91 98765 43210',
    alternatePhone: '+91 87654 32109',
    leadSource: 'Field Agent',
    village: 'Khajuraho',
    taluka: 'Rajnagar',
    district: 'Chhatarpur',
    state: 'Madhya Pradesh',
    estimatedLandArea: 15,
    location: { lat: 24.8318, lng: 79.9199 },
    waterAvailable: true,
    notes: 'Interested in organic farming',
    status: 'contacted',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    fullName: 'Sunita Devi Patel',
    phoneNumber: '+91 99887 76655',
    leadSource: 'Referral',
    village: 'Barabanki',
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    estimatedLandArea: 8,
    location: { lat: 26.9260, lng: 81.1851 },
    waterAvailable: true,
    status: 'verified',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: '3',
    fullName: 'Mohan Lal Sharma',
    phoneNumber: '+91 88776 65544',
    leadSource: 'Digital Campaign',
    village: 'Sikar',
    taluka: 'Fatehpur',
    district: 'Sikar',
    state: 'Rajasthan',
    estimatedLandArea: 25,
    location: { lat: 27.6094, lng: 75.1399 },
    waterAvailable: false,
    notes: 'Has existing wheat cultivation',
    status: 'registered',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-14'),
  },
  {
    id: '4',
    fullName: 'Kamla Bai Yadav',
    phoneNumber: '+91 77665 54433',
    leadSource: 'Village Meeting',
    village: 'Dewas',
    district: 'Dewas',
    state: 'Madhya Pradesh',
    estimatedLandArea: 5,
    location: { lat: 22.9623, lng: 76.0508 },
    waterAvailable: true,
    status: 'rejected',
    notes: 'Land documents not clear',
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-11'),
  },
  {
    id: '5',
    fullName: 'Arvind Thakur',
    phoneNumber: '+91 66554 43322',
    leadSource: 'Field Agent',
    village: 'Bhagalpur',
    taluka: 'Sultanganj',
    district: 'Bhagalpur',
    state: 'Bihar',
    estimatedLandArea: 12,
    location: { lat: 25.2425, lng: 86.9842 },
    waterAvailable: true,
    status: 'contacted',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  },
];

export const mockFarmers: Farmer[] = [
  {
    id: '1',
    fullName: 'Mohan Lal Sharma',
    phoneNumber: '+91 88776 65544',
    village: 'Sikar',
    taluka: 'Fatehpur',
    district: 'Sikar',
    state: 'Rajasthan',
    profileImageUrl: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=150&h=150&fit=crop',
    kyc: {
      aadhaarNumber: 'XXXX XXXX 4532',
      panNumber: 'ABCDE1234F',
      address: 'Village Sikar, Fatehpur Taluka, Sikar District, Rajasthan - 332001',
      bankName: 'State Bank of India',
      accountNumber: 'XXXX XXXX 5678',
      ifscCode: 'SBIN0001234',
      verified: true,
    },
    landMapping: {
      totalArea: 25,
      coordinates: [
        { lat: 27.6094, lng: 75.1399 },
        { lat: 27.6104, lng: 75.1409 },
        { lat: 27.6084, lng: 75.1419 },
        { lat: 27.6074, lng: 75.1389 },
      ],
      soilType: 'Alluvial',
      irrigationType: 'Canal',
      satelliteImageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop',
    },
    agreements: [
      {
        id: 'a1',
        title: 'Land Lease Agreement 2024',
        signedDate: new Date('2024-01-14'),
        documentUrl: '#',
      },
      {
        id: 'a2',
        title: 'Crop Buyback Contract',
        signedDate: new Date('2024-01-14'),
        documentUrl: '#',
      },
    ],
    createdAt: new Date('2024-01-14'),
  },
  {
    id: '2',
    fullName: 'Priya Verma',
    phoneNumber: '+91 99001 12233',
    village: 'Nagpur',
    district: 'Nagpur',
    state: 'Maharashtra',
    profileImageUrl: 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?w=150&h=150&fit=crop',
    kyc: {
      aadhaarNumber: 'XXXX XXXX 7890',
      panNumber: 'FGHIJ5678K',
      address: 'Village Nagpur, Nagpur District, Maharashtra - 440001',
      bankName: 'Bank of Maharashtra',
      accountNumber: 'XXXX XXXX 9012',
      ifscCode: 'MAHB0000123',
      verified: true,
    },
    landMapping: {
      totalArea: 18,
      coordinates: [
        { lat: 21.1458, lng: 79.0882 },
        { lat: 21.1468, lng: 79.0892 },
        { lat: 21.1448, lng: 79.0902 },
        { lat: 21.1438, lng: 79.0872 },
      ],
      soilType: 'Black Cotton',
      irrigationType: 'Borewell',
      satelliteImageUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=300&fit=crop',
    },
    agreements: [
      {
        id: 'a3',
        title: 'Partnership Agreement',
        signedDate: new Date('2024-01-10'),
        documentUrl: '#',
      },
    ],
    createdAt: new Date('2024-01-10'),
  },
  {
    id: '3',
    fullName: 'Ramesh Choudhary',
    phoneNumber: '+91 88112 23344',
    village: 'Jaipur',
    taluka: 'Sanganer',
    district: 'Jaipur',
    state: 'Rajasthan',
    profileImageUrl: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150&h=150&fit=crop',
    kyc: {
      aadhaarNumber: 'XXXX XXXX 1234',
      address: 'Village Sanganer, Jaipur District, Rajasthan - 302029',
      bankName: 'Punjab National Bank',
      accountNumber: 'XXXX XXXX 3456',
      ifscCode: 'PUNB0012300',
      verified: false,
    },
    landMapping: {
      totalArea: 32,
      coordinates: [
        { lat: 26.8489, lng: 75.8059 },
        { lat: 26.8499, lng: 75.8069 },
        { lat: 26.8479, lng: 75.8079 },
        { lat: 26.8469, lng: 75.8049 },
      ],
      soilType: 'Sandy Loam',
      irrigationType: 'Drip',
      satelliteImageUrl: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop',
    },
    agreements: [],
    createdAt: new Date('2024-01-08'),
  },
  {
    id: '4',
    fullName: 'Lakshmi Narayana',
    phoneNumber: '+91 77889 90011',
    village: 'Guntur',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    kyc: {
      aadhaarNumber: 'XXXX XXXX 5678',
      panNumber: 'LMNOP9012Q',
      address: 'Village Guntur, Guntur District, Andhra Pradesh - 522001',
      bankName: 'Andhra Bank',
      accountNumber: 'XXXX XXXX 7890',
      ifscCode: 'ANDB0001234',
      verified: true,
    },
    landMapping: {
      totalArea: 45,
      coordinates: [
        { lat: 16.3067, lng: 80.4365 },
        { lat: 16.3077, lng: 80.4375 },
        { lat: 16.3057, lng: 80.4385 },
        { lat: 16.3047, lng: 80.4355 },
      ],
      soilType: 'Red Soil',
      irrigationType: 'Canal',
      satelliteImageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop',
    },
    agreements: [
      {
        id: 'a4',
        title: 'Cotton Procurement Contract',
        signedDate: new Date('2024-01-05'),
        documentUrl: '#',
      },
      {
        id: 'a5',
        title: 'Seed Supply Agreement',
        signedDate: new Date('2024-01-06'),
        documentUrl: '#',
      },
      {
        id: 'a6',
        title: 'Insurance Policy',
        signedDate: new Date('2024-01-07'),
        documentUrl: '#',
      },
    ],
    createdAt: new Date('2024-01-05'),
  },
];

// Simulated API functions
export const leadsApi = {
  getAll: async (): Promise<Lead[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...mockLeads];
  },
  
  create: async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newLead: Lead = {
      ...lead,
      id: String(Date.now()),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockLeads.push(newLead);
    return newLead;
  },
  
  updateStatus: async (id: string, status: LeadStatus): Promise<Lead> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const lead = mockLeads.find(l => l.id === id);
    if (!lead) throw new Error('Lead not found');
    lead.status = status;
    lead.updatedAt = new Date();
    return lead;
  },
};

export const farmersApi = {
  getAll: async (): Promise<Farmer[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...mockFarmers];
  },
};
