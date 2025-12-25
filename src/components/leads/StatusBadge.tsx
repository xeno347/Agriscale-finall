import { cn } from '@/lib/utils';
import { LeadStatus } from '@/types/farm';

interface StatusBadgeProps {
  status: LeadStatus;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  contacted: {
    label: 'Contacted',
    className: 'bg-info/10 text-info border-info/20',
  },
  verified: {
    label: 'Verified',
    className: 'bg-success/10 text-success border-success/20',
  },
  registered: {
    label: 'Registered',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status] || {
    label: String(status) || 'Unknown',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        config.className
      )}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
