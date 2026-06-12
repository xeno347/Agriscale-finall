import type { Approval } from './WebApp';
import CategoryPage from './CategoryPage';
import PurchaseApprovalCard from './PurchaseApprovalCard';

interface Props {
	approvals: Approval[];
	onApprove: (id: string) => void;
	onReject:  (id: string) => void;
}

const config = {
	category: 'purchase' as const,
	subTypes: ['Purchase Requisition', 'Service Purchase Requisition'],
};

const PurchasePage = (props: Props) => (
	<CategoryPage
		config={config}
		{...props}
		renderCard={(item, onApprove, onReject) => (
			<PurchaseApprovalCard item={item} onApprove={onApprove} onReject={onReject} />
		)}
	/>
);

export default PurchasePage;
