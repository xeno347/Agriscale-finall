import { useState } from 'react';
import { User, Calendar, AlertCircle, Check, X, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import type { Approval, ApprovalStatus, ApprovalType } from './WebApp';

// ─────────────────────────────────────────────────────────────
// Shared metadata (exported so DashboardPage can reuse)
// ─────────────────────────────────────────────────────────────

export const TYPE_META: Record<ApprovalType, { strip: string; badge: string; label: string }> = {
	Indent: { strip: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 ring-blue-200',     label: 'Indent' },
	NFA:    { strip: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 ring-orange-200', label: 'NFA'    },
	MRF:    { strip: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 ring-violet-200', label: 'MRF'    },
	Fuel:   { strip: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 ring-amber-200',   label: 'Fuel'   },
	Other:  { strip: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-600 ring-slate-200',  label: 'Other'  },
};

export const STATUS_META: Record<'pending' | 'approved' | 'rejected', { badge: string; label: string; Icon: React.ComponentType<{ className?: string }> }> = {
	pending:  { badge: 'bg-amber-50 text-amber-700 ring-amber-200',     label: 'Pending',  Icon: Clock3       },
	approved: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Approved', Icon: CheckCircle2 },
	rejected: { badge: 'bg-red-50 text-red-600 ring-red-200',           label: 'Rejected', Icon: XCircle      },
};

export const fmtDate = (iso: string) => {
	try {
		return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
	} catch { return iso; }
};

// ─────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────

const ApprovalCard = ({
	item,
	onApprove,
	onReject,
}: {
	item:      Approval;
	onApprove: (id: string) => void;
	onReject:  (id: string) => void;
}) => {
	const tm = TYPE_META[item.type];
	const sm = STATUS_META[item.status as 'pending' | 'approved' | 'rejected'];

	return (
		<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
			{/* Left type colour strip */}
			<div className={`w-1 shrink-0 ${tm.strip}`} />

			<div className="flex-1 p-4 space-y-3">
				{/* Row 1: type badge + priority + status */}
				<div className="flex items-center gap-2 flex-wrap">
					<span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ${tm.badge}`}>
						{item.type}
					</span>
					{item.priority === 'high' && (
						<span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
							<AlertCircle className="w-3 h-3" />High
						</span>
					)}
					<span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 flex items-center gap-1 ${sm.badge}`}>
						<sm.Icon className="w-3 h-3" />
						{sm.label}
					</span>
				</div>

				{/* Row 2: title + description */}
				<div>
					<h3 className="text-sm font-bold text-gray-900 leading-snug">{item.title}</h3>
					<p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
				</div>

				{/* Row 3: requester info */}
				<div className="flex items-center gap-1.5 text-xs text-gray-500">
					<User className="w-3.5 h-3.5 shrink-0 text-gray-400" />
					<span className="font-medium text-gray-700">{item.requester}</span>
					<span className="text-gray-300">·</span>
					<span>{item.department}</span>
				</div>

				{/* Row 4: amount + date + ID */}
				<div className="flex items-center justify-between">
					<div>
						{item.amount != null ? (
							<span className="text-base font-bold text-gray-900">
								₹{item.amount.toLocaleString('en-IN')}
							</span>
						) : (
							<span className="text-xs text-gray-400 italic">No amount</span>
						)}
					</div>
					<div className="flex flex-col items-end gap-0.5">
						<div className="flex items-center gap-1 text-xs text-gray-400">
							<Calendar className="w-3 h-3" />
							{fmtDate(item.date)}
						</div>
						<span className="text-[10px] font-mono text-gray-300">{item.id}</span>
					</div>
				</div>

				{/* Row 5: actions (only for pending) */}
				{item.status === 'pending' && (
					<div className="flex gap-2 pt-1">
						<button
							onClick={() => onReject(item.id)}
							className="flex-1 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
						>
							<X className="w-3.5 h-3.5" />
							Reject
						</button>
						<button
							onClick={() => onApprove(item.id)}
							className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
						>
							<Check className="w-3.5 h-3.5" />
							Approve
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

const STATUS_TABS: { key: ApprovalStatus | 'all'; label: string }[] = [
	{ key: 'all',      label: 'All'      },
	{ key: 'pending',  label: 'Pending'  },
	{ key: 'approved', label: 'Approved' },
	{ key: 'rejected', label: 'Rejected' },
];

const TYPE_CHIPS: { key: ApprovalType | 'all'; label: string }[] = [
	{ key: 'all',    label: 'All'    },
	{ key: 'Indent', label: 'Indent' },
	{ key: 'NFA',    label: 'NFA'    },
	{ key: 'MRF',    label: 'MRF'    },
	{ key: 'Fuel',   label: 'Fuel'   },
	{ key: 'Other',  label: 'Other'  },
];

interface Props {
	approvals:  Approval[];
	onApprove:  (id: string) => void;
	onReject:   (id: string) => void;
}

const ApprovalsPage = ({ approvals, onApprove, onReject }: Props) => {
	const [activeStatus, setActiveStatus] = useState<ApprovalStatus | 'all'>('all');
	const [activeType,   setActiveType]   = useState<ApprovalType | 'all'>('all');

	const filtered = approvals
		.filter(a => activeStatus === 'all' || a.status === activeStatus)
		.filter(a => activeType   === 'all' || a.type   === activeType);

	const countFor = (status: ApprovalStatus | 'all') =>
		status === 'all' ? approvals.length : approvals.filter(a => a.status === status).length;

	return (
		<div className="flex flex-col h-full">

			{/* ── Sticky filter header ── */}
			<div className="sticky top-0 z-30 bg-gray-50 border-b border-gray-200 pt-4 space-y-3 px-4 pb-3">

				{/* Page title */}
				<div className="flex items-baseline justify-between">
					<h1 className="text-lg font-bold text-gray-900">Approvals</h1>
					<span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
				</div>

				{/* Status tabs */}
				<div className="flex gap-1.5">
					{STATUS_TABS.map(tab => {
						const count   = countFor(tab.key);
						const isActive = activeStatus === tab.key;
						return (
							<button
								key={tab.key}
								onClick={() => setActiveStatus(tab.key)}
								className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
									isActive
										? 'bg-gray-900 text-white shadow-sm'
										: 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
								}`}
							>
								{tab.label}
								{count > 0 && (
									<span className={`text-[10px] px-1 rounded-full font-bold ${
										isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
									}`}>
										{count}
									</span>
								)}
							</button>
						);
					})}
				</div>

				{/* Type chips — horizontally scrollable */}
				<div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
					{TYPE_CHIPS.map(chip => {
						const isActive = activeType === chip.key;
						const meta     = chip.key !== 'all' ? TYPE_META[chip.key as ApprovalType] : null;
						return (
							<button
								key={chip.key}
								onClick={() => setActiveType(chip.key)}
								className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
									isActive
										? meta
											? `${meta.badge} border-transparent`
											: 'bg-gray-900 text-white border-transparent'
										: 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
								}`}
							>
								{chip.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* ── Cards list ── */}
			<div className="flex-1 overflow-auto p-4 space-y-3">
				{filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
						<CheckCircle2 className="w-10 h-10 opacity-30" />
						<p className="text-sm font-medium">No approvals found</p>
						<p className="text-xs">Try adjusting the filters above</p>
					</div>
				) : (
					filtered.map(item => (
						<ApprovalCard
							key={item.id}
							item={item}
							onApprove={onApprove}
							onReject={onReject}
						/>
					))
				)}
			</div>
		</div>
	);
};

export default ApprovalsPage;
