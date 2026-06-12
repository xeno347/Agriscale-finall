import { User, Calendar, AlertCircle, Check, X } from 'lucide-react';
import type { Approval } from './WebApp';
import { CATEGORY_META } from './WebApp';

// ─────────────────────────────────────────────────────────────
// Shared helpers & meta — imported by all pages
// ─────────────────────────────────────────────────────────────

export const STATUS_META = {
	pending:  { badge: 'bg-amber-50 text-amber-700 ring-amber-200',         label: 'Pending'  },
	approved: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',   label: 'Approved' },
	rejected: { badge: 'bg-red-50 text-red-600 ring-red-200',               label: 'Rejected' },
};

export const fmtDate = (iso: string) => {
	try {
		return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
	} catch { return iso; }
};

// ─────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────

interface Props {
	item:      Approval;
	onApprove: (id: string) => void;
	onReject:  (id: string) => void;
}

const ApprovalCard = ({ item, onApprove, onReject }: Props) => {
	const cm = CATEGORY_META[item.category];
	const sm = STATUS_META[item.status];

	return (
		<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
			{/* Left category colour strip */}
			<div className={`w-1 shrink-0 ${cm.strip}`} />

			<div className="flex-1 p-4 space-y-3 min-w-0">

				{/* Row 1 — sub-type badge + priority + status */}
				<div className="flex items-center gap-2 flex-wrap">
					<span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ${cm.badge}`}>
						{item.subType}
					</span>
					{item.priority === 'high' && (
						<span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
							<AlertCircle className="w-3 h-3" />High
						</span>
					)}
					<span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ${sm.badge}`}>
						{sm.label}
					</span>
				</div>

				{/* Row 2 — title + description */}
				<div>
					<h3 className="text-sm font-bold text-gray-900 leading-snug">{item.title}</h3>
					<p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
				</div>

				{/* Row 3 — requester */}
				<div className="flex items-center gap-1.5 text-xs text-gray-500">
					<User className="w-3.5 h-3.5 shrink-0 text-gray-400" />
					<span className="font-medium text-gray-700">{item.requester}</span>
					<span className="text-gray-300">·</span>
					<span className="truncate">{item.department}</span>
				</div>

				{/* Row 4 — amount + date + id */}
				<div className="flex items-end justify-between gap-2">
					{item.amount != null ? (
						<span className="text-base font-bold text-gray-900">
							₹{item.amount.toLocaleString('en-IN')}
						</span>
					) : (
						<span className="text-xs italic text-gray-300">No amount</span>
					)}
					<div className="flex flex-col items-end gap-0.5 shrink-0">
						<div className="flex items-center gap-1 text-xs text-gray-400">
							<Calendar className="w-3 h-3" />{fmtDate(item.date)}
						</div>
						<span className="text-[10px] font-mono text-gray-300">{item.id}</span>
					</div>
				</div>

				{/* Row 5 — actions (pending only) */}
				{item.status === 'pending' && (
					<div className="flex gap-2 pt-0.5">
						<button
							onClick={() => onReject(item.id)}
							className="flex-1 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
						>
							<X className="w-3.5 h-3.5" />Reject
						</button>
						<button
							onClick={() => onApprove(item.id)}
							className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
						>
							<Check className="w-3.5 h-3.5" />Approve
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default ApprovalCard;
