import { useEffect, useState } from 'react';
import { 
  Plus, Upload, Search, Filter, 
  X, User, Mail, Phone, Calendar, 
  Briefcase, Building2, Users,
  Image as ImageIcon,
  IdCard,
  Landmark,
  Hash,
  KeyRound
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBaseUrl } from '@/lib/config';
import { toast } from 'sonner';
import CredentialsDialog, { type FarmerCredentials } from '@/components/farmers/CredentialsDialog';

// --- TYPES ---
interface StaffApiItem {
  staff_id: string;
  created_at: string;
  account_details: {
    bank_name: string;
    ifsc_code: string;
    account_number: string;
  };
  assigned_blocks: any[];
  assigned_vehicles: any[];
  staff_information: {
    staff_name: string;
    employment_type: 'Permanent' | 'Contract' | 'Temporary' | string;
    staff_phone: string;
    staff_department: string;
    staff_designation: string;
  };
  credentials?: FarmerCredentials | null;
}

const StaffOnboarding = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffList, setStaffList] = useState<StaffApiItem[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [joiningDate, setJoiningDate] = useState('2026-01-02');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [employmentType, setEmploymentType] = useState<'Permanent' | 'Contract' | 'Temporary'>('Permanent');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentialsDialogStaffId, setCredentialsDialogStaffId] = useState<string | null>(null);

  const resetForm = () => {
    setFormStep(1);
    setFullName('');
    setPhone('');
    setEmail('');
    setJoiningDate('2026-01-02');
    setDepartment('');
    setDesignation('');
    setEmploymentType('Permanent');
    setBankName('');
    setAccountNumber('');
    setIfscCode('');
  };

  const handleBulkUpload = () => {
    toast.success("Bulk upload feature triggered");
  };

  const fetchAllStaff = async () => {
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    try {
      setIsLoadingStaff(true);
      const res = await fetch(`${BASE_URL}/admin_staff/get_all_staff`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      const data = await res.json();

      if (!res.ok) {
        const message = data?.message || data?.error || 'Failed to fetch staff';
        toast.error(message);
        return;
      }

      if (!Array.isArray(data)) {
        toast.error('Invalid staff response');
        return;
      }

      setStaffList(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch staff');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchAllStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const form = document.getElementById('add-staff-form') as HTMLFormElement | null;
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    const payload = {
      staff_information: {
        staff_name: fullName.trim(),
        staff_phone: phone.trim(),
        staff_department: department,
        staff_designation: designation,
        employment_type: employmentType,
      },
      account_details: {
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
      },
      assigned_vehicles: [],
      assigned_blocks: [],
    };

    try {
      setIsSubmitting(true);
      const res = await fetch(`${BASE_URL}/admin_staff/add_staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore non-JSON responses
      }

      if (!res.ok || (data?.status && data.status !== 'success')) {
        const message = data?.message || data?.error || 'Failed to add employee';
        toast.error(message);
        return;
      }

      toast.success('New employee added successfully');
      await fetchAllStaff();
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleNextStep = () => {
    const form = document.getElementById('add-staff-form') as HTMLFormElement | null;
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setFormStep(2);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const filteredStaff = staffList.filter((staff) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const name = staff.staff_information?.staff_name?.toLowerCase() ?? '';
    const id = staff.staff_id?.toLowerCase() ?? '';
    return name.includes(q) || id.includes(q);
  });

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
            onClick={handleOpenModal}
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
              <th className="px-6 py-4 text-center font-semibold text-muted-foreground">Credentials</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoadingStaff ? (
              <tr>
                <td className="px-6 py-8 text-center text-muted-foreground" colSpan={7}>
                  Loading staff...
                </td>
              </tr>
            ) : filteredStaff.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-center text-muted-foreground" colSpan={7}>
                  No staff found.
                </td>
              </tr>
            ) : (
              filteredStaff.map((staff) => {
                const staffName = staff.staff_information?.staff_name ?? '-';
                const staffDesignation = staff.staff_information?.staff_designation ?? '-';
                const staffDepartment = staff.staff_information?.staff_department ?? '-';
                const staffPhone = staff.staff_information?.staff_phone ?? '-';
                const staffType = staff.staff_information?.employment_type ?? '-';

                return (
                  <tr key={staff.staff_id} className="hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {(staffName || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{staffName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground">{staffDesignation}</td>
                    <td className="px-6 py-4 text-muted-foreground">{staffDepartment}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium border",
                          staffType === 'Permanent'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        )}
                      >
                        {staffType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{staffPhone}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <CredentialsDialog
                        farmerId={staff.staff_id}
                        credentials={staff.credentials}
                        open={credentialsDialogStaffId === staff.staff_id}
                        onOpenChange={(nextOpen) => setCredentialsDialogStaffId(nextOpen ? staff.staff_id : null)}
                        onSaved={(next) =>
                          setStaffList(prev => prev.map(s => (s.staff_id === staff.staff_id ? { ...s, credentials: next } : s)))
                        }
                        entity="staff"
                        role={staff.staff_information?.staff_designation ?? ''}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- ADD EMPLOYEE MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-2xl rounded-xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-xl text-foreground">Add New Employee</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Step {formStep} of 2</p>
              </div>
              <button 
                onClick={handleCloseModal} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="p-6 overflow-y-auto">
              <form id="add-staff-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {formStep === 1 ? (
                  <>
                    {/* Profile Image */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Profile Image</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10 file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/80"
                        />
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">Upload a clear face photo.</p>
                    </div>

                    {/* Aadhaar Card Photo */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Aadhaar Card Photo</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10 file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/80"
                        />
                        <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">Upload front side (preferred).</p>
                    </div>
                
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Full Name *</label>
                  <div className="relative">
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10"
                      placeholder="e.g. John Doe"
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Phone *</label>
                  <div className="relative">
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10"
                      placeholder="+91 00000 00000"
                    />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10"
                      placeholder="john@example.com"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Joining Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Joining Date *</label>
                  <div className="relative">
                    <input
                      required
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Department *</label>
                  <div className="relative">
                    <select
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10 appearance-none"
                    >
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
                  <label className="text-sm font-medium text-foreground">Designation *</label>
                  <div className="relative">
                    <select
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10 appearance-none"
                    >
                      <option value="">Select designation</option>
                      <option value="Driver">Driver</option>
                      <option value="Executive">Executive</option>
                      <option value="Field Manager">Field Manager</option>
                      <option value="Manager">Manager</option>
                      <option value="Operator">Operator</option>
                      <option value="Supervisor">Supervisor</option>
                    </select>
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Driving Licence Photo (Driver only) */}
                {designation === 'Driver' && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Driving Licence Photo</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/80"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Required for drivers.</p>
                  </div>
                )}

                {/* Employment Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
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

                  </>
                ) : (
                  <>
                    {/* Bank Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Bank Name *</label>
                      <div className="relative">
                        <input
                          required
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10"
                          placeholder="e.g. State Bank of India"
                        />
                        <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    {/* Account Number */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Account Number *</label>
                      <div className="relative">
                        <input
                          required
                          inputMode="numeric"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pl-10"
                          placeholder="e.g. 1234567890"
                        />
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    {/* IFSC */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-foreground">IFSC Code *</label>
                      <div className="relative">
                        <input
                          required
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value)}
                          className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          placeholder="e.g. SBIN0001234"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">Used for bank transfers / salary payments.</p>
                    </div>
                  </>
                )}

              </form>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={handleCloseModal} 
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cancel
              </button>

              {formStep === 2 && (
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Back
                </button>
              )}

              {formStep === 1 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  form="add-staff-form"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Creating...' : 'Create Employee'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default StaffOnboarding;