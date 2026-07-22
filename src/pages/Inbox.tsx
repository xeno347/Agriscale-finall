import { useState, useEffect } from 'react';
import getBaseUrl from '@/lib/config';

const BASE_URL = getBaseUrl();
import {
  Mail,
  MailOpen,
  PenSquare,
  Send,
  ChevronDown,
  X,
  Inbox as InboxIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────
export type Department = 'Admin' | 'Inventory' | 'Purchase' | 'HRMS' | 'Director';

type Message = {
  id: string;
  from: Department;
  to: Department;
  message: string;
  date: string;
  seen: boolean;
};

// ─── Department colour map ────────────────────────────────────
const DEPT_COLOR: Record<Department, string> = {
  Admin:     'bg-blue-100 text-blue-700 border-blue-200',
  Inventory: 'bg-green-100 text-green-700 border-green-200',
  Purchase:  'bg-purple-100 text-purple-700 border-purple-200',
  HRMS:      'bg-orange-100 text-orange-700 border-orange-200',
  Director:  'bg-rose-100 text-rose-700 border-rose-200',
};

const ALL_DEPARTMENTS: Department[] = ['Admin', 'Inventory', 'Purchase', 'HRMS', 'Director'];

// ─── Department → API slug mapping ───────────────────────────
const DEPT_SLUG: Record<Department, string> = {
  Admin:     'admin_ops',
  Inventory: 'Inventory',
  Purchase:  'purchase',
  HRMS:      'hrms',
  Director:  'director',
};

// ─── Compose Modal ────────────────────────────────────────────
const ComposeModal = ({
  fromDept,
  onClose,
  onSend,
}: {
  fromDept: Department;
  onClose: () => void;
  onSend: (msg: Omit<Message, 'id' | 'seen'>) => void;
}) => {
  const [toDept, setToDept]     = useState<Department | ''>('');
  const [message, setMessage]   = useState('');
  const [sending, setSending]   = useState(false);

  const recipientOptions = ALL_DEPARTMENTS.filter(d => d !== fromDept);

  const handleSend = async () => {
    if (!toDept)          return toast.error('Please select a recipient department');
    if (!message.trim())  return toast.error('Message cannot be empty');
    setSending(true);
    try {
      const res  = await fetch(`${BASE_URL}/admin_all_inbox/create_new_inbox_request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            from:    DEPT_SLUG[fromDept],
            to:      DEPT_SLUG[toDept as Department],
            message: message.trim(),
          },
        }),
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to send message');
      onSend({
        from:    fromDept,
        to:      toDept as Department,
        message: message.trim(),
        date:    new Date().toISOString(),
      });
      toast.success(`Message sent to ${toDept}`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-800">
            <PenSquare className="w-5 h-5 text-indigo-500" />
            New Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* From (read-only) */}
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs font-semibold text-gray-400 uppercase tracking-wider">From</span>
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', DEPT_COLOR[fromDept])}>
              {fromDept}
            </span>
          </div>

          {/* To */}
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs font-semibold text-gray-400 uppercase tracking-wider">To</span>
            <div className="relative flex-1">
              <select
                className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8"
                value={toDept}
                onChange={e => setToDept(e.target.value as Department)}
              >
                <option value="">Select department…</option>
                {recipientOptions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Message */}
          <div className="flex gap-3">
            <span className="w-16 shrink-0 text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2.5">Message</span>
            <textarea
              className="flex-1 min-h-[120px] resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-300"
              placeholder="Write your message here…"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSend}
            disabled={sending}
          >
            <Send className="w-4 h-4 mr-1.5" />
            {sending ? 'Sending…' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Inbox Page ──────────────────────────────────────────
interface InboxProps {
  department: Department;
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Inbox = ({ department }: InboxProps) => {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const slug = DEPT_SLUG[department];
        const res  = await fetch(`${BASE_URL}/admin_all_inbox/get_all_inbox_requests/${slug}`);
        const data: any = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data?.inbox_requests)) {
          const list = data.inbox_requests.map((r: any) => ({
            id:      String(r.message_id),
            from:    String(r.from) as Department,
            to:      String(r.to) as Department,
            message: String(r.message),
            date:    String(r.timestamp),
            seen:    Boolean(r.read),
          }));
          setMessages(list);
          setSelectedId(list.length > 0 ? list[0].id : null);
        }
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetchMessages();
  }, [department]);

  const unreadCount = messages.filter(m => !m.seen).length;
  const selectedMessage = messages.find(m => m.id === selectedId) ?? null;

  const selectMessage = (id: string) => {
    setSelectedId(id);
    const msg = messages.find(m => m.id === id);
    if (msg && !msg.seen) markSeen(id);
  };

  const markSeen = async (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, seen: true } : m));
    try {
      await fetch(`${BASE_URL}/admin_all_inbox/update_inbox_request_status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: id, new_status: 'read' }),
      });
    } catch { /* silently fail — UI already updated optimistically */ }
  };

  const markAllSeen = () => {
    setMessages(prev => prev.map(m => ({ ...m, seen: true })));
  };

  const handleNewMessage = (msg: Omit<Message, 'id' | 'seen'>) => {
    // Only add to this inbox if this dept is the recipient
    if (msg.to === department) {
      setMessages(prev => [{ ...msg, id: Date.now().toString(), seen: false }, ...prev]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl', DEPT_COLOR[department].split(' ')[0])}>
            <InboxIcon className={cn('w-5 h-5', DEPT_COLOR[department].split(' ')[1])} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className={cn('font-semibold', DEPT_COLOR[department].split(' ')[1])}>{department}</span>
              {' · '}
              {unreadCount > 0
                ? <span className="text-indigo-600 font-medium">{unreadCount} unread</span>
                : <span className="text-gray-400">All caught up</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllSeen} className="text-xs">
              <MailOpen className="w-3.5 h-3.5 mr-1.5" />
              Mark all as seen
            </Button>
          )}
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            size="sm"
            onClick={() => setComposeOpen(true)}
          >
            <PenSquare className="w-4 h-4 mr-1.5" />
            Compose
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">Total:</span>
          <span className="font-semibold text-gray-800">{messages.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-gray-500">Unread:</span>
          <span className="font-semibold text-indigo-600">{unreadCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <MailOpen className="w-4 h-4 text-gray-300" />
          <span className="text-gray-500">Read:</span>
          <span className="font-semibold text-gray-800">{messages.length - unreadCount}</span>
        </div>
      </div>

      {/* Two-pane mail client */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <InboxIcon className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">No messages yet</p>
            <p className="text-gray-300 text-sm mt-0.5">Messages sent to {department} will appear here</p>
          </div>
        ) : (
          <div className="flex h-[calc(100vh-220px)] min-h-[420px] rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Left: message list */}
            <div className="w-[320px] shrink-0 border-r border-gray-200 overflow-y-auto divide-y divide-gray-100">
              {messages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => selectMessage(msg.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 transition-colors hover:bg-gray-50',
                    msg.id === selectedId ? 'bg-indigo-50' : !msg.seen && 'bg-indigo-50/30',
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', DEPT_COLOR[msg.from])}>
                      {msg.from}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!msg.seen && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                      <span className="text-[11px] text-gray-400 tabular-nums">{fmtDate(msg.date)}</span>
                    </div>
                  </div>
                  <p className={cn('text-sm truncate', !msg.seen ? 'font-semibold text-gray-800' : 'text-gray-500')}>
                    {msg.message}
                  </p>
                </button>
              ))}
            </div>

            {/* Right: reading pane */}
            <div className="flex-1 overflow-y-auto">
              {selectedMessage ? (
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 pb-4 mb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', DEPT_COLOR[selectedMessage.from])}>
                        {selectedMessage.from}
                      </span>
                      <span className="text-gray-300">→</span>
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', DEPT_COLOR[selectedMessage.to])}>
                        {selectedMessage.to}
                      </span>
                    </div>
                    {selectedMessage.seen ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium shrink-0">
                        <MailOpen className="w-3.5 h-3.5" />
                        Seen
                      </span>
                    ) : (
                      <button
                        onClick={() => markSeen(selectedMessage.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
                      >
                        <MailOpen className="w-3.5 h-3.5" />
                        Mark Seen
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-3 tabular-nums">{fmtDate(selectedMessage.date)}</p>
                  <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Mail className="w-10 h-10 text-gray-200 mb-2" />
                  <p className="text-gray-400 text-sm">Select a message to read</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {composeOpen && (
        <ComposeModal
          fromDept={department}
          onClose={() => setComposeOpen(false)}
          onSend={handleNewMessage}
        />
      )}
    </div>
  );
};

export default Inbox;
