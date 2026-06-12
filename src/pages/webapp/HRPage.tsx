import type { Approval } from './WebApp';
import CategoryPage from './CategoryPage';

interface Props {
	approvals: Approval[];
	onApprove: (id: string) => void;
	onReject:  (id: string) => void;
}

const config = {
	category: 'hr' as const,
	subTypes: ['Manpower Requisition', 'Contract Renewal', 'Salary Revision', 'Staff Onboarding'],
};

const HRPage = (props: Props) => <CategoryPage config={config} {...props} />;

export default HRPage;
