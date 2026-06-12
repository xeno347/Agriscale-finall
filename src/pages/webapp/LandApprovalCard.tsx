import { useState, useEffect } from 'react';
import {
	Calendar, AlertCircle, Check, X,
	ChevronRight, ChevronLeft, Play, Navigation, Phone, MapPin, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Approval, LandDetails } from './WebApp';
import { CATEGORY_META } from './WebApp';
import { STATUS_META, fmtDate } from './ApprovalCard';
import SatelliteMap from './SatelliteMap';
import { useAuth } from '@/context/AuthContext';
import { getBaseUrl } from '@/lib/config';

type LandApproval = Approval & { landDetails: LandDetails };

interface Props {
	item:      LandApproval;
	onApprove: (id: string) => void;
	onReject:  (id: string) => void;
}

const SectionLabel = ({ label }: { label: string }) => (
	<p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
);

// ── Full-screen media lightbox ─────────────────────────────────────────────

type MediaItem = { type: 'image' | 'video'; src: string };

const MediaViewer = ({
	items,
	initialIndex,
	onClose,
}: {
	items:        MediaItem[];
	initialIndex: number;
	onClose:      () => void;
}) => {
	const [idx, setIdx] = useState(initialIndex);
	const current = items[idx];

	useEffect(() => {
		document.body.style.overflow = 'hidden';
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape')     onClose();
			if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1));
			if (e.key === 'ArrowRight') setIdx(i => Math.min(items.length - 1, i + 1));
		};
		window.addEventListener('keydown', onKey);
		return () => {
			document.body.style.overflow = '';
			window.removeEventListener('keydown', onKey);
		};
	}, [items.length, onClose]);

	const imageCount = items.filter(m => m.type === 'image').length;

	return (
		<div className="fixed inset-0 z-[300] bg-black flex flex-col select-none">
			<div className="flex items-center justify-between px-4 pt-5 pb-2 shrink-0">
				<span className="text-white/60 text-sm font-medium">
					{current.type === 'video' ? 'Survey Video' : `Photo ${idx + 1} of ${imageCount}`}
				</span>
				<button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center active:bg-white/25 transition-colors">
					<X className="w-5 h-5 text-white" />
				</button>
			</div>

			<div className="flex-1 flex items-center justify-center px-3 min-h-0">
				{current.type === 'image' ? (
					<img src={current.src} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
				) : (
					<video key={current.src} src={current.src} controls autoPlay playsInline className="max-w-full max-h-full rounded-xl" />
				)}
			</div>

			<div className="flex items-center justify-between px-4 py-5 shrink-0">
				<button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center disabled:opacity-25 active:bg-white/25 transition-colors">
					<ChevronLeft className="w-5 h-5 text-white" />
				</button>
				<div className="flex gap-1.5 items-center">
					{items.map((_, i) => (
						<button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all duration-200 ${i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/35'}`} />
					))}
				</div>
				<button onClick={() => setIdx(i => Math.min(items.length - 1, i + 1))} disabled={idx === items.length - 1} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center disabled:opacity-25 active:bg-white/25 transition-colors">
					<ChevronRight className="w-5 h-5 text-white" />
				</button>
			</div>
		</div>
	);
};

// ── Forward to Director modal ──────────────────────────────────────────────

interface Director {
	staff_id:      string;
	staff_name:    string;
	staff_contact: string | null;
}

const ForwardToDirectorModal = ({
	token,
	leadId,
	onClose,
	onForward,
}: {
	token:     string;
	leadId:    string;
	onClose:   () => void;
	onForward: (directors: Director[]) => void;
}) => {
	const [directors, setDirectors]   = useState<Director[]>([]);
	const [loading, setLoading]       = useState(true);
	const [selected, setSelected]     = useState<Set<string>>(new Set());
	const [forwarding, setForwarding] = useState(false);

	useEffect(() => {
		document.body.style.overflow = 'hidden';
		const base = getBaseUrl().replace(/\/$/, '');
		fetch(`${base}/admin_staff/get_directors`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then(r => r.json())
			.then(data => setDirectors(data?.directors ?? []))
			.catch(() => toast.error('Failed to load directors'))
			.finally(() => setLoading(false));
		return () => { document.body.style.overflow = ''; };
	}, [token]);

	const toggle = (id: string) =>
		setSelected(prev => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const handleForward = async () => {
		if (selected.size === 0) return;
		setForwarding(true);
		const chosen = directors.filter(d => selected.has(d.staff_id));
		try {
			const base = getBaseUrl().replace(/\/$/, '');
			const res = await fetch(`${base}/farmer_managment/forward_to_director`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					lead_id: leadId,
					forwarded_directors: chosen.map(d => ({
						staff_id:   d.staff_id,
						staff_name: d.staff_name,
					})),
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => null);
				throw new Error(err?.message ?? err?.detail ?? `Request failed (HTTP ${res.status})`);
			}
			onForward(chosen);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to forward');
			setForwarding(false);
		}
	};

	return (
		<>
			<div className="fixed inset-0 bg-black/70 z-[200]" onClick={onClose} />
			<div className="fixed bottom-0 left-0 right-0 z-[200] max-w-md mx-auto bg-white rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl">

				{/* Header */}
				<div className="shrink-0 px-5 pt-3 pb-4 border-b border-gray-100">
					<div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
					<div className="flex items-start justify-between gap-3">
						<div>
							<h2 className="text-sm font-bold text-gray-900">Forward to Director</h2>
							<p className="text-xs text-gray-500 mt-0.5">Select one or more directors to forward this approval to</p>
						</div>
						<button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
							<X className="w-4 h-4 text-gray-500" />
						</button>
					</div>
				</div>

				{/* Director list */}
				<div className="flex-1 overflow-y-auto px-5 py-4">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
						</div>
					) : directors.length === 0 ? (
						<p className="text-center text-sm text-gray-400 py-12">No directors found</p>
					) : (
						<div className="space-y-2">
							{directors.map(d => {
								const isOn = selected.has(d.staff_id);
								return (
									<button
										key={d.staff_id}
										onClick={() => toggle(d.staff_id)}
										className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
											isOn
												? 'bg-emerald-50 border-emerald-300'
												: 'bg-white border-gray-200 hover:border-gray-300'
										}`}
									>
										<div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors ${
											isOn ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
										}`}>
											{d.staff_name.charAt(0).toUpperCase()}
										</div>
										<div className="flex-1 min-w-0">
											<p className={`text-sm font-semibold truncate ${isOn ? 'text-emerald-900' : 'text-gray-800'}`}>
												{d.staff_name}
											</p>
											<p className="text-[11px] text-gray-400 mt-0.5">Director</p>
										</div>
										<div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
											isOn ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
										}`}>
											{isOn && <Check className="w-3 h-3 text-white" />}
										</div>
									</button>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="shrink-0 px-5 py-4 border-t border-gray-100">
					<button
						onClick={handleForward}
						disabled={selected.size === 0 || forwarding}
						className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
					>
						{forwarding ? (
							<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
						) : (
							<>
								<Send className="w-4 h-4" />
								{selected.size > 0
									? `Forward to ${selected.size} Director${selected.size > 1 ? 's' : ''}`
									: 'Select a Director'}
							</>
						)}
					</button>
				</div>
			</div>
		</>
	);
};

// ── Detail bottom-sheet modal ──────────────────────────────────────────────

const LandDetailModal = ({
	item,
	onClose,
	onApprove,
	onReject,
	onOpenMedia,
	videoMediaIndex,
	hasVideo,
}: {
	item:            LandApproval;
	onClose:         () => void;
	onApprove:       (id: string) => void;
	onReject:        (id: string) => void;
	onOpenMedia:     (index: number) => void;
	videoMediaIndex: number;
	hasVideo:        boolean;
}) => {
	const { token, user }               = useAuth();
	const [showForward, setShowForward] = useState(false);
	const [approving, setApproving]     = useState(false);
	const ld = item.landDetails;
	const cm = CATEGORY_META[item.category];

	const isEA = user?.designation === 'EA To Director';

	useEffect(() => {
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = ''; };
	}, []);

	const videoName = `land_survey_${item.id.replace('LND-', '').replace('-', '')}.mp4`;

	const handleApproveClick = async () => {
		if (isEA) {
			setShowForward(true);
			return;
		}
		setApproving(true);
		try {
			const base = getBaseUrl().replace(/\/$/, '');
			const res = await fetch(`${base}/farmer_managment/director_approved_and_forward`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization:  `Bearer ${token}`,
				},
				body: JSON.stringify({
					lead_id:         item.id,
					director_id:     user?.id ?? '',
					approval_status: 'approved',
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => null);
				throw new Error(err?.message ?? err?.detail ?? `Request failed (HTTP ${res.status})`);
			}
			onApprove(item.id);
			onClose();
			toast.success('Lead approved successfully', { duration: 4000 });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Approval failed');
			setApproving(false);
		}
	};

	const handleForward = (directors: Director[]) => {
		onApprove(item.id);
		setShowForward(false);
		onClose();
		toast.success(
			directors.length > 1
				? `Forwarded to ${directors.length} directors`
				: `Forwarded to ${directors[0]?.staff_name}`,
			{ duration: 4000 },
		);
	};

	return (
		<>
			{/* Backdrop — z-[100] clears the bottom nav (z-50) */}
			<div className="fixed inset-0 bg-black/60 z-[100]" onClick={onClose} />

			<div className="fixed bottom-0 left-0 right-0 z-[100] max-w-md mx-auto bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl">

				{/* Handle + header */}
				<div className="shrink-0 px-5 pt-3 pb-4 border-b border-gray-100">
					<div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<span className={`text-[11px] font-bold ${cm.text}`}>{item.subType}</span>
							<h2 className="text-sm font-bold text-gray-900 leading-snug mt-0.5 truncate">{item.title}</h2>
							<p className="text-[10px] font-mono text-gray-400 mt-0.5">{item.id}</p>
						</div>
						<button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
							<X className="w-4 h-4 text-gray-500" />
						</button>
					</div>
				</div>

				{/* Scrollable body */}
				<div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

					{/* Images */}
					<div>
						<SectionLabel label="Land Images" />
						<div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
							{ld.images.map((src, i) => (
								<img
									key={i}
									src={src}
									alt={`Land photo ${i + 1}`}
									onClick={() => onOpenMedia(i)}
									className="shrink-0 w-44 h-32 rounded-xl object-cover bg-gray-100 cursor-pointer active:scale-[0.97] transition-transform"
								/>
							))}
						</div>
					</div>

					{/* Video */}
					<div>
						<SectionLabel label="Land Video" />
						<div
							onClick={hasVideo ? () => onOpenMedia(videoMediaIndex) : undefined}
							className={`rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 h-28 flex items-center gap-4 px-5 transition-opacity ${
								hasVideo ? 'cursor-pointer active:opacity-75' : 'opacity-50'
							}`}
						>
							<div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
								<Play className="w-5 h-5 text-white fill-white ml-0.5" />
							</div>
							<div>
								<p className="text-white text-xs font-semibold">Land Survey Video</p>
								<p className="text-white/50 text-[10px] mt-0.5">{hasVideo ? videoName : 'No video available'}</p>
							</div>
						</div>
					</div>

					{/* Land Mapping */}
					<div>
						<SectionLabel label="Land Mapping" />
						<div className="bg-gray-50 rounded-xl p-3.5 space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-gray-800">{ld.mapping.surveyNo}</span>
								<span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ring-1 ${cm.badge}`}>{ld.mapping.area}</span>
							</div>
							<p className="text-xs font-semibold text-gray-600">{ld.mapping.village}</p>
							<p className="text-xs text-gray-400">{ld.mapping.district}</p>
							<div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400 pt-1.5 border-t border-gray-200">
								<Navigation className="w-3 h-3 text-emerald-500 shrink-0" />
								{ld.mapping.lat.toFixed(4)}° N,&nbsp;{ld.mapping.lng.toFixed(4)}° E
							</div>
						</div>
					</div>

					{/* Owner Details */}
					<div>
						<SectionLabel label="Owner Details" />
						<div className="bg-gray-50 rounded-xl p-3.5 space-y-3">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
									<span className="text-base font-bold text-emerald-700">{ld.owner.name.charAt(0)}</span>
								</div>
								<span className="text-sm font-bold text-gray-800">{ld.owner.name}</span>
							</div>
							<a href={`tel:${ld.owner.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-xs font-semibold text-blue-600">
								<Phone className="w-3.5 h-3.5 shrink-0" />
								{ld.owner.phone}
							</a>
							<div className="flex items-start gap-2 text-xs text-gray-500">
								<MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400 mt-0.5" />
								<span className="leading-relaxed">{ld.owner.address}</span>
							</div>
						</div>
					</div>

					{/* Action buttons */}
					{item.status === 'pending' && (
						<div className="flex gap-2.5 pb-2">
							<button
								onClick={() => { onReject(item.id); onClose(); }}
								className="flex-1 py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
							>
								<X className="w-4 h-4" />Reject
							</button>
							<button
								onClick={handleApproveClick}
								disabled={approving}
								className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
							>
								{approving ? (
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
								) : isEA ? (
									<><Send className="w-4 h-4" />Forward</>
								) : (
									<><Check className="w-4 h-4" />Approve</>
								)}
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Forward to Director modal — z-[200] sits above detail modal */}
			{showForward && token && (
				<ForwardToDirectorModal
					token={token}
					leadId={item.id}
					onClose={() => setShowForward(false)}
					onForward={handleForward}
				/>
			)}
		</>
	);
};

// ── Card ───────────────────────────────────────────────────────────────────

const LandApprovalCard = ({ item, onApprove, onReject }: Props) => {
	const [showModal, setShowModal]     = useState(false);
	const [mediaViewer, setMediaViewer] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });

	const cm = CATEGORY_META[item.category];
	const sm = STATUS_META[item.status];
	const ld = item.landDetails;

	const videoName       = `land_survey_${item.id.replace('LND-', '').replace('-', '')}.mp4`;
	const hasVideo        = !!(ld.videoUrl && ld.videoUrl !== '#');
	const mediaItems: MediaItem[] = [
		...ld.images.map(src => ({ type: 'image' as const, src })),
		...(hasVideo ? [{ type: 'video' as const, src: ld.videoUrl }] : []),
	];
	const videoMediaIndex = ld.images.length;
	const openMedia       = (index: number) => setMediaViewer({ open: true, index });

	return (
		<>
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
				<div className={`w-1 shrink-0 ${cm.strip}`} />

				<div className="flex-1 p-4 space-y-3 min-w-0">

					<div className="flex items-center gap-2 flex-wrap">
						<span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ${cm.badge}`}>{item.subType}</span>
						{item.priority === 'high' && (
							<span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
								<AlertCircle className="w-3 h-3" />High
							</span>
						)}
						<span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ${sm.badge}`}>{sm.label}</span>
					</div>

					<div>
						<h3 className="text-sm font-bold text-gray-900 leading-snug">{item.title}</h3>
						<p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
					</div>

					{/* Satellite map */}
					<div className="relative rounded-xl overflow-hidden h-40 bg-gray-100 isolate">
						<SatelliteMap lat={ld.mapping.lat} lng={ld.mapping.lng} coordinates={ld.mapping.coordinates} className="w-full h-full" />
						<div className="absolute top-2 right-2 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
							{ld.mapping.area}
						</div>
					</div>

					{/* Images grid */}
					<div className="grid grid-cols-3 gap-1.5">
						{ld.images.map((src, i) => (
							<div key={i} onClick={() => openMedia(i)} className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer active:scale-95 transition-transform">
								<img src={src} alt={`Land photo ${i + 1}`} className="w-full h-full object-cover" />
							</div>
						))}
					</div>

					{/* Video row */}
					<div
						onClick={hasVideo ? () => openMedia(videoMediaIndex) : undefined}
						className={`flex items-center gap-3 rounded-lg overflow-hidden bg-gradient-to-r from-gray-800 to-gray-700 px-4 h-14 transition-opacity ${hasVideo ? 'cursor-pointer active:opacity-75' : 'opacity-60'}`}
					>
						<div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
							<Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
						</div>
						<div className="min-w-0">
							<p className="text-white text-[11px] font-semibold leading-none">Land Survey Video</p>
							<p className="text-white/50 text-[10px] mt-0.5 truncate">{videoName}</p>
						</div>
					</div>

					<button onClick={() => setShowModal(true)} className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 active:scale-[0.98] transition-all">
						<span>View All Details</span>
						<ChevronRight className="w-4 h-4" />
					</button>

					<div className="flex items-center justify-between text-xs text-gray-400">
						<div className="flex items-center gap-1">
							<Calendar className="w-3 h-3" />{fmtDate(item.date)}
						</div>
						<span className="font-mono text-[10px] text-gray-300">{item.id}</span>
					</div>
				</div>
			</div>

			{showModal && (
				<LandDetailModal
					item={item}
					onClose={() => setShowModal(false)}
					onApprove={onApprove}
					onReject={onReject}
					onOpenMedia={openMedia}
					videoMediaIndex={videoMediaIndex}
					hasVideo={hasVideo}
				/>
			)}

			{mediaViewer.open && (
				<MediaViewer
					items={mediaItems}
					initialIndex={mediaViewer.index}
					onClose={() => setMediaViewer({ open: false, index: 0 })}
				/>
			)}
		</>
	);
};

export default LandApprovalCard;
