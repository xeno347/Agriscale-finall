import { useState } from 'react';
import { 
  Tractor, 
  Plus, 
  Search, 
  Download, 
  ChevronRight, 
  X, 
  Package, 
  IndianRupee,
  Calendar,
  User,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- TYPES ---

// An individual rental activity record (Who rented what from the set)
export interface RentalTransaction {
  id: string;
  farmerName: string;
  farmerId: string;
  blockId: string;
  activity: string; // e.g., Ploughing
  cost: number;
  date: string;
  status: 'Completed' | 'Pending';
}

// The Rental Set Card definition
export interface RentalSet {
  id: string;
  name: string;
  description: string;
  // The list of individual rentals belonging to this set
  transactions: RentalTransaction[];
}

// --- MOCK DATA ---

const MOCK_RENTAL_SETS: RentalSet[] = [
  {
    id: 'set1',
    name: 'Standard Tillage Kit (Set 1)',
    description: 'Basic equipment for soil preparation, including ploughs and harrows suitable for small to medium plots.',
    transactions: [
      { id: 't1', farmerName: 'Ramesh Patel', farmerId: 'SBR-F-101', blockId: 'B-01', activity: 'Ploughing', cost: 5000, date: '10 Jan 2026', status: 'Completed' },
      { id: 't3', farmerName: 'Ramesh Patel', farmerId: 'SBR-F-101', blockId: 'B-01', activity: 'Harrowing', cost: 3000, date: '12 Jan 2026', status: 'Pending' },
    ]
  },
  {
    id: 'set2',
    name: 'Irrigation essentials (Set 2)',
    description: 'Portable pumps, pipes, and sprinklers for manual irrigation deployment in Zone B.',
    transactions: [
      { id: 't2', farmerName: 'Suresh Kumar', farmerId: 'SBR-F-102', blockId: 'B-02', activity: 'Irrigation Setup', cost: 2500, date: '12 Jan 2026', status: 'Pending' }
    ]
  },
  {
    id: 'set3',
    name: 'Harvesting Tools (Set 3)',
    description: 'Manual harvesting tools, crates, and basic processing equipment.',
    transactions: [
       { id: 't4', farmerName: 'Anita Desai', farmerId: 'SBR-F-103', blockId: 'C-04', activity: 'Harvesting Assist', cost: 8000, date: '18 Jan 2026', status: 'Completed' },
       { id: 't5', farmerName: 'Vikram Singh', farmerId: 'SBR-F-105', blockId: 'C-04', activity: 'Crate Rental', cost: 1200, date: '19 Jan 2026', status: 'Completed' }
    ]
  },
  {
    id: 'set4',
    name: 'Heavy Machinery (Set 4)',
    description: 'Tractors and heavy-duty attachments for large-scale operations.',
    transactions: [] // Empty set example
  }
];

export default function RentalDirectory() {
  const [rentalSets, setRentalSets] = useState<RentalSet[]>(MOCK_RENTAL_SETS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals State
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  // The set currently being viewed in detail (null means modal closed)
  const [viewingSet, setViewingSet] = useState<RentalSet | null>(null);

  // Form state for creating a new set
  const [newSetForm, setNewSetForm] = useState({ name: '', description: '' });

  // Calculate total cost dynamically for a set
  const calculateSetTotal = (set: RentalSet) => {
    return set.transactions.reduce((sum, t) => sum + t.cost, 0);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetForm.name) {
      toast.error("Set name is required");
      return;
    }

    const newSet: RentalSet = {
      id: `set-${Date.now()}`,
      name: newSetForm.name,
      description: newSetForm.description,
      transactions: [] // Starts empty
    };

    setRentalSets([...rentalSets, newSet]);
    setCreateModalOpen(false);
    setNewSetForm({ name: '', description: '' });
    toast.success(`${newSet.name} created successfully!`);
  };

  const handleExportSet = (setName: string) => {
    toast.info(`Downloading report for ${setName}...`);
    // Actual download logic would go here
  };

  const filteredSets = rentalSets.filter(set => 
    set.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 min-h-screen bg-gray-50/50 font-sans animate-in fade-in duration-300">
      
      {/* --- HEADER & ACTIONS --- */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Rental Directory</h1>
          <p className="text-slate-500 mt-1">Manage rental sets and track equipment usage costs.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
           {/* Search */}
           <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search rental sets..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow"
            />
          </div>

          {/* CREATE BUTTON */}
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm hover:shadow-md whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Create Rental Set
          </button>
        </div>
      </div>

      {/* --- CARD GRID --- */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSets.map((set) => {
          const totalCost = calculateSetTotal(set);
          const activeCount = set.transactions.length;
          
          return (
            <div key={set.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between h-full">
              
              {/* Card Header */}
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
                    <Tractor className="w-6 h-6" />
                  </div>
                  {/* Export Button per set */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleExportSet(set.name); }}
                    title="Export Set Details"
                    className="p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1">{set.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-6 h-10">{set.description}</p>

                {/* Metrics */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Estimated Cost</p>
                  <div className="flex items-center text-2xl font-bold text-slate-900">
                    <IndianRupee className="w-5 h-5 mr-1 text-slate-400" />
                    {totalCost.toLocaleString()}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Package className="w-4 h-4" /> {activeCount} active transaction{activeCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              
              {/* Card Footer Action */}
              <button 
                onClick={() => setViewingSet(set)}
                className="w-full py-3 bg-white border-2 border-gray-200 text-slate-700 rounded-xl font-bold text-sm hover:border-slate-900 hover:text-slate-900 transition-all flex items-center justify-center gap-2 group-hover:bg-slate-50"
              >
                View Details <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
              </button>
            </div>
          );
        })}
      </div>


      {/* ================= MODALS ================= */}

      {/* 1. CREATE RENTAL SET POPUP */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">Create New Rental Set</h3>
              <button onClick={() => setCreateModalOpen(false)} className="bg-white/10 p-1.5 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Set Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g., Advanced Spraying Kit"
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                  value={newSetForm.name}
                  onChange={(e) => setNewSetForm({ ...newSetForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Description</label>
                <textarea 
                  placeholder="Describe the contents or purpose of this set..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none h-24"
                  value={newSetForm.description}
                  onChange={(e) => setNewSetForm({ ...newSetForm, description: e.target.value })}
                />
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" /> Create Set
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. VIEW DETAILS MODAL (Show items rented and by whom) */}
      {viewingSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-white p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Tractor className="w-5 h-5 text-slate-700"/>
                  <h3 className="font-bold text-xl text-slate-900">{viewingSet.name}</h3>
                </div>
                <p className="text-sm text-slate-500">{viewingSet.description}</p>
              </div>
              <button onClick={() => setViewingSet(null)} className="text-gray-400 hover:text-slate-900 p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6"/>
              </button>
            </div>
            
            {/* Modal Body - Transaction List */}
            <div className="p-6 overflow-y-auto flex-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Transactions & Rentals</h4>
              
              {viewingSet.transactions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">No active rentals for this set yet.</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3">Farmer</th>
                        <th className="px-4 py-3">Activity</th>
                        <th className="px-4 py-3 text-right">Cost</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewingSet.transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                  <User className="w-4 h-4"/>
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{t.farmerName}</div>
                                  <div className="text-xs text-gray-500 font-mono">{t.farmerId} • {t.blockId}</div>
                                </div>
                             </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">{t.activity}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{t.cost.toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5"/> {t.date}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-1 rounded-full flex items-center gap-1 w-fit",
                              t.status === 'Completed' ? "bg-green-50 text-green-700 border border-green-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                            )}>
                              {t.status === 'Completed' ? <CheckCircle2 className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-between items-center">
               <div className="flex flex-col">
                 <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Revenue</span>
                 <div className="flex items-center text-2xl font-bold text-slate-900">
                    <IndianRupee className="w-5 h-5 mr-1 text-slate-400" />
                    {calculateSetTotal(viewingSet).toLocaleString()}
                 </div>
               </div>
               <button 
                 onClick={() => handleExportSet(viewingSet.name)}
                 className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-gray-100 hover:border-gray-400 transition-all shadow-sm"
               >
                 <Download className="w-4 h-4"/> Export Report
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}