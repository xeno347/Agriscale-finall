import { Link } from 'react-router-dom';
import { ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Approval, ApprovalCategory } from './WebApp';
import { CATEGORY_META } from './WebApp';
import ApprovalCard from './ApprovalCard';
import { fmtDate } from './ApprovalCard';

interface Props {
	approvals: Approval[];
	onApprove: (id: string) => void;
	onReject:  (id: string) => void;
}

const BASE = '/approval/webapp';

const CATEGORY_ROUTES: Record<ApprovalCategory, string> = {
	lands:    `${BASE}/lands`,
	purchase: `${BASE}/purchase`,
	hr:       `${BASE}/hr`,
	accounts: `${BASE}/accounts`,
};

const HomePage = ({ approvals, onApprove, onReject }: Props) => {
	const totalPending  = approvals.filter(a => a.status === 'pending').length;
	const totalApproved = approvals.filter(a => a.status === 'approved').length;

	const pendingOf  = (cat: ApprovalCategory) => approvals.filter(a => a.category === cat && a.status === 'pending').length;
	const approvedOf = (cat: ApprovalCategory) => approvals.filter(a => a.category === cat && a.status === 'approved').length;

	const urgent = approvals
		.filter(a => a.status === 'pending' && a.priority === 'high')
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	const today = new Date().toLocaleDateString('en-IN', {
		weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
	});

	return (
		<div className="p-4 space-y-6 pb-4">

			{/* ── Greeting ── */}
			<div className="pt-1">
				<h1 className="text-2xl font-bold text-gray-900">Good morning 👋</h1>
				<p className="text-sm text-gray-400 mt-0.5">{today}</p>
				<p className="text-sm text-gray-600 mt-2 font-medium">
					{totalPending > 0
						? <><span className="text-red-500 font-bold">{totalPending}</span> approvals need your attention.</>
						: <>All caught up — no pending approvals.</>
					}
				</p>
			</div>

			{/* ── Summary chips ── */}
			<div className="flex gap-2">
				<div className="flex-1 bg-amber-50 rounded-2xl p-3 text-center ring-1 ring-amber-100">
					<div className="text-2xl font-bold text-amber-700">{totalPending}</div>
					<div className="text-[11px] font-semibold text-amber-600 mt-0.5">Pending</div>
				</div>
				<div className="flex-1 bg-emerald-50 rounded-2xl p-3 text-center ring-1 ring-emerald-100">
					<div className="text-2xl font-bold text-emerald-700">{totalApproved}</div>
					<div className="text-[11px] font-semibold text-emerald-600 mt-0.5">Approved</div>
				</div>
				<div className="flex-1 bg-gray-50 rounded-2xl p-3 text-center ring-1 ring-gray-100">
					<div className="text-2xl font-bold text-gray-700">{approvals.length}</div>
					<div className="text-[11px] font-semibold text-gray-500 mt-0.5">Total</div>
				</div>
			</div>

			{/* ── Category cards ── */}
			<div>
				<h2 className="text-sm font-bold text-gray-700 mb-3">Departments</h2>
				<div className="grid grid-cols-2 gap-3">
					{(Object.keys(CATEGORY_META) as ApprovalCategory[]).map(cat => {
						const cm      = CATEGORY_META[cat];
						const pending = pendingOf(cat);
						const done    = approvedOf(cat);
						return (
							<Link
								key={cat}
								to={CATEGORY_ROUTES[cat]}
								className={`rounded-2xl p-4 ${cm.lightBg} ring-1 ring-inset ${
									pending > 0 ? 'ring-current/20' : 'ring-gray-100'
								} flex flex-col gap-3 active:scale-95 transition-transform`}
							>
								<div className="flex items-start justify-between">
									<div className={`w-9 h-9 rounded-xl ${cm.iconBg} flex items-center justify-center`}>
										<cm.Icon className={`w-4.5 h-4.5 ${cm.text}`} style={{ width: 18, height: 18 }} />
									</div>
									{pending > 0 && (
										<span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
											{pending > 9 ? '9+' : pending}
										</span>
									)}
								</div>
								<div>
									<div className={`text-sm font-bold ${cm.text}`}>{cm.label}</div>
									<div className="text-xs text-gray-500 mt-0.5">
										{pending > 0
											? <span className="font-semibold text-red-500">{pending} pending</span>
											: <span className="text-emerald-600 font-semibold">All clear ✓</span>
										}
									</div>
									{done > 0 && (
										<div className="text-[10px] text-gray-400 mt-0.5">{done} approved</div>
									)}
								</div>
								<div className={`flex items-center gap-0.5 text-[11px] font-semibold ${cm.text}`}>
									Open <ChevronRight className="w-3 h-3" />
								</div>
							</Link>
						);
					})}
				</div>
			</div>

			{/* ── Urgent attention ── */}
			{urgent.length > 0 && (
				<div>
					<div className="flex items-center gap-2 mb-3">
						<AlertCircle className="w-4 h-4 text-red-500" />
						<h2 className="text-sm font-bold text-gray-800">Urgent — Needs Attention</h2>
						<span className="ml-auto text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full ring-1 ring-red-200">
							{urgent.length} high priority
						</span>
					</div>
					<div className="space-y-3">
						{urgent.slice(0, 4).map(item => (
							<ApprovalCard
								key={item.id}
								item={item}
								onApprove={onApprove}
								onReject={onReject}
							/>
						))}
						{urgent.length > 4 && (
							<p className="text-center text-xs text-gray-400 py-1">
								+{urgent.length - 4} more urgent items across departments
							</p>
						)}
					</div>
				</div>
			)}

			{/* ── All clear state ── */}
			{totalPending === 0 && (
				<div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center gap-3 text-center">
					<CheckCircle2 className="w-12 h-12 text-emerald-400" />
					<div>
						<p className="text-base font-bold text-gray-800">All caught up!</p>
						<p className="text-sm text-gray-400 mt-1">No pending approvals across any department.</p>
					</div>
				</div>
			)}

			{/* ── Recent resolved ── */}
			{totalApproved > 0 && (
				<div>
					<h2 className="text-sm font-bold text-gray-700 mb-3">Recently Resolved</h2>
					<div className="space-y-2">
						{approvals
							.filter(a => a.status !== 'pending')
							.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
							.slice(0, 4)
							.map(item => {
								const cm = CATEGORY_META[item.category];
								return (
									<div key={item.id} className="bg-white rounded-xl border border-gray-100 px-3.5 py-3 flex items-center gap-3">
										<div className={`w-1.5 self-stretch rounded-full ${cm.strip}`} />
										<div className="flex-1 min-w-0">
											<p className="text-xs font-semibold text-gray-800 truncate">{item.title}</p>
											<p className="text-[11px] text-gray-400 mt-0.5">
												{cm.label} · {item.requester} · {fmtDate(item.date)}
											</p>
										</div>
										<span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ${
											item.status === 'approved'
												? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
												: 'bg-red-50 text-red-600 ring-red-200'
										}`}>
											{item.status === 'approved' ? 'Approved' : 'Rejected'}
										</span>
									</div>
								);
							})}
					</div>
				</div>
			)}
		</div>
	);
};

export default HomePage;
