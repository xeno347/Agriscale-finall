import { useState } from 'react';
import { 
  Plus, Upload, Search, Filter, 
  X, User, Mail, Phone, Calendar, 
  MapPin, Briefcase, Building2, Users 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- TYPES ---
interface Staff {
  id: string;
  fullName: string;
  department: string;
  designation: string;
  type: 'Permanent' | 'Contract' | 'Temporary';
  phone: string;
  status: 'Active' | 'On Leave';
}

// --- MOCK DATA ---
const MOCK_STAFF: Staff[] = [
  { id: 'S001', fullName: 'Rajesh Kumar', department: 'Operations', designation: 'Field Officer', type: 'Permanent', phone: '+91 98765 43210', status: 'Active' },
  { id: 'S002', fullName: 'Amit Singh', department: 'Logistics', designation: 'Driver', type: 'Contract', phone: '+91 98765 43211', status: 'Active' },
];

const StaffOnboarding = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleBulkUpload = () => {
    toast.success("Bulk upload feature triggered");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddModalOpen(false);
    toast.success("New employee added successfully");
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300 relative">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Staff Onboarding</h1>
          <p className="text-muted-foreground mt-1">Manage employee profiles and onboarding.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleBulkUpload}
            className="flex items-center gap-2 border border-border bg-white text-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      {/* --- FILTERS & LIST --- */}
      <div className="flex gap-4 items-center bg-card border border-border p-3 rounded-lg shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search staff by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
          />
        </div>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Name</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Role</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Department</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Type</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Contact</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MOCK_STAFF.map((staff) => (
              <tr key={staff.id} className="hover:bg-muted/20">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {staff.fullName.charAt(0)}
                    </div>
                    <span className="font-medium text-foreground">{staff.fullName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-foreground">{staff.designation}</td>
                <td className="px-6 py-4 text-muted-foreground">{staff.department}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium border",
                    staff.type === 'Permanent' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-orange-50 text-orange-700 border-orange-200"
                  )}>
                    {staff.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted-foreground">{staff.phone}</td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600"/>
                    {staff.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- ADD EMPLOYEE MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-2xl rounded-xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="font-bold text-xl text-foreground">Add New Employee</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="p-6 overflow-y-auto">
              <form id="add-staff-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Full Name *</label>
                  <div className="relative">
                    <input required className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10" placeholder="e.g. John Doe" />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Phone *</label>
                  <div className="relative">
                    <input required type="tel" className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10" placeholder="+91 00000 00000" />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <div className="relative">
                    <input type="email" className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10" placeholder="john@example.com" />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Joining Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Joining Date *</label>
                  <div className="relative">
                    <input required type="date" defaultValue="2026-01-02" className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10" />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Department</label>
                  <div className="relative">
                    <select className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10 appearance-none">
                      <option value="">Select department</option>
                      <option value="Admin">Admin</option>
                      <option value="Finance">Finance</option>
                      <option value="HR">HR</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Operations">Operations</option>
                    </select>
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Designation */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Designation</label>
                  <div className="relative">
                    <select className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10 appearance-none">
                      <option value="">Select designation</option>
                      <option value="Driver">Driver</option>
                      <option value="Executive">Executive</option>
                      <option value="Field Officer">Field Officer</option>
                      <option value="Manager">Manager</option>
                      <option value="Operator">Operator</option>
                      <option value="Supervisor">Supervisor</option>
                    </select>
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Location</label>
                  <div className="relative">
                    <select className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10 appearance-none">
                      <option value="">Select location</option>
                      <option value="HQ">Headquarters</option>
                      <option value="Warehouse A">Warehouse A</option>
                      <option value="Field Site 1">Field Site 1</option>
                    </select>
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Geo-Fence */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Geo-Fence Location (Attendance)</label>
                  <select className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                    <option value="">Select geo-fence location</option>
                    <option value="GF-001">Main Office Geo-Fence</option>
                    <option value="GF-002">Warehouse Geo-Fence</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground">Used for geo-fenced attendance tracking</p>
                </div>

                {/* Employment Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Employment Type</label>
                  <select className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Temporary">Temporary</option>
                  </select>
                </div>

                {/* User Account Link */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Link to User Account</label>
                  <div className="relative">
                    <select className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10 appearance-none">
                      <option value="">Select user account (optional)</option>
                      <option value="user1">rajesh.kumar@sbr.com</option>
                      <option value="user2">amit.singh@sbr.com</option>
                    </select>
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Link this employee to a user account to enable self-service attendance.</p>
                </div>

              </form>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)} 
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="add-staff-form"
                className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              >
                Create Employee
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default StaffOnboarding;