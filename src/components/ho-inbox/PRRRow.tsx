import { ReceiptIndianRupee } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { InboxRowShell } from '@/components/ho-inbox/InboxRowShell';

export type PRRItem = {
  id: string;
  title?: string;
  preview?: string;
  status?: 'Pending' | 'Verified';
};

type Props = {
  item: PRRItem;
  onOpen?: (id: string) => void;
};

export function PRRRow({ item, onOpen }: Props) {
  const status = item.status ?? 'Pending';

  return (
    <InboxRowShell
      icon={ReceiptIndianRupee}
      title={item.title || 'PRR (Payment Request Receipt)'}
      preview={item.preview}
      status={
        <div
          className={`text-xs font-semibold ${status === 'Verified' ? 'text-blue-700' : 'text-yellow-700'}`}
        >
          {status}
        </div>
      }
      rightActions={
        <Button
          type="button"
          variant="outline"
          disabled={!onOpen}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpen?.(item.id);
          }}
        >
          Open
        </Button>
      }
    >
      <div className="text-sm">
        <div className="font-medium">What’s needed</div>
        <div className="text-muted-foreground text-xs mt-1">
          Verify the receipt and confirm payment request details.
        </div>
      </div>
    </InboxRowShell>
  );
}
