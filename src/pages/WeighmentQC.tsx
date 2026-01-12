import { useState } from 'react';
import { 
  Scale, Beaker, Truck, Filter, 
  CheckCircle2, AlertCircle, X, Save, 
  Search, Printer, MessageSquare, Plus, FileText, Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- TYPES ---

interface WeighmentRecord {
  id: string;
  weighment_no: string;
  date: string;
  farmer_name: string;
  farmer_id: string;
  gross_weight: number;
  tare_weight: number;
  net_weight: number;
  status: 'pending' | 'completed';
  qc_status?: 'pending' | 'completed';
  quality_grade?: string;
  brix?: number;
}

// --- MOCK DATA ---
const MOCK_DATA: WeighmentRecord[] = [
  { 
    id: 'w1', weighment_no: 'WGT-000007', date: '10 Jan 2026 22:11', 
    farmer_name: 'Rakesh', farmer_id: 'SBR-F-68294',
    gross_weight: 110, tare_weight: 100, net_weight: 10,
    status: 'pending', qc_status: 'pending'
  },
  { 
    id: 'w2', weighment_no: 'WGT-000006', date: '28 Dec 2025 13:38', 
    farmer_name: 'Kishan', farmer_id: 'SBR-F-91356',
    gross_weight: 100000, tare_weight: 100, net_weight: 99900,
    status: 'pending', qc_status: 'pending'
  },
  { 
    id: 'w3', weighment_no: 'WGT-000005', date: '27 Dec 2025 21:00', 
    farmer_name: 'Rakesh', farmer_id: 'SBR-F-68294',
    gross_weight: 25000, tare_weight: 6000, net_weight: 19000,
    status: 'completed', qc_status: 'completed', quality_grade: 'Grade A (Premium)', brix: 19.5
  },
  { 
    id: 'w4', weighment_no: 'WGT-000004', date: '25 Dec 2025 11:59', 
    farmer_name: 'Kishan', farmer_id: 'SBR-F-91356',
    gross_weight: 27000, tare_weight: 5000, net_weight: 22000,
    status: 'completed', qc_status: 'completed', quality_grade: 'Grade A (Premium)', brix: 18.2
  },
];

export default function WeighmentQCPage() {
  const [records, setRecords] = useState<WeighmentRecord[]>(MOCK_DATA);
  const [isWeighModalOpen, setIsWeighModalOpen] = useState(false);
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WeighmentRecord | null>(null);

  // --- DERIVED STATS ---
  const totalWeighments = records.length;
  const todayCount = 0; // Mock
  const totalWeight = records.reduce((acc, curr) => acc + curr.net_weight, 0);
  const pendingQC = records.filter(r => r.qc_status === 'pending').length;

  // --- ACTIONS ---
  const handleOpenQC = (record: WeighmentRecord) => {
    setSelectedRecord(record);
    setIsQCModalOpen(true);
  };

  const handleSaveWeighment = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Weighment Recorded Successfully");
    setIsWeighModalOpen(false);
  };

  const handleSaveQC = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Quality Check Completed");
    setIsQCModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-slate-900 animate-in fade-in duration-500">
      
      {/* 1. HEADER & TITLE */}
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Weighment & QC</h1>
        <div className="flex gap-2">
           <button className="p-2 text-gray-400 hover:text-gray-600"><span className="sr-only">Settings</span>⚙️</button>
           <button className="p-2 text-gray-400 hover:text-gray-600"><span className="sr-only">Notifications</span>🔔</button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total Weighments</p>
          <h3 className="text-2xl font-bold text-slate-900">{totalWeighments}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Today</p>
          <h3 className="text-2xl font-bold text-blue-600">{todayCount}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total Weight (kg)</p>
          <h3 className="text-2xl font-bold text-slate-900">{totalWeight.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Pending QC</p>
          <h3 className="text-2xl font-bold text-amber-500">{pendingQC}</h3>
        </div>
      </div>

      {/* 3. TOOLBAR */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by weighment number or farmer..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <button 
          onClick={() => setIsWeighModalOpen(true)}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Weighment
        </button>
      </div>

      {/* 4. TABLE SECTION */}
      <div className="max-w-7xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-slate-900">Weighment Records</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Weighment #</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Farmer</th>
                <th className="px-6 py-4">Gross (kg)</th>
                <th className="px-6 py-4">Tare (kg)</th>
                <th className="px-6 py-4">Net (kg)</th>
                <th className="px-6 py-4">QC Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-gray-600">{record.weighment_no}</td>
                  <td className="px-6 py-4 text-gray-600">{record.date}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{record.farmer_name}</div>
                    <div className="text-xs text-gray-400">{record.farmer_id}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{record.gross_weight.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-500">{record.tare_weight.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{record.net_weight.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {record.qc_status === 'pending' ? (
                      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200">
                        Pending
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                        {record.quality_grade}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {record.qc_status === 'pending' ? (
                        <button 
                          onClick={() => handleOpenQC(record)}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-md text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-slate-900 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" /> QC
                        </button>
                      ) : (
                        <>
                          <button className="p-1.5 border border-gray-200 rounded-md text-gray-400 hover:text-slate-900 hover:bg-gray-50">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 border border-gray-200 rounded-md text-green-600 hover:bg-green-50 hover:border-green-200">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: RECORD NEW WEIGHMENT --- */}
      {isWeighModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="font-bold text-xl text-slate-900">Record New Weighment</h3>
              <button onClick={() => setIsWeighModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSaveWeighment} className="p-6 space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Farmer *</label>
                <select className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-200 outline-none">
                  <option>Select farmer</option>
                  <option>Rakesh (SBR-F-68294)</option>
                  <option>Kishan (SBR-F-91356)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Vehicle (Optional)</label>
                <select className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-200 outline-none">
                  <option>Select vehicle</option>
                  {/* Reuse mock data if needed */}
                  <option>MH-12-AB-1234</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Gross Weight (kg) *</label>
                  <input type="number" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-200 outline-none" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">Tare Weight (kg)</label>
                  <input type="number" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-200 outline-none" placeholder="0" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Type</label>
                <select className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-200 outline-none">
                  <option>Incoming</option>
                  <option>Outgoing</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Notes</label>
                <textarea className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-200 outline-none h-24 resize-none" />
              </div>

              <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">
                Record Weighment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: QUALITY CHECK --- */}
      {isQCModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="font-bold text-xl text-slate-900">Quality Check</h3>
              <button onClick={() => setIsQCModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>

            <form onSubmit={handleSaveQC} className="p-6 space-y-5">
              
              {/* Readings Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">Brix Reading</label>
                  <input type="number" step="0.1" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 text-center font-mono font-bold" defaultValue="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">Pol Reading</label>
                  <input type="number" step="0.1" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 text-center font-mono font-bold" defaultValue="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">Fiber Content (%)</label>
                  <input type="number" step="0.1" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 text-center font-mono font-bold" defaultValue="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">Trash (%)</label>
                  <input type="number" step="0.1" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 text-center font-mono font-bold" defaultValue="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">Moisture (%)</label>
                  <input type="number" step="0.1" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 text-center font-mono font-bold" defaultValue="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">Deductions (%)</label>
                  <input type="number" step="0.1" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 text-center font-mono font-bold" defaultValue="0" />
                </div>
              </div>

              {/* Quality Grade */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Quality Grade</label>
                <select className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-200 outline-none">
                  <option>Grade A (Premium)</option>
                  <option>Grade B (Standard)</option>
                  <option>Grade C (Sub-standard)</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Notes</label>
                <textarea className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-200 outline-none h-20 resize-none" />
              </div>

              {/* Images */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">QC Images</label>
                <div className="flex items-center gap-3">
                  <button type="button" className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    <Camera className="w-4 h-4" /> Add Photos
                  </button>
                  <span className="text-xs text-gray-400">0/5 images</span>
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">
                Complete QC
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}