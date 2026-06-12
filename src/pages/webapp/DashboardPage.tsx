import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, XCircle, LayoutList, ChevronRight, AlertCircle } from 'lucide-react';
import type { Approval } from './WebApp';
import { TYPE_META, STATUS_META, fmtDate } from './ApprovalsPage';

interface Props {
	approvals:  Approval[];
	onApprove:  (id: string) => void;
	onReject:   (id: string) => void;
}

const DashboardPage = ({ approvals, onApprove, onReject }: Props) => {
	const pending  = approvals.filter(a => a.status === 'pending');
	const approved = approvals.filter(a => a.status === 'approved');
	const rejected = approvals.filter(a => a.status === 'rejected');

	const stats = [
		{ label: 'Pending',  value: pending.length,  Icon: Clock3,        bg: 'bg-amber-50',   iconBg: 'bg-amber-100',   iconCls: 'text-amber-600',   valCls: 'text-amber-700'   },
		{ label: 'Approved', value: approved.length, Icon: CheckCircle2,  bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconCls: 'text-emerald-600', valCls: 'text-emerald-700' },
		{ label: 'Rejected', value: rejected.length, Icon: XCircle,       bg: 'bg-red-50',     iconBg: 'bg-red-100',     iconCls: 'text-red-500',     valCls: 'text-red-600'     },
		{ label: 'Total',    value: approvals.length, Icon: LayoutList,   bg: 'bg-gray-50',    iconBg: 'bg-gray-200',    iconCls: 'text-gray-600',    valCls: 'text-gray-800'    },
	];

	return (
		<div className="p-4 space-y-5">

			{/* Greeting */}
			<div>
				<h1 className="text-xl font-bold text-gray-900">Good morning 👋</h1>
				<p className="text-sm text-gray-500 mt-0.5">
					{pending.length > 0
						? `You have ${pending.length} approval${pending.length > 1 ? 's' : ''} waiting.`
						: 'All caught up — no pending approvals.'}
				</p>
			</div>

			{/* Stats grid */}
			<div className="grid grid-cols-2 gap-3">
				{stats.map(({ label, value, Icon, bg, iconBg, iconCls, valCls }) => (
					<div key={label} className={`rounded-2xl p-4 ${bg} flex items-center gap-3`}>
						<div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
							<Icon className={`w-4.5 h-4.5 ${iconCls}`} style={{ width: 18, height: 18 }} />
						</div>
						<div>
							<div className={`text-2xl font-bold leading-none ${valCls}`}>{value}</div>
							<div className="text-[11px] text-gray-500 mt-0.5 font-medium">{label}</div>
						</div>
					</div>
				))}
			</div>

			{/* Pending approvals */}
			{pending.length > 0 ? (
				<div>
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-sm font-bold text-gray-800">Pending Approvals</h2>
						<Link
							to="/approval/webapp/approvals"
							className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5"
						>
							View all <ChevronRight className="w-3.5 h-3.5" />
						</Link>
					</div>

					<div className="space-y-3">
						{pending.slice(0, 3).map(item => {
							const tm = TYPE_META[item.type];
							return (
								<div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
									{/* Left type strip */}
									<div className={`w-1 shrink-0 ${tm.strip}`} />

									<div className="flex-1 p-3.5 space-y-2">
										{/* Type + priority */}
										<div className="flex items-center gap-2">
											<span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ${tm.badge}`}>
												{item.type}
											</span>
											{item.priority === 'high' && (
												<span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
													<AlertCircle className="w-3 h-3" />
													High
												</span>
											)}
											<span className="ml-auto text-[10px] font-mono text-gray-400">{item.id}</span>
										</div>

										{/* Title */}
										<p className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</p>

										{/* Requester + amount */}
										<div className="flex items-center justify-between text-xs text-gray-500">
											<span>{item.requester} · {item.department}</span>
											{item.amount != null
												? <span className="font-bold text-gray-700">₹{item.amount.toLocaleString('en-IN')}</span>
												: <span className="text-gray-300">—</span>
											}
										</div>

										{/* Actions */}
										<div className="flex gap-2 pt-0.5">
											<button
												onClick={() => onReject(item.id)}
												className="flex-1 py-1.5 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 active:scale-95 transition-all"
											>
												Reject
											</button>
											<button
												onClick={() => onApprove(item.id)}
												className="flex-1 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
											>
												Approve
											</button>
										</div>
									</div>
								</div>
							);
						})}

						{pending.length > 3 && (
							<Link
								to="/approval/webapp/approvals"
								className="w-full py-2.5 rounded-2xl border border-dashed border-gray-300 text-sm text-gray-500 font-medium flex items-center justify-center gap-1 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
							>
								+{pending.length - 3} more pending
								<ChevronRight className="w-4 h-4" />
							</Link>
						)}
					</div>
				</div>
			) : (
				<div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center gap-2 text-center">
					<CheckCircle2 className="w-10 h-10 text-emerald-400" />
					<p className="text-sm font-semibold text-gray-700">All caught up!</p>
					<p className="text-xs text-gray-400">No pending approvals at this time.</p>
				</div>
			)}

			{/* Recent approved/rejected */}
			{(approved.length > 0 || rejected.length > 0) && (
				<div>
					<h2 className="text-sm font-bold text-gray-800 mb-3">Recently Resolved</h2>
					<div className="space-y-2">
						{[...approved, ...rejected]
							.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
							.slice(0, 3)
							.map(item => {
								const sm = STATUS_META[item.status as 'approved' | 'rejected'];
								const tm = TYPE_META[item.type];
								return (
									<div key={item.id} className="bg-white rounded-xl border border-gray-100 px-3.5 py-3 flex items-center gap-3">
										<div className={`w-1.5 h-full min-h-[32px] rounded-full ${tm.strip}`} />
										<div className="flex-1 min-w-0">
											<p className="text-xs font-semibold text-gray-800 truncate">{item.title}</p>
											<p className="text-[11px] text-gray-400">{item.requester} · {fmtDate(item.date)}</p>
										</div>
										<span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${sm.badge}`}>
											{sm.label}
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

export default DashboardPage;
