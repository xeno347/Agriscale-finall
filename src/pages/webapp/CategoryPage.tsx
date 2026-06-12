import { useState, Fragment } from 'react';
import type { Approval, ApprovalCategory, ApprovalStatus } from './WebApp';
import { CATEGORY_META } from './WebApp';
import ApprovalCard from './ApprovalCard';

// ─────────────────────────────────────────────────────────────
// Generic page used by Lands / Purchase / HR / Accounts
// ─────────────────────────────────────────────────────────────

export interface CategoryConfig {
	category: ApprovalCategory;
	subTypes: string[];
}

interface Props {
	config:      CategoryConfig;
	approvals:   Approval[];
	onApprove:   (id: string) => void;
	onReject:    (id: string) => void;
	renderCard?: (item: Approval, onApprove: (id: string) => void, onReject: (id: string) => void) => React.ReactNode;
}

const STATUS_TABS: { key: ApprovalStatus | 'all'; label: string }[] = [
	{ key: 'all',      label: 'All'      },
	{ key: 'pending',  label: 'Pending'  },
	{ key: 'approved', label: 'Approved' },
	{ key: 'rejected', label: 'Rejected' },
];

const CategoryPage = ({ config, approvals, onApprove, onReject, renderCard }: Props) => {
	const [activeStatus,  setActiveStatus]  = useState<ApprovalStatus | 'all'>('pending');
	const [activeSubType, setActiveSubType] = useState('all');

	const cm       = CATEGORY_META[config.category];
	const catItems = approvals.filter(a => a.category === config.category);

	const filtered = catItems
		.filter(a => activeStatus  === 'all' || a.status  === activeStatus)
		.filter(a => activeSubType === 'all' || a.subType === activeSubType);

	const pendingCount  = catItems.filter(a => a.status === 'pending').length;
	const countFor = (s: ApprovalStatus | 'all') =>
		s === 'all' ? catItems.length : catItems.filter(a => a.status === s).length;

	return (
		<div className="flex flex-col min-h-full">

			{/* ── Category header band ── */}
			<div className={`px-4 pt-5 pb-4 ${cm.lightBg} border-b border-gray-100`}>
				<div className="flex items-center gap-3">
					<div className={`w-11 h-11 rounded-2xl ${cm.iconBg} flex items-center justify-center`}>
						<cm.Icon className={`w-5 h-5 ${cm.text}`} />
					</div>
					<div>
						<h1 className="text-xl font-bold text-gray-900">{cm.label}</h1>
						<p className={`text-sm font-semibold ${cm.text}`}>
							{pendingCount > 0
								? `${pendingCount} pending approval${pendingCount !== 1 ? 's' : ''}`
								: 'All caught up'}
						</p>
					</div>
				</div>
			</div>

			{/* ── Sticky filter bar ── */}
			<div className="sticky top-14 z-30 bg-white border-b border-gray-100 px-4 pt-3 pb-3 space-y-2.5">

				{/* Status tabs */}
				<div className="flex gap-1.5">
					{STATUS_TABS.map(tab => {
						const count    = countFor(tab.key);
						const isActive = activeStatus === tab.key;
						return (
							<button
								key={tab.key}
								onClick={() => setActiveStatus(tab.key)}
								className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
									isActive
										? 'bg-gray-900 text-white shadow-sm'
										: 'bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300'
								}`}
							>
								{tab.label}
								{count > 0 && (
									<span className={`text-[10px] px-1 rounded-full font-bold ${
										isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
									}`}>
										{count}
									</span>
								)}
							</button>
						);
					})}
				</div>

				{/* Sub-type chips */}
				<div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
					{['all', ...config.subTypes].map(st => {
						const isActive = activeSubType === st;
						return (
							<button
								key={st}
								onClick={() => setActiveSubType(st)}
								className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
									isActive
										? `${cm.badge} border-transparent`
										: 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
								}`}
							>
								{st === 'all' ? 'All Types' : st}
							</button>
						);
					})}
				</div>
			</div>

			{/* ── Cards list ── */}
			<div className="flex-1 p-4 space-y-3">
				{filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
						<div className={`w-12 h-12 rounded-2xl ${cm.iconBg} flex items-center justify-center`}>
							<cm.Icon className={`w-6 h-6 ${cm.text} opacity-50`} />
						</div>
						<div className="text-center">
							<p className="text-sm font-semibold text-gray-600">No approvals found</p>
							<p className="text-xs text-gray-400 mt-0.5">Try adjusting the filters above</p>
						</div>
					</div>
				) : (
					filtered.map(item =>
						renderCard
							? <Fragment key={item.id}>{renderCard(item, onApprove, onReject)}</Fragment>
							: <ApprovalCard key={item.id} item={item} onApprove={onApprove} onReject={onReject} />
					)
				)}
			</div>
		</div>
	);
};

export default CategoryPage;
