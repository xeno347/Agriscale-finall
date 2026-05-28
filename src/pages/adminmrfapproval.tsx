import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { buildMrfSignatureEntry, getMrfSignatureEntry, readMrfSignatureCache, saveMrfSignatureEntry, extractStatusFromEntry } from '@/lib/mrfSignatureCache';
import { getBaseUrl } from '@/lib/config';
import { CheckCircle2, Clock3, FileCheck2, FileText, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | string;

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
  admin_ops_approval_status?: ApprovalStatus;
  director_approval_status?: ApprovalStatus;
}

interface AdminMrfRecord {
  id: string;
  mrfNo: string;
  requestDetails: {
    department: string;
    subDepartment: string;
    contactType: string;
    reasonOfVacancy: string;
    impact: string;
  };
  billingDetails: ApiBillingDetail[];
  additionalSpecifications: {
    eligibilityCriteria: string;
    qualification: string;
    competences: string;
    skills: string;
    experience: string;
    areaOfExpertise: string;
  };
  totalBudget: number;
  createdAt: string;
  adminOpsApprovalStatus: ApprovalStatus;
  directorApprovalStatus: ApprovalStatus;
}

const normalizeStatus = (value?: string): ApprovalStatus => {
  const lowered = String(value || 'pending').trim().toLowerCase();
  if (lowered === 'approved') return 'approved';
  if (lowered === 'rejected') return 'rejected';
  return 'pending';
};

const formatStatus = (value?: string) => {
  const lowered = String(value || '').trim().toLowerCase();
  if (!lowered) return 'Pending';
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
};

const statusBadgeClass = (status: ApprovalStatus) => {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50';
  if (status === 'rejected' || String(status || '').trim().toLowerCase() === 'reject') return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50';
  return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50';
};

const displaySignatureText = (value: ApprovalStatus) => {
  const lowered = String(value || '').trim().toLowerCase();
  return 'Pending';
};

const mapRecord = (item: ApiRequisition, index: number): AdminMrfRecord => ({
  id: `${item.MRF_no || 'mrf'}-${index}`,
  mrfNo: String(item.MRF_no || ''),
  requestDetails: {
    department: String(item.request_details?.department || ''),
    subDepartment: String(item.request_details?.sub_department || ''),
    contactType: String(item.request_details?.contact_type || ''),
    reasonOfVacancy: String(item.request_details?.reason_of_vacancy || ''),
    impact: String(item.request_details?.impact || ''),
  },
  billingDetails: item.billing_details || [],
  additionalSpecifications: {
    eligibilityCriteria: String(item.additional_specifications?.eligibility_criteria || ''),
    qualification: String(item.additional_specifications?.qualification || ''),
    competences: String(item.additional_specifications?.competences || ''),
    skills: String(item.additional_specifications?.skills || ''),
    experience: String(item.additional_specifications?.experience || ''),
    areaOfExpertise: String(item.additional_specifications?.area_of_expertise || ''),
  },
  totalBudget: Number(item.total_budget || 0),
  createdAt: String(item.created_at || new Date().toISOString()),
  adminOpsApprovalStatus: normalizeStatus(String(item.admin_ops_approval_status || 'pending')),
  directorApprovalStatus: normalizeStatus(String(item.director_approval_status || 'pending')),
});

const AdminMrfApproval = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AdminMrfRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingForMrf, setSavingForMrf] = useState<string | null>(null);

  const pendingRecords = useMemo(() => records.filter((record) => record.adminOpsApprovalStatus === 'pending'), [records]);
  const reviewedRecords = useMemo(() => records.filter((record) => record.adminOpsApprovalStatus !== 'pending'), [records]);

  const fetchAllMrf = async () => {
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/HRMS/get_all_MRF`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !Array.isArray(data?.requisitions)) {
        throw new Error(data?.message || data?.error || 'Unable to fetch MRF records');
      }
      setRecords(data.requisitions.map((item: ApiRequisition, index: number) => mapRecord(item, index)));
    } catch (error: any) {
      toast.error(error?.message || 'Unable to fetch MRF records');
    } finally {
      setLoading(false);
    }
  };

  const updateApproval = async (mrfNo: string, status: 'approved' | 'rejected') => {
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    const approverName = user?.name?.trim() || user?.username?.trim() || '';

    if (!approverName) {
      toast.error('Approver name is not available in cached data. Please log in again.');
      return;
    }

    setSavingForMrf(mrfNo);
    try {
      const response = await fetch(`${BASE_URL}/HRMS/admin_ops_approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          MRF_no: mrfNo,
          approver_role: 'Admin Ops',
          approver_name: approverName,
          approval_status: status,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to update approval status');
      }

      const signedAt = new Date().toISOString();
      const stampEntry = buildMrfSignatureEntry({
        signerName: approverName,
        signerRole: 'Admin Ops',
        approvalStatus: status,
        signedAt,
      });
      saveMrfSignatureEntry(readMrfSignatureCache(), mrfNo, 'admin_ops', stampEntry);

      setRecords((current) =>
        current.map((record) =>
          record.mrfNo === mrfNo
            ? {
                ...record,
                adminOpsApprovalStatus: status,
              }
            : record,
        ),
      );

      toast.success(`MRF ${status}.`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update approval status');
    } finally {
      setSavingForMrf(null);
    }
  };

  useEffect(() => {
    void fetchAllMrf();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin MRF Approvals</h1>
              <p className="mt-1 text-sm text-slate-600">Review MRF requests raised by HR and approve them for Director final approval.</p>
            </div>
            <Button variant="outline" onClick={fetchAllMrf} className="gap-2">
              <FileText className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Total MRF</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{records.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Pending Admin Ops</div>
              <div className="mt-2 text-3xl font-bold text-amber-700">{pendingRecords.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Admin Approved</div>
              <div className="mt-2 text-3xl font-bold text-emerald-700">{records.filter((r) => r.adminOpsApprovalStatus === 'approved').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Director Pending</div>
              <div className="mt-2 text-3xl font-bold text-blue-700">{records.filter((r) => r.adminOpsApprovalStatus === 'approved' && r.directorApprovalStatus === 'pending').length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-slate-500">Loading MRF records...</CardContent>
            </Card>
          ) : pendingRecords.length === 0 && reviewedRecords.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-slate-500">No MRF records found.</CardContent>
            </Card>
          ) : null}

          {pendingRecords.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900"><Clock3 className="h-4 w-4" /> Pending Admin Ops Approval</CardTitle>
                <CardDescription>Approve these requests to move them to Director final approval.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingRecords.map((record) => (
                  <details key={record.id} className="rounded-xl border border-slate-200 bg-white">
                    <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{record.mrfNo}</div>
                        <div className="text-xs text-slate-500">{record.requestDetails.department} • {record.requestDetails.subDepartment}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={statusBadgeClass(record.adminOpsApprovalStatus)}>Admin: Pending</Badge>
                        <Badge variant="secondary" className={statusBadgeClass(record.directorApprovalStatus)}>Director: {record.directorApprovalStatus}</Badge>
                      </div>
                    </summary>
                    <div className="border-t border-slate-200 p-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/70">
                          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600 mb-2">Request Details</div>
                          <div className="space-y-1 text-sm text-slate-700">
                            <div><span className="font-semibold text-slate-900">Department:</span> {record.requestDetails.department}</div>
                            <div><span className="font-semibold text-slate-900">Sub Department:</span> {record.requestDetails.subDepartment}</div>
                            <div><span className="font-semibold text-slate-900">Impact:</span> {record.requestDetails.impact}</div>
                            <div><span className="font-semibold text-slate-900">Contract:</span> {record.requestDetails.contactType}</div>
                            <div><span className="font-semibold text-slate-900">Reason:</span> {record.requestDetails.reasonOfVacancy}</div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/70 md:col-span-2">
                          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600 mb-2">Billing Details</div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border border-slate-200">
                              <thead className="bg-slate-100">
                                <tr>
                                  <th className="text-left px-2 py-1.5 border-b border-slate-200">Designation</th>
                                  <th className="text-right px-2 py-1.5 border-b border-slate-200">Qty</th>
                                  <th className="text-right px-2 py-1.5 border-b border-slate-200">CTC</th>
                                  <th className="text-right px-2 py-1.5 border-b border-slate-200">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {record.billingDetails.map((row, idx) => {
                                  const qty = Number(row.quantity || 0);
                                  const ctc = Number(row.CTC || 0);
                                  return (
                                    <tr key={`${record.id}-bill-${idx}`}>
                                      <td className="px-2 py-1.5 border-b border-slate-100">{row.Designation || '-'}</td>
                                      <td className="px-2 py-1.5 border-b border-slate-100 text-right">{qty}</td>
                                      <td className="px-2 py-1.5 border-b border-slate-100 text-right">{ctc.toLocaleString()}</td>
                                      <td className="px-2 py-1.5 border-b border-slate-100 text-right font-semibold">{(qty * ctc).toLocaleString()}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-2 text-right text-sm font-bold text-slate-900">Total Budget: {record.totalBudget.toLocaleString()}</div>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/70 md:col-span-3">
                          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600 mb-2">Additional Specifications</div>
                          <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                            <div><span className="font-semibold text-slate-900">Eligibility:</span> {record.additionalSpecifications.eligibilityCriteria || '-'}</div>
                            <div><span className="font-semibold text-slate-900">Qualification:</span> {record.additionalSpecifications.qualification || '-'}</div>
                            <div><span className="font-semibold text-slate-900">Competences:</span> {record.additionalSpecifications.competences || '-'}</div>
                            <div><span className="font-semibold text-slate-900">Skills:</span> {record.additionalSpecifications.skills || '-'}</div>
                            <div><span className="font-semibold text-slate-900">Experience:</span> {record.additionalSpecifications.experience || '-'}</div>
                            <div><span className="font-semibold text-slate-900">Area of Expertise:</span> {record.additionalSpecifications.areaOfExpertise || '-'}</div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/70 md:col-span-3">
                          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600 mb-2">Signatory Panel</div>
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
                                nameId: `HOD / ${record.requestDetails.department || '—'}`,
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

                      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                        <Button
                          variant="outline"
                          className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          disabled={savingForMrf === record.mrfNo}
                          onClick={() => void updateApproval(record.mrfNo, 'rejected')}
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                        <Button
                          className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={savingForMrf === record.mrfNo}
                          onClick={() => void updateApproval(record.mrfNo, 'approved')}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approve
                        </Button>
                      </div>
                    </div>
                  </details>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {reviewedRecords.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900"><FileCheck2 className="h-4 w-4" /> Reviewed by Admin Ops</CardTitle>
                <CardDescription>Already approved or rejected by Admin Ops.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {reviewedRecords.map((record) => (
                  <div key={record.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{record.mrfNo}</div>
                      <div className="text-xs text-slate-500">{record.requestDetails.department} • {new Date(record.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const adminEntry = getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'admin_ops');
                        const directorEntry = getMrfSignatureEntry(readMrfSignatureCache(), record.mrfNo, 'director');
                        const adminStatus = extractStatusFromEntry(adminEntry ?? record.adminOpsApprovalStatus) ?? 'pending';
                        const directorStatus = extractStatusFromEntry(directorEntry ?? record.directorApprovalStatus) ?? 'pending';
                        return (
                          <>
                            <Badge variant="secondary" className={statusBadgeClass(adminStatus)}>Admin: {adminStatus}</Badge>
                            <Badge variant="secondary" className={statusBadgeClass(directorStatus)}>Director: {directorStatus}</Badge>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminMrfApproval;