import { Paperclip } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { InboxRowShell } from '@/components/ho-inbox/InboxRowShell';

export type PurchaseOrderAttachmentItem = {
  id: string;
  title?: string;
  preview?: string;
  status?: 'Pending' | 'Attached';
};

type Props = {
  item: PurchaseOrderAttachmentItem;
  onAttach?: (id: string) => void;
};

export function PurchaseOrderAttachmentRow({ item, onAttach }: Props) {
  const status = item.status ?? 'Pending';

  return (
    <InboxRowShell
      icon={Paperclip}
      title={item.title || 'Purchase Order Attachment'}
      preview={item.preview}
      status={
        <div
          className={`text-xs font-semibold ${status === 'Attached' ? 'text-blue-700' : 'text-yellow-700'}`}
        >
          {status}
        </div>
      }
    >
      <div className="text-sm">
        <div className="font-medium">What’s needed</div>
        <div className="text-muted-foreground text-xs mt-1">
          Attach the PO document against this request.
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!onAttach}
            onClick={() => onAttach?.(item.id)}
          >
            Attach PO
          </Button>
        </div>
      </div>
    </InboxRowShell>
  );
}
