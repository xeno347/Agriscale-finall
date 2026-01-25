import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Globe,
  Activity,
  Download,
  Eye,
  Trash2,
  Signal,
  FileSpreadsheet,
  RefreshCw,
  Database,
  TrendingUp,
  Power,
} from 'lucide-react';
import { toast } from 'sonner';
import getBaseUrl from '@/lib/config';

// ============= TYPES =============
interface LandRecord {
  id: string;
  khasraNo: string;
  area: string;
  village: string;
  landType: string;
  ownerName: string;
  ownerAddress: string;
  remarks: string;
}

interface Session {
  id: string;
  name: string;
  ip: string;
  isLive: boolean;
  traffic: number; // in MB
  createdAt: Date;
  lastActive: Date;
  records: LandRecord[];
}

type ApiLandData = {
  area?: string;
  fatherName?: string;
  khasra?: string;
  ownerName?: string;
  district?: string;
  ri?: string;
  state?: string;
  ownerAddress?: string;
  village?: string;
  landType?: string;
  tehsil?: string;
};

type ApiSession = {
  ip: string;
  created_at: string;
  live: boolean;
  name: string;
  data?: Array<{ data?: ApiLandData; timestamp?: string }>;
  session_id: string;
};

// ============= MOCK DATA =============
const generateMockRecords = (count: number): LandRecord[] => {
  const villages = ['Rampur', 'Krishnapur', 'Lakshmipur', 'Govindpur', 'Shivpur', 'Haripur'];
  const owners = ['Rajesh Kumar', 'Sunil Sharma', 'Amit Patel', 'Priya Singh', 'Deepak Verma', 'Neha Gupta'];
  const addresses = [
    'Village Rampur, District Lucknow',
    '123 Main Road, Krishnapur',
    'Near Temple, Lakshmipur',
    'Post Office Lane, Govindpur',
    'Market Area, Shivpur',
    'Station Road, Haripur',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `record-${i + 1}`,
    khasraNo: `${Math.floor(Math.random() * 999) + 1}/${String.fromCharCode(
      65 + Math.floor(Math.random() * 5)
    )}`,
    area: `${(Math.random() * 10 + 0.5).toFixed(2)} ha`,
    village: villages[Math.floor(Math.random() * villages.length)],
    landType: Math.random() > 0.3 ? 'Private' : 'Government',
    ownerName: owners[Math.floor(Math.random() * owners.length)],
    ownerAddress: addresses[Math.floor(Math.random() * addresses.length)],
    remarks: Math.random() > 0.5 ? 'Verified' : '',
  }));
};

const initialMockSessions: Session[] = [];

// ============= UTILITY FUNCTIONS =============
const formatTraffic = (traffic: number) => {
  if (traffic >= 1024) {
    return `${(traffic / 1024).toFixed(2)} GB`;
  }
  return `${traffic.toFixed(2)} MB`;
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const downloadSessionData = (session: Session) => {
  const headers = ['Khasra No', 'Area', 'Village', 'Land Type', 'Owner Name', 'Owner Address', 'Remarks'];
  const rows = session.records.map((record) => [
    record.khasraNo,
    record.area,
    record.village,
    record.landType,
    record.ownerName,
    record.ownerAddress,
    record.remarks,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${session.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// ============= MAIN COMPONENT =============
export function LandDataPro() {
  const [sessions, setSessions] = useState<Session[]>(initialMockSessions);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showLiveDataModal, setShowLiveDataModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionError, setNewSessionError] = useState('');
  const [newSessionIp, setNewSessionIp] = useState('');
  const [newSessionIpError, setNewSessionIpError] = useState('');
  const [isFetchingIp, setIsFetchingIp] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [showIpActiveDialog, setShowIpActiveDialog] = useState(false);
  const [pendingCreatePayload, setPendingCreatePayload] = useState<{ name: string; ip: string } | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [activityUpdatingSessionId, setActivityUpdatingSessionId] = useState<string | null>(null);

  const filteredSessions = sessions.filter(
    (session) =>
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) || session.ip.includes(searchQuery)
  );

  const totalRecords = sessions.reduce((acc, s) => acc + s.records.length, 0);
  const totalTraffic = sessions.reduce((acc, s) => acc + s.traffic, 0);
  const liveSessions = sessions.filter((s) => s.isLive).length;

  const normalizeApiSession = (api: ApiSession): Session => {
    const createdAt = new Date(api.created_at);
    const entries = Array.isArray(api.data) ? api.data : [];

    const lastActive = (() => {
      const lastTimestamp = entries[0]?.timestamp || entries[entries.length - 1]?.timestamp;
      if (lastTimestamp) {
        const parsed = new Date(lastTimestamp);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      return createdAt;
    })();

    const records: LandRecord[] = entries.map((entry, index) => {
      const d = entry?.data ?? {};
      const remarksParts = [d.district, d.tehsil, d.ri].filter(Boolean);
      return {
        id: `${api.session_id}-${index + 1}`,
        khasraNo: String(d.khasra ?? ''),
        area: String(d.area ?? ''),
        village: String(d.village ?? ''),
        landType: String(d.landType ?? ''),
        ownerName: String(d.ownerName ?? ''),
        ownerAddress: String(d.ownerAddress ?? ''),
        remarks: remarksParts.join(' • '),
      };
    });

    return {
      id: api.session_id,
      name: api.name,
      ip: api.ip,
      isLive: Boolean(api.live),
      traffic: 0,
      createdAt,
      lastActive,
      records,
    };
  };

  const fetchAllSessions = async (options?: { preserveSelected?: boolean }) => {
    const preserveSelected = options?.preserveSelected ?? true;
    const base = getBaseUrl().replace(/\/$/, '');
    const url = `${base}/admin_khasra_ext/get_all_sessions`;

    try {
      setIsLoadingSessions(true);
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      let data: any = null;
      try {
        data = await resp.json();
      } catch {
        // ignore non-JSON
      }

      if (!resp.ok) {
        const message = data?.message || data?.error || `Server responded ${resp.status}`;
        throw new Error(message);
      }

      if (!Array.isArray(data)) {
        throw new Error('Invalid sessions response (expected an array)');
      }

      const next = (data as ApiSession[])
        .filter((s) => s && typeof s === 'object' && typeof s.session_id === 'string')
        .map(normalizeApiSession);

      setSessions(next);

      if (preserveSelected && selectedSession) {
        const updated = next.find((s) => s.id === selectedSession.id) ?? null;
        setSelectedSession(updated);
      }
    } catch (error) {
      toast.error('Failed to load sessions', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchAllSessions({ preserveSelected: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callMakeSessionApi = async (payload: { name: string; ip: string }) => {
    const base = getBaseUrl().replace(/\/$/, '');
    const url = `${base}/admin_khasra_ext/make_session`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let data: any = null;
    try {
      data = await resp.json();
    } catch {
      // ignore non-JSON
    }

    if (!resp.ok) {
      const message = data?.message || data?.error || `Server responded ${resp.status}`;
      throw new Error(message);
    }

    return data as { status?: 'available' | 'created' | 'error' | string; [k: string]: unknown };
  };

  const callActivitySessionApi = async (payload: { session_id: string; ip: string; live: boolean }) => {
    const base = getBaseUrl().replace(/\/$/, '');
    const url = `${base}/admin_khasra_ext/activity_session`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let data: any = null;
    try {
      data = await resp.json();
    } catch {
      // ignore non-JSON
    }

    if (!resp.ok) {
      const message = data?.message || data?.error || `Server responded ${resp.status}`;
      throw new Error(message);
    }

    return data as { status?: string; message?: string; [k: string]: unknown };
  };

  const handleFetchMyIp = async () => {
    try {
      setIsFetchingIp(true);
      setNewSessionIpError('');

      const response = await fetch('https://api.ipify.org?format=json');
      if (!response.ok) {
        throw new Error(`Failed to fetch IP (HTTP ${response.status})`);
      }

      const data: { ip?: string } = await response.json();
      if (!data.ip) {
        throw new Error('Invalid IP response');
      }

      setNewSessionIp(data.ip);
      toast.success('IP fetched', {
        description: `Detected IP: ${data.ip}`,
      });
    } catch (error) {
      setNewSessionIp('');
      setNewSessionIpError('Unable to fetch IP. Please try again.');
      toast.error('Failed to fetch IP', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsFetchingIp(false);
    }
  };

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) {
      setNewSessionError('Session name is required');
      return;
    }

    if (!newSessionIp.trim()) {
      setNewSessionIpError('Please fetch your IP before creating the session');
      return;
    }

    const payload = { name: newSessionName.trim(), ip: newSessionIp.trim() };
    setPendingCreatePayload(payload);

    try {
      setIsCreatingSession(true);
      const result = await callMakeSessionApi(payload);

      if (result?.status === 'available') {
        setShowIpActiveDialog(true);
        return;
      }

      if (result?.status === 'created') {
        await fetchAllSessions({ preserveSelected: false });
        setNewSessionName('');
        setNewSessionError('');
        setNewSessionIp('');
        setNewSessionIpError('');
        setShowNewSessionDialog(false);
        toast.success('Session created', {
          description: `"${payload.name}" is now live for ${payload.ip}.`,
        });
        return;
      }

      toast.error('Failed to create session', {
        description: 'Server returned status: ' + String(result?.status ?? 'unknown'),
      });
    } catch (error) {
      toast.error('Failed to create session', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsCreatingSession(false);
    }
  };

  const retryCreateAfterDeactivation = async () => {
    if (!pendingCreatePayload) return;
    try {
      setIsCreatingSession(true);
      const result = await callMakeSessionApi(pendingCreatePayload);

      if (result?.status === 'available') {
        toast.info('Session still active on this IP', {
          description: 'Please deactivate the existing session and try again.',
        });
        return;
      }

      if (result?.status === 'created') {
        await fetchAllSessions({ preserveSelected: false });
        setShowIpActiveDialog(false);
        setNewSessionName('');
        setNewSessionError('');
        setNewSessionIp('');
        setNewSessionIpError('');
        setShowNewSessionDialog(false);
        toast.success('Session created', {
          description: `"${pendingCreatePayload.name}" is now live for ${pendingCreatePayload.ip}.`,
        });
        return;
      }

      toast.error('Failed to create session', {
        description: 'Server returned status: ' + String(result?.status ?? 'unknown'),
      });
    } catch (error) {
      toast.error('Failed to create session', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleDeleteSession = () => {
    if (!sessionToDelete) return;
    setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
    toast.success('Session deleted', {
      description: `"${sessionToDelete.name}" has been permanently removed.`,
    });
    setShowDeleteDialog(false);
    setSessionToDelete(null);
  };

  const handleDownload = (session: Session) => {
    downloadSessionData(session);
    toast.success('Download started', {
      description: `Exporting ${session.records.length} records from "${session.name}".`,
    });
  };

  const handleViewData = (session: Session) => {
    setSelectedSession(session);
    setShowLiveDataModal(true);
  };

  const confirmDelete = (session: Session) => {
    setSessionToDelete(session);
    setShowDeleteDialog(true);
  };

  const handleToggleSessionLive = async (session: Session) => {
    const desiredLive = !session.isLive;
    try {
      setActivityUpdatingSessionId(session.id);
      await callActivitySessionApi({
        session_id: session.id,
        ip: session.ip,
        live: desiredLive,
      });

      toast.success(desiredLive ? 'Session activated' : 'Session deactivated', {
        description: `"${session.name}" is now ${desiredLive ? 'Live' : 'Offline'}.`,
      });

      await fetchAllSessions({ preserveSelected: true });
    } catch (error) {
      toast.error('Failed to update session status', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setActivityUpdatingSessionId(null);
    }
  };

  const columns: { key: keyof LandRecord; label: string; width: string }[] = [
    { key: 'khasraNo', label: 'Khasra No', width: 'w-28' },
    { key: 'area', label: 'Area', width: 'w-40' },
    { key: 'village', label: 'Village', width: 'w-36' },
    { key: 'landType', label: 'Land Type', width: 'w-32' },
    { key: 'ownerName', label: 'Owner Name', width: 'w-40' },
    { key: 'ownerAddress', label: 'Owner Address', width: 'w-48' },
    { key: 'remarks', label: 'Remarks', width: 'w-40' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Land Data Pro</h1>
                <p className="text-xs text-muted-foreground">Professional Land Records Management</p>
              </div>
            </div>
            <Button
              onClick={() => setShowNewSessionDialog(true)}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg gap-2"
            >
              <Plus className="h-4 w-4" />
              New Session
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold text-foreground">{isLoadingSessions ? '—' : sessions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Signal className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Live Sessions</p>
                <p className="text-2xl font-bold text-foreground">{isLoadingSessions ? '—' : liveSessions}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Traffic</p>
                <p className="text-2xl font-bold text-foreground">{isLoadingSessions ? '—' : formatTraffic(totalTraffic)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <FileSpreadsheet className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold text-foreground">{isLoadingSessions ? '—' : totalRecords.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border/50"
            />
          </div>
        </div>

        {/* Sessions Table */}
        <Card className="bg-card/50 backdrop-blur border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Session
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Traffic
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoadingSessions ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <RefreshCw className="h-8 w-8 text-muted-foreground/60 mb-3 animate-spin" />
                        <p className="text-muted-foreground">Loading sessions...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Database className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No sessions found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              session.isLive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
                            }`}
                          />
                          <div>
                            <p className="font-medium text-foreground">{session.name}</p>
                            <p className="text-xs text-muted-foreground">Created {formatDate(session.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={session.isLive ? 'default' : 'secondary'}
                          className={
                            session.isLive ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''
                          }
                        >
                          {session.isLive ? 'Live' : 'Offline'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-mono">{session.ip}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{formatTraffic(session.traffic)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Signal className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{session.records.length}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(session.lastActive)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant={session.isLive ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => handleToggleSessionLive(session)}
                            className={session.isLive ? 'h-8 px-2 gap-2' : 'h-8 px-2 gap-2'}
                            disabled={activityUpdatingSessionId === session.id}
                          >
                            {activityUpdatingSessionId === session.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                            {session.isLive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewData(session)}
                            className="h-8 px-2"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(session)}
                            className="h-8 px-2"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => confirmDelete(session)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* New Session Dialog */}
      <Dialog
        open={showNewSessionDialog}
        onOpenChange={(open) => {
          setShowNewSessionDialog(open);
          if (!open) {
            setNewSessionName('');
            setNewSessionError('');
            setNewSessionIp('');
            setNewSessionIpError('');
            setIsFetchingIp(false);
            setIsCreatingSession(false);
            setShowIpActiveDialog(false);
            setPendingCreatePayload(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              Create New Session
            </DialogTitle>
            <DialogDescription>
              Create a new data entry session for your extension. The session will start capturing land records
              immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSession}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sessionName">Session Name</Label>
                <Input
                  id="sessionName"
                  placeholder="e.g., North District Survey 2024"
                  value={newSessionName}
                  onChange={(e) => {
                    setNewSessionName(e.target.value);
                    if (newSessionError) setNewSessionError('');
                  }}
                  className={newSessionError ? 'border-destructive' : ''}
                />
                {newSessionError && <p className="text-sm text-destructive">{newSessionError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionIp">IP Address</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="sessionIp"
                    value={newSessionIp}
                    readOnly
                    placeholder="Click “Fetch my IP”"
                    className={newSessionIpError ? 'border-destructive' : ''}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFetchMyIp}
                    disabled={isFetchingIp}
                    className="shrink-0 gap-2"
                  >
                    {isFetchingIp ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                    Fetch my IP
                  </Button>
                </div>
                {newSessionIpError && <p className="text-sm text-destructive">{newSessionIpError}</p>}
                <p className="text-xs text-muted-foreground">
                  Uses a public IP lookup (api.ipify.org).
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewSessionDialog(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-primary to-primary/80"
                disabled={!newSessionName.trim() || !newSessionIp.trim() || isFetchingIp || isCreatingSession}
              >
                {isCreatingSession ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Make Session'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Existing session warning (same IP already live) */}
      <AlertDialog open={showIpActiveDialog} onOpenChange={setShowIpActiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session already active</AlertDialogTitle>
            <AlertDialogDescription>
              A session is already live for this IP ({pendingCreatePayload?.ip}). Please deactivate it and then
              retry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={retryCreateAfterDeactivation} disabled={isCreatingSession}>
              {isCreatingSession ? 'Retrying...' : 'I deactivated, retry'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Live Data Modal */}
      <Dialog open={showLiveDataModal} onOpenChange={setShowLiveDataModal}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
          {selectedSession && (
            <>
              <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{selectedSession.name}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={selectedSession.isLive ? 'default' : 'secondary'}
                          className={
                            selectedSession.isLive
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : ''
                          }
                        >
                          {selectedSession.isLive ? 'Live' : 'Offline'}
                        </Badge>
                        <span className="text-muted-foreground">•</span>
                        <span>{selectedSession.records.length} records</span>
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => fetchAllSessions({ preserveSelected: true })}
                      disabled={isLoadingSessions}
                    >
                      <RefreshCw className={isLoadingSessions ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-primary to-primary/80 gap-2"
                      onClick={() => handleDownload(selectedSession)}
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="h-[calc(90vh-120px)]">
                <div className="p-6">
                  {selectedSession.records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="p-4 rounded-full bg-muted mb-4">
                        <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">No Records Yet</h3>
                      <p className="text-muted-foreground max-w-md">
                        This session is waiting for data. Records will appear here once your extension starts
                        capturing land information.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted/50 border-b border-border">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12 text-center">
                                #
                              </th>
                              {columns.map((col) => (
                                <th
                                  key={col.key}
                                  className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider ${col.width}`}
                                >
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {selectedSession.records.map((record, index) => (
                              <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-center text-muted-foreground font-medium">{index + 1}</td>
                                <td className="px-4 py-3 font-medium">{record.khasraNo}</td>
                                <td className="px-4 py-3">{record.area || '-'}</td>
                                <td className="px-4 py-3">{record.village}</td>
                                <td className="px-4 py-3">
                                  <Badge
                                    variant="secondary"
                                    className="bg-primary/10 text-primary border-0"
                                  >
                                    {record.landType}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">{record.ownerName}</td>
                                <td className="px-4 py-3 max-w-xs truncate" title={record.ownerAddress}>
                                  {record.ownerAddress}
                                </td>
                                <td className="px-4 py-3 max-w-xs truncate" title={record.remarks}>
                                  {record.remarks || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sessionToDelete?.name}"? This action cannot be undone and all
              associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default LandDataPro;
