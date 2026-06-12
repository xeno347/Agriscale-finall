import type { Approval, LandDetails } from './WebApp';
import CategoryPage from './CategoryPage';
import LandApprovalCard from './LandApprovalCard';

interface Props {
	approvals: Approval[];
	onApprove: (id: string) => void;
	onReject:  (id: string) => void;
}

const config = {
	category: 'lands' as const,
	subTypes: ['Lease Farming', 'Contract Farming'],
};

const LandsPage = (props: Props) => (
	<CategoryPage
		config={config}
		{...props}
		renderCard={(item, onApprove, onReject) => (
			<LandApprovalCard
				item={item as Approval & { landDetails: LandDetails }}
				onApprove={onApprove}
				onReject={onReject}
			/>
		)}
	/>
);

export default LandsPage;
