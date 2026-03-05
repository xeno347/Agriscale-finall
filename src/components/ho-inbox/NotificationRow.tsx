import { Bell } from 'lucide-react';

import { InboxRowShell } from '@/components/ho-inbox/InboxRowShell';

export type NotificationItem = {
  id: string;
  title: string;
  message?: string;
  status?: 'Info' | 'Action';
};

type Props = {
  item: NotificationItem;
};

export function NotificationRow({ item }: Props) {
  return (
    <InboxRowShell
      icon={Bell}
      title={item.title}
      preview={item.message}
      status={
        <div className="text-xs font-semibold text-muted-foreground">
          {item.status ?? 'Info'}
        </div>
      }
    >
      <div className="text-sm">
        <div className="font-medium">Details</div>
        <div className="text-muted-foreground text-xs mt-1">
          {item.message || '—'}
        </div>
      </div>
    </InboxRowShell>
  );
}
