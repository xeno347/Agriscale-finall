import { useState } from 'react';
import {
	AlertCircle, Calendar, Check, X,
	FileText, CheckCircle2, User, Building2,
	ArrowRightFromLine, ScrollText, Pen,
} from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { PRPreview } from '@/components/purchase/PRPreview';
import type { Approval, IndentDetails } from './WebApp';
import { CATEGORY_META } from './WebApp';
import { STATUS_META, fmtDate } from './ApprovalCard';

interface Props {
	item:      Approval;
	onApprove: (id: string) => void;
	onReject:  (id: string) => void;
}

// ── Indent Preview Dialog ─────────────────────────────────────────────────────
const IndentPreviewDialog = ({
	open,
	onClose,
	item,
	indentDetails,
	onApprove,
	onReject,
}: {
	open:          boolean;
	onClose:       () => void;
	item:          Approval;
	indentDetails: IndentDetails;
	onApprove:     (id: string) => void;
	onReject:      (id: string) => void;
}) => (
	<Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
		<DialogContent className="max-w-[1200px] w-[1200px] max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle className="flex items-center gap-2 text-base">
					<FileText className="w-4 h-4 text-blue-600" />
					PR Preview — {item.id}
				</DialogTitle>
			</DialogHeader>

			<div className="overflow-x-auto">
				<PRPreview
					indent={{
						project:                   indentDetails.project,
						prNo:                      item.id,
						date:                      item.date,
						department:                item.department,
						indentedBy:                indentDetails.indentedBy,
						forwardedBy:               indentDetails.forwardedBy,
						directorsApproval:         indentDetails.directorsApproval,
						remarksNotes:              indentDetails.remarksNotes,
						budgetHead:                indentDetails.budgetHead,
						items:                     indentDetails.items as any,
					}}
					attachments={{}}
					showDirectorSignature={item.status === 'approved'}
				/>
			</div>

			<DialogFooter>
				<div className="flex justify-end gap-2 w-full">
					<button
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
					>
						Close
					</button>
					{item.status === 'pending' && (
						<>
							<button
								onClick={() => { onReject(item.id); onClose(); }}
								className="px-4 py-2 text-sm font-medium border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1.5"
							>
								<X className="w-4 h-4" />Reject
							</button>
							<button
								onClick={() => { onApprove(item.id); onClose(); }}
								className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1.5"
							>
								<Check className="w-4 h-4" />Approve
							</button>
						</>
					)}
				</div>
			</DialogFooter>
		</DialogContent>
	</Dialog>
);

// ── Indent card — Purchase Indent / Purchase Order / Vendor Empanelment ───────
const IndentCard = ({ item, onApprove, onReject }: Props) => {
	const [showPreview, setShowPreview] = useState(false);
	const cm = CATEGORY_META[item.category];
	const sm = STATUS_META[item.status];

	return (
		<>
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
				<div className={`w-1 shrink-0 ${cm.strip}`} />
				<div className="flex-1 p-4 space-y-3 min-w-0">

					{/* Badges */}
					<div className="flex items-center gap-2 flex-wrap">
						<span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full ring-1 ring-blue-200">
							<FileText className="w-3 h-3" />{item.subType}
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

					{/* PR chip + title + description */}
					<div>
						<span className="inline-block text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded mb-1">
							{item.id}
						</span>
						<h3 className="text-sm font-bold text-gray-900 leading-snug">{item.title}</h3>
						<p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
					</div>

					{/* Dept + requester */}
					<div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
						<span className="flex items-center gap-1">
							<Building2 className="w-3 h-3 text-gray-400 shrink-0" />{item.department}
						</span>
						<span className="text-gray-200">·</span>
						<span className="flex items-center gap-1">
							<User className="w-3 h-3 text-gray-400 shrink-0" />{item.requester}
						</span>
					</div>

					{/* Amount + date */}
					<div className="flex items-end justify-between">
						{item.amount != null ? (
							<span className="text-base font-bold text-gray-900">
								₹{item.amount.toLocaleString('en-IN')}
							</span>
						) : (
							<span className="text-xs italic text-gray-300">Non-financial</span>
						)}
						<div className="flex items-center gap-1 text-xs text-gray-400">
							<Calendar className="w-3 h-3" />{fmtDate(item.date)}
						</div>
					</div>

					{/* Open Indent button — only when indentDetails present */}
					{item.indentDetails && (
						<button
							onClick={() => setShowPreview(true)}
							className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 active:scale-[0.98] transition-all"
						>
							<span className="flex items-center gap-1.5">
								<ScrollText className="w-3.5 h-3.5" />Open Indent
							</span>
							<ArrowRightFromLine className="w-3.5 h-3.5" />
						</button>
					)}

					{/* Approve / Reject — pending only */}
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
								className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
							>
								<Check className="w-3.5 h-3.5" />Approve
							</button>
						</div>
					)}

				</div>
			</div>

			{item.indentDetails && (
				<IndentPreviewDialog
					open={showPreview}
					onClose={() => setShowPreview(false)}
					item={item}
					indentDetails={item.indentDetails}
					onApprove={onApprove}
					onReject={onReject}
				/>
			)}
		</>
	);
};

// ── NFA card — Note For Approval ──────────────────────────────────────────────
const NfaCard = ({ item, onApprove, onReject }: Props) => {
	const sm = STATUS_META[item.status];
	const isApproved = item.status === 'approved';

	return (
		<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
			<div className="w-1 shrink-0 bg-blue-500" />
			<div className="flex-1 p-4 space-y-3 min-w-0">

				{/* Priority + status */}
				<div className="flex items-center gap-2">
					{item.priority === 'high' && (
						<span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
							<AlertCircle className="w-3 h-3" />High
						</span>
					)}
					<span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ${sm.badge}`}>
						{sm.label}
					</span>
				</div>

				{/* Quotation box */}
				<div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
					{isApproved && (
						<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
							<div className="-rotate-12 rounded-md border-4 border-green-600/30 px-5 py-1.5 text-xl font-black tracking-widest text-green-700/25">
								APPROVED
							</div>
						</div>
					)}

					{/* HO Approved badge + PR No */}
					<div className="flex items-center justify-between">
						<span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
							<CheckCircle2 className="w-3 h-3" />HO Approved
						</span>
						<span className="text-[10px] font-mono text-gray-400">{item.id}</span>
					</div>

					{/* Title + grand total */}
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-xs font-bold text-gray-800 leading-snug truncate">{item.title}</p>
							<p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
						</div>
						{item.amount != null && (
							<div className="text-right shrink-0">
								<p className="text-sm font-bold text-gray-900">₹{item.amount.toLocaleString('en-IN')}</p>
								<p className="text-[10px] text-gray-400">Grand total</p>
							</div>
						)}
					</div>

					{/* Footer row */}
					<div className="flex items-center gap-2 pt-1 border-t border-gray-200 text-[10px] text-gray-400 flex-wrap">
						<span className="flex items-center gap-1"><User className="w-3 h-3" />{item.requester}</span>
						<span>·</span>
						<span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{item.department}</span>
						<span className="ml-auto flex items-center gap-1">
							<Calendar className="w-3 h-3" />{fmtDate(item.date)}
						</span>
					</div>
				</div>

				{/* Approve & Forward — pending only */}
				{item.status === 'pending' && (
					<div className="flex gap-2">
						<button
							onClick={() => onReject(item.id)}
							className="flex-1 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
						>
							<X className="w-3.5 h-3.5" />Reject
						</button>
						<button
							onClick={() => onApprove(item.id)}
							className="flex-1 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-1.5"
						>
							<ArrowRightFromLine className="w-3.5 h-3.5" />Approve & Forward
						</button>
					</div>
				)}

			</div>
		</div>
	);
};

// ── Finance Ops Indent card (from get_finance_ops_indents API) ────────────────
const FinanceIndentCard = ({ item, onApprove, onReject }: Props) => {
	const fi    = item.financeIndent!;
	const isSPR = fi.indentType === 'Service Purchase Requisition';

	return (
		<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
			<div className={`w-1 shrink-0 ${isSPR ? 'bg-violet-500' : 'bg-blue-500'}`} />
			<div className="flex-1 p-4 space-y-3 min-w-0">

				{/* Type badge + PR number */}
				<div className="flex items-center gap-2 flex-wrap">
					<span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ${
						isSPR
							? 'text-violet-700 bg-violet-50 ring-violet-200'
							: 'text-blue-700 bg-blue-50 ring-blue-200'
					}`}>
						<FileText className="w-3 h-3" />
						{isSPR ? 'Service Purchase Requisition' : 'Purchase Requisition'}
					</span>
					<span className="ml-auto text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
						{fi.prNumber}
					</span>
				</div>

				{/* Project / service name */}
				<h3 className="text-sm font-bold text-gray-900 leading-snug">{item.title}</h3>

				{/* Line items */}
				<div className="rounded-xl border border-gray-100 overflow-hidden text-xs">
					<div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100">
						<span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Line Items</span>
					</div>
					<div className="divide-y divide-gray-50">
						{fi.items.map((it, idx) => (
							<div key={idx} className="px-3 py-2 flex items-start gap-2">
								<span className="text-[10px] text-gray-400 w-4 shrink-0 pt-0.5">{it.srNo}.</span>
								<div className="flex-1 min-w-0">
									<p className="font-semibold text-gray-800 leading-snug line-clamp-1">{it.name}</p>
									<p className="text-[10px] text-gray-400 mt-0.5">
										Qty: {it.qty} {it.uom}
										{it.rate != null ? ` · ₹${it.rate.toLocaleString('en-IN')}/unit` : ''}
										{it.gstAmt != null ? ` · GST ₹${it.gstAmt.toLocaleString('en-IN')}` : ''}
									</p>
								</div>
								<span className="font-bold text-gray-700 shrink-0">
									₹{it.value.toLocaleString('en-IN')}
								</span>
							</div>
						))}
					</div>
					<div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
						<span className="font-bold text-gray-600 text-[11px]">Total Cost</span>
						<span className="font-black text-gray-900 text-sm">₹{fi.total.toLocaleString('en-IN')}</span>
					</div>
				</div>

				{/* Indented by / Forwarded by */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-1.5">
						<User className="w-3 h-3 text-gray-400 shrink-0" />
						<span className="text-[10px] text-gray-400">Indented by</span>
						<span className="text-xs font-semibold text-gray-700 truncate">{fi.indentedBy || '—'}</span>
					</div>
					<div className="flex items-center gap-1.5">
						<ArrowRightFromLine className="w-3 h-3 text-gray-400 shrink-0" />
						<span className="text-[10px] text-gray-400">Forwarded by</span>
						<span className="text-xs font-semibold text-gray-700 truncate">{fi.forwardedBy || '—'}</span>
					</div>
				</div>

				{/* Date */}
				<div className="flex items-center gap-1 text-[11px] text-gray-400 border-t border-gray-50 pt-1">
					<Calendar className="w-3 h-3" />{fmtDate(item.date)}
				</div>

				{/* Actions — pending only */}
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
							className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
						>
							<Pen className="w-3.5 h-3.5" />Attach & Move Forward
						</button>
					</div>
				)}

			</div>
		</div>
	);
};

// ── Router ────────────────────────────────────────────────────────────────────
const PurchaseApprovalCard = (props: Props) => {
	if (props.item.financeIndent)   return <FinanceIndentCard {...props} />;
	if (props.item.subType === 'NFA') return <NfaCard {...props} />;
	return <IndentCard {...props} />;
};

export default PurchaseApprovalCard;
