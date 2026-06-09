import { useEffect } from 'react';
import { X, Activity, MapPin, Clock } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type FarmActivityEntry = {
	activity: string;
	date: string;
};

interface Props {
	farmId:     string;
	location:   string;
	activities: FarmActivityEntry[];
	onClose:    () => void;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
	try {
		return new Date(iso).toLocaleDateString('en-IN', {
			day: '2-digit', month: 'short', year: 'numeric',
		});
	} catch { return iso; }
};

const fmtTime = (iso: string) => {
	try {
		return new Date(iso).toLocaleTimeString('en-IN', {
			hour: '2-digit', minute: '2-digit', hour12: true,
		});
	} catch { return ''; }
};

// Group activities by date label
const groupByDate = (activities: FarmActivityEntry[]) => {
	const sorted = [...activities].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
	);

	const groups: { dateLabel: string; items: FarmActivityEntry[] }[] = [];
	for (const item of sorted) {
		const label = fmtDate(item.date);
		const existing = groups.find(g => g.dateLabel === label);
		if (existing) {
			existing.items.push(item);
		} else {
			groups.push({ dateLabel: label, items: [item] });
		}
	}
	return groups;
};

const shortId = (id: string) => id.slice(0, 8).toUpperCase();

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

const FarmActivityModal = ({ farmId, location, activities, onClose }: Props) => {
	// Close on Escape
	useEffect(() => {
		const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, [onClose]);

	const groups = groupByDate(activities);

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
			style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
			onClick={e => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">

				{/* ── Header ── */}
				<div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
								<Activity className="w-4 h-4 text-emerald-600" />
							</div>
							<h2 className="text-base font-bold text-gray-900">Activity Log</h2>
							<span className="rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 ring-1 ring-emerald-200">
								{activities.length} {activities.length === 1 ? 'entry' : 'entries'}
							</span>
						</div>

						<div className="mt-2 flex flex-col gap-0.5">
							<div className="flex items-center gap-1.5 text-xs text-gray-500">
								<span className="font-mono font-semibold text-gray-700">{shortId(farmId)}…</span>
								<span className="text-gray-300">·</span>
								<span className="truncate">{farmId}</span>
							</div>
							{location && (
								<div className="flex items-center gap-1 text-[11px] text-gray-400">
									<MapPin className="w-3 h-3 shrink-0" />
									<span className="truncate">{location}</span>
								</div>
							)}
						</div>
					</div>

					<button
						onClick={onClose}
						className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* ── Timeline body ── */}
				<div className="flex-1 overflow-y-auto px-5 py-4">
					{activities.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
							<Activity className="w-8 h-8 opacity-30" />
							<p className="text-sm">No activities recorded yet</p>
						</div>
					) : (
						<div className="space-y-5">
							{groups.map((group, gi) => (
								<div key={gi}>
									{/* Date group label */}
									<div className="flex items-center gap-2 mb-3">
										<span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
											{group.dateLabel}
										</span>
										<div className="flex-1 h-px bg-gray-100" />
									</div>

									{/* Activities in this date group */}
									<div className="relative pl-5 space-y-3">
										{/* Vertical line */}
										{group.items.length > 1 && (
											<div className="absolute left-[7px] top-3 bottom-3 w-px bg-emerald-100" />
										)}

										{group.items.map((item, ii) => (
											<div key={ii} className="relative flex items-start gap-3">
												{/* Dot */}
												<div className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white ring-offset-0 shrink-0 flex items-center justify-center">
													<div className="w-1.5 h-1.5 rounded-full bg-white" />
												</div>

												{/* Content */}
												<div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
													<div className="text-sm font-semibold text-gray-800 leading-snug">
														{item.activity}
													</div>
													<div className="flex items-center gap-1 mt-1">
														<Clock className="w-3 h-3 text-gray-400" />
														<span className="text-[11px] text-gray-400">{fmtTime(item.date)}</span>
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* ── Footer ── */}
				<div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
					<span className="text-[11px] text-gray-400">Sorted newest first</span>
					<button
						onClick={onClose}
						className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
};

export default FarmActivityModal;
