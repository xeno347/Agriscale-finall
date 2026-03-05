import { useState } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type InboxRowShellProps = {
  title: string;
  preview?: string;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  icon?: LucideIcon;
  rightActions?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function InboxRowShell({
  title,
  preview,
  meta,
  status,
  icon: Icon,
  rightActions,
  children,
  defaultOpen = false,
}: InboxRowShellProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="group flex-1 text-left rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start gap-3">
                {Icon ? (
                  <div className="mt-0.5 h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                ) : null}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{title}</div>
                    {status ? <div className="shrink-0">{status}</div> : null}
                  </div>

                  {preview ? (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {preview}
                    </div>
                  ) : null}

                  {meta ? (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {meta}
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
          </CollapsibleTrigger>

          <div className="shrink-0 flex items-center gap-2">
            {rightActions}
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={open ? 'Collapse' : 'Expand'}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="mt-3">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
