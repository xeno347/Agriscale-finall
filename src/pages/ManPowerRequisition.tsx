import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { getBaseUrl } from '@/lib/config';
import { getMrfSignatureEntry, readMrfSignatureCache, extractStatusFromEntry } from '@/lib/mrfSignatureCache';
import { cn } from '@/lib/utils';
import { Plus, ReceiptText, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

type ImpactLevel = 'High' | 'Medium' | 'Low' | '';
type ContractType = 'Permanent' | 'Temporary' | '';
type VacancyReason = 'Resignation' | 'Termination' | 'New Position' | '';
type RequisitionStep = 1 | 2 | 3;

interface BillingRow {
  id: string;
  designation: string;
  ageLimit: string;
  quantity: string;
  jd: string;
  department: string;
  ctc: string;
}

interface RequisitionRecord {
  id: string;
  mrfNo: string;
  department: string;
  subDepartment: string;
  targetDate: string;
  impactLevel: Exclude<ImpactLevel, ''>;
  contractType: Exclude<ContractType, ''>;
  reasonForVacancy: Exclude<VacancyReason, ''>;
  billingRows: BillingRow[];
  eligibilityCriteria: string;
  qualification: string;
  competence: string;
  experience: string;
  skillsRequired: string;
  areaOfExpertise: string;
  totalCtc: number;
  grandTotal: number;
  createdAt: string;
  adminOpsApprovalStatus: string;
  directorApprovalStatus: string;
}

interface ApiBillingDetail {
  max_age?: number;
  Designation?: string;
  quantity?: number;
  CTC?: number;
  jd?: string;
  min_age?: number;
  department?: string;
}

interface ApiRequisition {
  MRF_no?: string;
  request_details?: {
    sub_department?: string;
    contact_type?: string;
    department?: string;
    reason_of_vacancy?: string;
    impact?: string;
  };
  billing_details?: ApiBillingDetail[];
  additional_specifications?: {
    competences?: string;
    skills?: string;
    qualification?: string;
    eligibility_criteria?: string;
    experience?: string;
    area_of_expertise?: string;
  };
  total_budget?: number;
  created_at?: string;
  admin_ops_approval_status?: string;
  director_approval_status?: string;
}

const departmentOptions = [
  'Human Resource',
  'Directors Office',
  'Finance',
  'Operations',
  'Projects',
  'Procurement',
  'Logistics',
  'Cultivation',
];

const subDepartmentOptions = [
  'Administration',
  'Recruitment',
  'Payroll',
  'Training',
  'Employee Relations',
  'Compliance',
];

const designationOptions = [
  'HR Executive',
  'HR Officer',
  'HR Manager',
  'Recruiter',
  'Coordinator',
  'Supervisor',
  'Assistant',
];

const stepLabels = ['Request Details', 'Billing Structure', 'Additional Specification'];

const createRow = (): BillingRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  designation: '',
  ageLimit: '',
  quantity: '',
  jd: '',
  department: '',
  ctc: '',
});

const blankRequisition = () => ({
  mrfNo: '',
  department: '',
  subDepartment: '',
  targetDate: '',
  impactLevel: '' as ImpactLevel,
  contractType: '' as ContractType,
  reasonForVacancy: '' as VacancyReason,
  billingRows: [createRow()],
  eligibilityCriteria: '',
  qualification: '',
  competence: '',
  experience: '',
  skillsRequired: '',
  areaOfExpertise: '',
});

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const rowTotal = (row: BillingRow) => toNumber(row.quantity) * toNumber(row.ctc);

const parseAgeRange = (value: string) => {
  const parts = value
    .split(/[^0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part));

  if (parts.length === 0) {
    return { minAge: 0, maxAge: 0 };
  }

  if (parts.length === 1) {
    return { minAge: parts[0], maxAge: parts[0] };
  }

  return { minAge: parts[0], maxAge: parts[1] };
};

const mapApiRequisitionToRecord = (item: ApiRequisition, index: number): RequisitionRecord => {
  const billingRows: BillingRow[] = (item.billing_details || []).map((bill, billIndex) => ({
    id: `${item.MRF_no || 'mrf'}-${index}-${billIndex}`,
    designation: String(bill.Designation || ''),
    ageLimit: `${Number(bill.min_age || 0)}-${Number(bill.max_age || 0)}`,
    quantity: String(Number(bill.quantity || 0)),
    jd: String(bill.jd || ''),
    department: String(bill.department || ''),
    ctc: String(Number(bill.CTC || 0)),
  }));

  return {
    id: `${item.MRF_no || 'mrf'}-${index}`,
    mrfNo: String(item.MRF_no || ''),
    department: String(item.request_details?.department || ''),
    subDepartment: String(item.request_details?.sub_department || ''),
    targetDate: '',
    impactLevel: (item.request_details?.impact as Exclude<ImpactLevel, ''>) || 'Low',
    contractType: (item.request_details?.contact_type as Exclude<ContractType, ''>) || 'Temporary',
    reasonForVacancy: (item.request_details?.reason_of_vacancy as Exclude<VacancyReason, ''>) || 'New Position',
    billingRows,
    eligibilityCriteria: String(item.additional_specifications?.eligibility_criteria || ''),
    qualification: String(item.additional_specifications?.qualification || ''),
    competence: String(item.additional_specifications?.competences || ''),
    experience: String(item.additional_specifications?.experience || ''),
    skillsRequired: String(item.additional_specifications?.skills || ''),
    areaOfExpertise: String(item.additional_specifications?.area_of_expertise || ''),
    totalCtc: Number(item.total_budget || 0),
    grandTotal: Number(item.total_budget || 0),
    createdAt: String(item.created_at || new Date().toISOString()),
    adminOpsApprovalStatus: String(item.admin_ops_approval_status || 'pending'),
    directorApprovalStatus: String(item.director_approval_status || 'pending'),
  };
};

const formatStatus = (value: string) => {
  const lowered = String(value || '').trim().toLowerCase();
  if (!lowered) return 'Pending';
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
};

const statusClass = (value: string) => {
  const lowered = String(value || '').trim().toLowerCase();
  if (lowered === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (lowered === 'rejected' || lowered === 'reject') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const displaySignatureText = (value: string) => {
  const lowered = String(value || '').trim().toLowerCase();
  return 'Pending';
};

const ManPowerRequisition = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<RequisitionStep>(1);
  const [records, setRecords] = useState<RequisitionRecord[]>([]);
  const [form, setForm] = useState(blankRequisition());
  const [isFetchingMrfNo, setIsFetchingMrfNo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  const totalCtc = useMemo(() => form.billingRows.reduce((sum, row) => sum + rowTotal(row), 0), [form.billingRows]);

  const openDialog = () => {
    setForm(blankRequisition());
    setActiveStep(1);
    setDialogOpen(true);
  };

  const fetchNewMrfNo = async () => {
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    setIsFetchingMrfNo(true);
    try {
      const response = await fetch(`${BASE_URL}/HRMS/get_new_MRF_no`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      const data = await response.json();

      if (!response.ok || !data?.success || !data?.new_MRF_no) {
        throw new Error(data?.message || data?.error || 'Unable to fetch MRF number');
      }

      setForm((current) => ({ ...current, mrfNo: String(data.new_MRF_no) }));
    } catch (error: any) {
      toast.error(error?.message || 'Unable to fetch MRF number');
    } finally {
      setIsFetchingMrfNo(false);
    }
  };

  const fetchAllRequisitions = async () => {
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    setIsLoadingRecords(true);
    try {
      const response = await fetch(`${BASE_URL}/HRMS/get_all_MRF`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      const data = await response.json();

      if (!response.ok || !data?.success || !Array.isArray(data?.requisitions)) {
        throw new Error(data?.message || data?.error || 'Unable to fetch requisitions');
      }

      const mapped = data.requisitions.map((item: ApiRequisition, index: number) => mapApiRequisitionToRecord(item, index));
      setRecords(mapped);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to fetch requisitions');
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const updateRow = (rowId: string, field: keyof BillingRow, value: string) => {
    setForm((current) => ({
      ...current,
      billingRows: current.billingRows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  };

  const addRow = () => {
    setForm((current) => ({
      ...current,
      billingRows: [...current.billingRows, createRow()],
    }));
  };

  const removeRow = (rowId: string) => {
    setForm((current) => {
      if (current.billingRows.length === 1) {
        return current;
      }

      return {
        ...current,
        billingRows: current.billingRows.filter((row) => row.id !== rowId),
      };
    });
  };

  const handleCreateRequisition = async () => {
    if (!form.mrfNo.trim() || !form.department || !form.subDepartment || !form.targetDate || !form.impactLevel || !form.contractType || !form.reasonForVacancy) {
      toast.error('Complete Step 1 before creating the requisition.');
      setActiveStep(1);
      return;
    }

    if (!form.billingRows.some((row) => row.designation.trim() || row.jd.trim() || row.ctc.trim() || row.quantity.trim())) {
      toast.error('Add at least one billing row in Step 2.');
      setActiveStep(2);
      return;
    }

    const billingDetails = form.billingRows
      .filter((row) => row.designation.trim() || row.jd.trim() || row.ctc.trim() || row.quantity.trim())
      .map((row) => {
        const { minAge, maxAge } = parseAgeRange(row.ageLimit);
        return {
          Designation: row.designation,
          min_age: minAge,
          max_age: maxAge,
          quantity: toNumber(row.quantity),
          jd: row.jd,
          department: row.department,
          CTC: toNumber(row.ctc),
        };
      });

    const payload = {
      MRF_no: form.mrfNo,
      request_details: {
        department: form.department,
        sub_department: form.subDepartment,
        impact: form.impactLevel,
        contact_type: form.contractType,
        reason_of_vacancy: form.reasonForVacancy,
      },
      billing_details: billingDetails,
      additional_specifications: {
        eligibility_criteria: form.eligibilityCriteria,
        qualification: form.qualification,
        competences: form.competence,
        skills: form.skillsRequired,
        experience: form.experience,
        area_of_expertise: form.areaOfExpertise,
      },
      total_budget: totalCtc,
    };

    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    setIsSubmitting(true);
    try {
      const response = await fetch(`${BASE_URL}/HRMS/make_manpoer_requisition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to create requisition');
      }

      toast.success(data?.message || 'Man power requisition created.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create requisition');
      return;
    } finally {
      setIsSubmitting(false);
    }

    const nextRecord: RequisitionRecord = {
      id: `${Date.now()}`,
      mrfNo: form.mrfNo.trim(),
      department: form.department,
      subDepartment: form.subDepartment,
      targetDate: form.targetDate,
      impactLevel: form.impactLevel as Exclude<ImpactLevel, ''>,
      contractType: form.contractType as Exclude<ContractType, ''>,
      reasonForVacancy: form.reasonForVacancy as Exclude<VacancyReason, ''>,
      billingRows: form.billingRows,
      eligibilityCriteria: form.eligibilityCriteria.trim(),
      qualification: form.qualification.trim(),
      competence: form.competence.trim(),
      experience: form.experience.trim(),
      skillsRequired: form.skillsRequired.trim(),
      areaOfExpertise: form.areaOfExpertise.trim(),
      totalCtc,
      grandTotal: totalCtc,
      createdAt: new Date().toISOString(),
      adminOpsApprovalStatus: 'pending',
      directorApprovalStatus: 'pending',
    };

    setRecords((current) => [nextRecord, ...current]);
    setDialogOpen(false);
    setActiveStep(1);
    setForm(blankRequisition());
  };

  useEffect(() => {
    if (dialogOpen && !form.mrfNo && !isFetchingMrfNo) {
      void fetchNewMrfNo();
    }
  }, [dialogOpen, form.mrfNo, isFetchingMrfNo]);

  useEffect(() => {
    void fetchAllRequisitions();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              <Users className="h-3.5 w-3.5" /> Human Resource
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Man Power Requisition</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Raise structured manpower requests, define billing requirements, and capture the full hiring brief in one flow.
              </p>
            </div>
          </div>

          <Button onClick={openDialog} className="gap-2 self-start bg-slate-900 text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Create Requisition
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Total Requisitions</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{records.length}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Open High Impact</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{records.filter((item) => item.impactLevel === 'High').length}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Total Budget</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">
                {records.reduce((sum, item) => sum + item.grandTotal, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Temporary Requests</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{records.filter((item) => item.contractType === 'Temporary').length}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-1 border-b border-slate-100 bg-slate-50/70">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <ReceiptText className="h-4 w-4 text-slate-700" /> Recent Requisitions
            </CardTitle>
            <CardDescription>Created manpower requests appear here for quick review.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingRecords ? (
              <div className="flex items-center justify-center px-6 py-16 text-center text-sm text-slate-500">
                Loading requisitions...
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-sm text-slate-500">
                <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
                  <ReceiptText className="h-5 w-5" />
                </div>
                No requisitions yet. Create the first request to start tracking manpower needs.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50">
                      <TableHead>MRF No.</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Approval Flow</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Billing Total</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} className="align-top">
                        <TableCell colSpan={7} className="space-y-3 py-4">
                          <div className="grid gap-3 lg:grid-cols-7 lg:items-center">
                            <div className="lg:col-span-1 font-semibold text-slate-900">{record.mrfNo}</div>
                            <div className="lg:col-span-1 text-slate-700">{record.department}</div>
                            <div className="lg:col-span-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {(() => {
                                  const adminEntry = getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'admin_ops');
                                  const directorEntry = getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'director');
                                  const adminStatus = extractStatusFromEntry(adminEntry ?? record.adminOpsApprovalStatus) ?? 'pending';
                                  const directorStatus = extractStatusFromEntry(directorEntry ?? record.directorApprovalStatus) ?? 'pending';
                                  return (
                                    <>
                                      <span className={cn('inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold', statusClass(adminStatus))}>
                                        Admin Ops: {formatStatus(adminStatus)}
                                      </span>
                                      <span className="text-xs text-slate-400">-&gt;</span>
                                      <span className={cn('inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold', statusClass(directorStatus))}>
                                        Director: {formatStatus(directorStatus)}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">HR submits to Admin Ops first, then moves to Director for final approval.</div>
                            </div>
                            <div className="lg:col-span-1">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  record.impactLevel === 'High' && 'bg-rose-50 text-rose-700 hover:bg-rose-50',
                                  record.impactLevel === 'Medium' && 'bg-amber-50 text-amber-700 hover:bg-amber-50',
                                  record.impactLevel === 'Low' && 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
                                )}
                              >
                                {record.impactLevel}
                              </Badge>
                            </div>
                            <div className="lg:col-span-1 text-slate-700">{record.contractType}</div>
                            <div className="lg:col-span-1 font-semibold text-slate-900">{record.grandTotal.toLocaleString()}</div>
                            <div className="lg:col-span-1 text-slate-700">{new Date(record.createdAt).toLocaleString()}</div>
                          </div>

                          <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">MRF Document View</div>
                                <div className="text-xs text-slate-500">Corporate form layout for request, billing, and specification details</div>
                              </div>
                              <span className="text-xs font-semibold text-slate-600 group-open:hidden">Expand</span>
                              <span className="text-xs font-semibold text-slate-600 hidden group-open:inline">Collapse</span>
                            </summary>

                            <div className="border-t border-slate-200 p-4 md:p-5 bg-slate-50/40">
                              <div className="rounded-xl border border-slate-300 bg-white">
                                <div className="border-b border-slate-300 px-4 py-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <div className="text-base font-bold tracking-wide text-slate-900">MANPOWER REQUISITION FORM</div>
                                    <div className="text-xs text-slate-500">SBR Agrotech</div>
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    <div><span className="font-semibold">MRF No:</span> {record.mrfNo}</div>
                                    <div><span className="font-semibold">Created:</span> {new Date(record.createdAt).toLocaleString()}</div>
                                  </div>
                                </div>

                                <div className="grid gap-4 p-4 md:grid-cols-3">
                                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 md:col-span-1">
                                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Required Details</div>
                                    <div className="space-y-1.5 text-sm text-slate-700">
                                      <div><span className="font-semibold text-slate-900">Department:</span> {record.department}</div>
                                      <div><span className="font-semibold text-slate-900">Sub Department:</span> {record.subDepartment}</div>
                                      <div><span className="font-semibold text-slate-900">Impact:</span> {record.impactLevel}</div>
                                      <div><span className="font-semibold text-slate-900">Contract:</span> {record.contractType}</div>
                                      <div><span className="font-semibold text-slate-900">Reason:</span> {record.reasonForVacancy}</div>
                                      <div><span className="font-semibold text-slate-900">Target Date:</span> {record.targetDate || 'N/A'}</div>
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 md:col-span-2">
                                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Billing Details</div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm border border-slate-200">
                                        <thead className="bg-slate-100">
                                          <tr>
                                            <th className="text-left px-2 py-1.5 border-b border-slate-200">Designation</th>
                                            <th className="text-left px-2 py-1.5 border-b border-slate-200">Age</th>
                                            <th className="text-right px-2 py-1.5 border-b border-slate-200">Qty</th>
                                            <th className="text-right px-2 py-1.5 border-b border-slate-200">CTC</th>
                                            <th className="text-right px-2 py-1.5 border-b border-slate-200">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {record.billingRows.map((bill) => (
                                            <tr key={bill.id}>
                                              <td className="px-2 py-1.5 border-b border-slate-100">{bill.designation || '-'}</td>
                                              <td className="px-2 py-1.5 border-b border-slate-100">{bill.ageLimit || '-'}</td>
                                              <td className="px-2 py-1.5 border-b border-slate-100 text-right">{toNumber(bill.quantity)}</td>
                                              <td className="px-2 py-1.5 border-b border-slate-100 text-right">{toNumber(bill.ctc).toLocaleString()}</td>
                                              <td className="px-2 py-1.5 border-b border-slate-100 text-right font-semibold">{rowTotal(bill).toLocaleString()}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className="mt-2 text-right text-sm font-bold text-slate-900">Total Budget: {record.grandTotal.toLocaleString()}</div>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 md:col-span-3">
                                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Additional Specifications</div>
                                    <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                                      <div><span className="font-semibold text-slate-900">Eligibility:</span> {record.eligibilityCriteria || '-'}</div>
                                      <div><span className="font-semibold text-slate-900">Qualification:</span> {record.qualification || '-'}</div>
                                      <div><span className="font-semibold text-slate-900">Competence:</span> {record.competence || '-'}</div>
                                      <div><span className="font-semibold text-slate-900">Skills:</span> {record.skillsRequired || '-'}</div>
                                      <div><span className="font-semibold text-slate-900">Experience:</span> {record.experience || '-'}</div>
                                      <div><span className="font-semibold text-slate-900">Area of Expertise:</span> {record.areaOfExpertise || '-'}</div>
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 md:col-span-3">
                                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Signatory Panel</div>
                                    <div className="overflow-hidden rounded-md border border-slate-300 bg-white text-xs">
                                      <div className="grid grid-cols-4 border-b border-slate-300 bg-slate-100 font-semibold text-slate-700">
                                        <div className="p-2">Authority</div>
                                        <div className="p-2 text-center">Name / ID</div>
                                        <div className="p-2 text-center">Signature</div>
                                        <div className="p-2 text-center">Date</div>
                                      </div>

                                      {[
                                        {
                                          label: 'HOD Signature',
                                          nameId: `HOD / ${record.department || '—'}`,
                                          signature: '—',
                                          date: record.createdAt,
                                        },
                                        {
                                          label: 'Admin Ops Signature',
                                          nameId: getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'admin_ops')
                                            ? `${getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'admin_ops')!.signerName} / ${getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'admin_ops')!.signerRole}`
                                            : `Admin Ops`,
                                          signature: getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'admin_ops')?.stamp || (record.adminOpsApprovalStatus === 'pending' ? 'Pending' : formatStatus(record.adminOpsApprovalStatus)),
                                          date: record.createdAt,
                                        },
                                        {
                                          label: 'Director Signature',
                                          nameId: getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'director')
                                            ? `${getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'director')!.signerName} / ${getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'director')!.signerRole}`
                                            : `Director`,
                                          signature: getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'director')?.stamp || (record.directorApprovalStatus === 'pending' ? 'Pending' : formatStatus(record.directorApprovalStatus)),
                                          date: record.createdAt,
                                        },
                                      ].map((row) => (
                                        <div key={row.label} className="grid grid-cols-4 border-b border-slate-200 last:border-b-0">
                                          <div className="p-2 font-semibold text-slate-900">{row.label}</div>
                                          <div className="p-2 text-center text-slate-700">{row.nameId}</div>
                                          <div className="p-2 text-center">
                                            <span className="inline-block rounded border border-slate-400 px-2 py-1 text-[10px] leading-tight text-slate-700">
                                              {row.signature}
                                            </span>
                                          </div>
                                          <div className="p-2 text-center text-slate-700">{new Date(row.date).toLocaleDateString()}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
          <div className="border-b border-slate-100 px-6 py-5">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <DialogTitle className="text-2xl font-semibold text-slate-900">Create Requisition</DialogTitle>
                  <DialogDescription className="mt-1 text-slate-600">
                    Complete the three steps below and submit the manpower request.
                  </DialogDescription>
                </div>
                <div className="hidden items-center gap-2 md:flex">
                  {stepLabels.map((label, index) => {
                    const step = (index + 1) as RequisitionStep;
                    const isActive = step === activeStep;
                    const isComplete = step < activeStep;
                    return (
                      <div
                        key={label}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          isActive && 'border-slate-900 bg-slate-900 text-white',
                          isComplete && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                          !isActive && !isComplete && 'border-slate-200 bg-white text-slate-500',
                        )}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 py-6">
            {activeStep === 1 ? (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="mrf-no" className="text-sm font-medium text-slate-700">MRF no.</Label>
                    <Input
                      id="mrf-no"
                      value={form.mrfNo}
                      readOnly
                      disabled={isFetchingMrfNo}
                      placeholder={isFetchingMrfNo ? 'Fetching MRF number...' : 'Auto generated'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Department</Label>
                    <Select value={form.department} onValueChange={(value) => setForm((current) => ({ ...current, department: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentOptions.map((department) => (
                          <SelectItem key={department} value={department}>
                            {department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Sub department</Label>
                    <Select value={form.subDepartment} onValueChange={(value) => setForm((current) => ({ ...current, subDepartment: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub department" />
                      </SelectTrigger>
                      <SelectContent>
                        {subDepartmentOptions.map((subDepartment) => (
                          <SelectItem key={subDepartment} value={subDepartment}>
                            {subDepartment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target-date" className="text-sm font-medium text-slate-700">Target date</Label>
                    <Input
                      id="target-date"
                      type="date"
                      value={form.targetDate}
                      onChange={(e) => setForm((current) => ({ ...current, targetDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Impact level</Label>
                    <Select value={form.impactLevel} onValueChange={(value) => setForm((current) => ({ ...current, impactLevel: value as ImpactLevel }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select impact" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Contract type</Label>
                    <Select value={form.contractType} onValueChange={(value) => setForm((current) => ({ ...current, contractType: value as ContractType }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contract type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Permanent">Permanent</SelectItem>
                        <SelectItem value="Temporary">Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2 xl:col-span-2">
                    <Label className="text-sm font-medium text-slate-700">Reason for vacancy</Label>
                    <Select value={form.reasonForVacancy} onValueChange={(value) => setForm((current) => ({ ...current, reasonForVacancy: value as VacancyReason }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Resignation">Resignation</SelectItem>
                        <SelectItem value="Termination">Termination</SelectItem>
                        <SelectItem value="New Position">New Position</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            {activeStep === 2 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Billing type system</h3>
                    <p className="text-sm text-slate-600">Add one or more role lines and calculate the CTC below.</p>
                  </div>
                  <Button type="button" variant="outline" className="gap-2" onClick={addRow}>
                    <Plus className="h-4 w-4" /> Add Row
                  </Button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50">
                        <TableHead className="w-[15%]">Designation</TableHead>
                        <TableHead className="w-[9%]">Age Limit</TableHead>
                        <TableHead className="w-[8%]">Quantity</TableHead>
                        <TableHead className="w-[24%]">JD</TableHead>
                        <TableHead className="w-[14%]">Department</TableHead>
                        <TableHead className="w-[9%]">CTC</TableHead>
                        <TableHead className="w-[11%]">Row Total</TableHead>
                        <TableHead className="w-[10%] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.billingRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="align-top">
                            <Select value={row.designation} onValueChange={(value) => updateRow(row.id, 'designation', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Designation" />
                              </SelectTrigger>
                              <SelectContent>
                                {designationOptions.map((designation) => (
                                  <SelectItem key={designation} value={designation}>
                                    {designation}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="align-top">
                            <Input value={row.ageLimit} onChange={(e) => updateRow(row.id, 'ageLimit', e.target.value)} placeholder="e.g. 18-35" />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input type="number" value={row.quantity} onChange={(e) => updateRow(row.id, 'quantity', e.target.value)} placeholder="0" />
                          </TableCell>
                          <TableCell className="align-top">
                            <Textarea
                              value={row.jd}
                              maxLength={100}
                              onChange={(e) => updateRow(row.id, 'jd', e.target.value.slice(0, 100))}
                              placeholder="Job description"
                              className="min-h-24 resize-none"
                            />
                            <div className="mt-1 text-[11px] text-slate-500">{row.jd.length}/100 characters</div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Select value={row.department} onValueChange={(value) => updateRow(row.id, 'department', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Department" />
                              </SelectTrigger>
                              <SelectContent>
                                {departmentOptions.map((department) => (
                                  <SelectItem key={department} value={department}>
                                    {department}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="align-top">
                            <Input type="number" value={row.ctc} onChange={(e) => updateRow(row.id, 'ctc', e.target.value)} placeholder="0" />
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="h-10 rounded-md border border-input bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                              {rowTotal(row).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRow(row.id)}
                              disabled={form.billingRows.length === 1}
                              className="text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Card className="border-slate-200 bg-slate-50/70 shadow-none">
                    <CardContent className="p-4">
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">CTC Total</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{totalCtc.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-900 bg-slate-900 text-white shadow-none">
                    <CardContent className="p-4">
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">Grand Total</div>
                      <div className="mt-1 text-2xl font-semibold">{totalCtc.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}

            {activeStep === 3 ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="eligibility">Eligibility criteria</Label>
                    <Textarea
                      id="eligibility"
                      value={form.eligibilityCriteria}
                      onChange={(e) => setForm((current) => ({ ...current, eligibilityCriteria: e.target.value }))}
                      placeholder="State the eligibility criteria"
                      className="min-h-24 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualification">Qualification</Label>
                    <Textarea
                      id="qualification"
                      value={form.qualification}
                      onChange={(e) => setForm((current) => ({ ...current, qualification: e.target.value }))}
                      placeholder="Qualification requirements"
                      className="min-h-24 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="competence">Competence</Label>
                    <Textarea
                      id="competence"
                      value={form.competence}
                      onChange={(e) => setForm((current) => ({ ...current, competence: e.target.value }))}
                      placeholder="Competence expectations"
                      className="min-h-24 resize-none"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="experience">Experience</Label>
                    <Textarea
                      id="experience"
                      value={form.experience}
                      onChange={(e) => setForm((current) => ({ ...current, experience: e.target.value }))}
                      placeholder="Experience requirements"
                      className="min-h-24 resize-none"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="skills">Skills required</Label>
                    <Textarea
                      id="skills"
                      value={form.skillsRequired}
                      onChange={(e) => setForm((current) => ({ ...current, skillsRequired: e.target.value }))}
                      placeholder="List required skills"
                      className="min-h-24 resize-none"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="expertise">Area of experties</Label>
                    <Textarea
                      id="expertise"
                      value={form.areaOfExpertise}
                      onChange={(e) => setForm((current) => ({ ...current, areaOfExpertise: e.target.value }))}
                      placeholder="Domain or field expertise"
                      className="min-h-24 resize-none"
                    />
                  </div>
                </div>

                <Separator />

                <Card className="border-slate-200 bg-slate-50/80 shadow-none">
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Final requisition value</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{totalCtc.toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-slate-600">Step 3 collects the hiring brief that HR will attach to the requisition file.</div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-slate-100 px-6 py-4">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveStep((current) => Math.max(1, current - 1) as RequisitionStep)}
                  disabled={activeStep === 1}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveStep((current) => Math.min(3, current + 1) as RequisitionStep)}
                  disabled={activeStep === 3}
                >
                  Next
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCreateRequisition} disabled={isSubmitting} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
                  <ReceiptText className="h-4 w-4" /> Create Requisition
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManPowerRequisition;