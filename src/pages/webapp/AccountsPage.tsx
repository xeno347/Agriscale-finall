import type { Approval } from './WebApp';
import CategoryPage from './CategoryPage';

interface Props {
	approvals: Approval[];
	onApprove: (id: string) => void;
	onReject:  (id: string) => void;
}

const config = {
	category: 'accounts' as const,
	subTypes: ['Fuel Request', 'Payment Release', 'Expense Claim', 'Budget Approval'],
};

const AccountsPage = (props: Props) => <CategoryPage config={config} {...props} />;

export default AccountsPage;
