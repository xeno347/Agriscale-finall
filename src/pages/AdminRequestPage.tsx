import React, { useState } from 'react';
import { 
  FileText, CheckCircle2, MessageSquare, 
  Plus, ArrowRight, UserCheck, Settings,
  Building2, Send, X, ClipboardCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminRequestData {
  id: string;
  title: string;
  description: string;
  deptApprovals: string;
  deptReason: string;
  adminNotes: string;
  forwardedTo?: string;
  status: 'dept_review' | 'admin_review' | 'forwarding' | 'completed';
}

const AdminRequestPage = () => {
  const [request, setRequest] = useState<AdminRequestData>({
    id: "REQ-2026-001",
    title: "Heavy Machinery Transport",
    description: "Requesting logistics for moving 3 JCB excavators from Plant A to Field 12.",
    deptApprovals: "Manager Approved",
    deptReason: "Urgent cultivation window starting Feb 5th.",
    adminNotes: "",
    status: 'dept_review'
  });

  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);

  const handleForward = (dept: string) => {
    setRequest(prev => ({ ...prev, forwardedTo: dept, status: 'completed' }));
    setIsForwardModalOpen(false);
    toast.success(`Request successfully forwarded to ${dept}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-[1600px] mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Admin Request</h1>
          <p className="text-slate-500 mt-1">Manage departmental approvals and administrative forwarding</p>
        </div>
        <div className="flex gap-3">
          <span className="px-4 py-2 bg-white border rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
            ID: {request.id}
          </span>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMN 1: CONCERN DEPARTMENT */}
        <div className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-700 px-1">
            <Building2 className="w-5 h-5" /> Concern Department
          </h2>
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm flex-1 space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Request Details</label>
              <h3 className="font-bold text-slate-900">{request.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{request.description}</p>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase block">Department Approvals & Why</label>
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                <p className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> {request.deptApprovals}
                </p>
                <p className="text-sm text-slate-600 italic">"{request.deptReason}"</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 text-emerald-600 font-bold bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
                <span>Approved and Forwarded</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: ADMIN */}
        <div className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-700 px-1">
            <Settings className="w-5 h-5" /> Admin
          </h2>
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-md flex-1 space-y-6 relative overflow-hidden">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Request Details</label>
              <p className="text-sm font-medium text-slate-800 line-clamp-2">{request.description}</p>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase block">Admin Approval Notes</label>
              <textarea 
                className="w-full h-40 p-4 bg-white border-2 border-slate-200 rounded-xl focus:border-slate-900 transition-colors outline-none text-sm"
                placeholder="Enter final approval notes here..."
                value={request.adminNotes}
                onChange={(e) => setRequest({...request, adminNotes: e.target.value})}
              />
            </div>
            <button 
              onClick={() => {
                if(!request.adminNotes) return toast.error("Please add admin notes first");
                setRequest({...request, status: 'forwarding'});
                toast.success("Admin approval confirmed");
              }}
              className={cn(
                "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all",
                request.status === 'dept_review' || request.status === 'admin_review' 
                ? "bg-slate-900 text-white hover:bg-slate-800" 
                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
              )}
            >
              {request.status === 'forwarding' || request.status === 'completed' ? (
                <><CheckCircle2 className="w-5 h-5" /> Approved and Forwarded</>
              ) : (
                <><FileText className="w-5 h-5" /> Approve Request</>
              )}
            </button>
          </div>
        </div>

        {/* COLUMN 3: FORWARD TO DEPARTMENT */}
        <div className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-700 px-1">
            <Send className="w-5 h-5" /> Forward to Department
          </h2>
          <div className="bg-white border-2 border-slate-200 border-dashed rounded-2xl flex-1 flex flex-col items-center justify-center p-8 text-center">
            {request.forwardedTo ? (
              <div className="animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{request.forwardedTo}</h3>
                <p className="text-sm text-slate-500 mt-2">Request successfully dispatched</p>
              </div>
            ) : (
              <button 
                onClick={() => setIsForwardModalOpen(true)}
                disabled={request.status !== 'forwarding'}
                className={cn(
                  "w-32 h-32 rounded-3xl flex items-center justify-center transition-all duration-300 border-4 shadow-sm",
                  request.status === 'forwarding' 
                  ? "bg-slate-50 border-slate-900 text-slate-900 hover:scale-105 cursor-pointer" 
                  : "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                )}
              >
                <Plus className="w-12 h-12" strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>

      {isForwardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg">Destination Department</h3>
              <button onClick={() => setIsForwardModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-2">
              {['Logistics', 'Operations', 'Maintenance', 'Procurement'].map((dept) => (
                <button 
                  key={dept}
                  onClick={() => handleForward(dept)}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl border transition-all group text-left"
                >
                  <span className="font-semibold text-slate-700">{dept}</span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRequestPage;