import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  collapsed?: boolean;
}

export default function NotificationBell({ collapsed = false }: NotificationBellProps) {
  const { state, subscribe, unsubscribe } = usePushNotification();

  if (state === 'unsupported') return null;

  const isLoading = state === 'loading';
  const isSubscribed = state === 'subscribed';
  const isDenied = state === 'denied';

  const label = isDenied
    ? 'Notifications blocked'
    : isSubscribed
    ? 'Notifications on — click to disable'
    : 'Enable notifications';

  const handleClick = () => {
    if (isLoading || isDenied) return;
    if (isSubscribed) unsubscribe();
    else subscribe();
  };

  const Icon = isLoading
    ? Loader2
    : isDenied
    ? BellOff
    : isSubscribed
    ? BellRing
    : Bell;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading || isDenied}
      title={label}
      aria-label={label}
      className={cn(
        'flex items-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors',
        'hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50',
        collapsed
          ? 'h-10 w-10 justify-center p-0'
          : 'gap-2 px-3 py-2 text-sm font-medium',
        isSubscribed && !isLoading && 'border-green-200 text-green-600 hover:text-green-700 hover:bg-green-50',
        isDenied && 'border-red-100 text-red-400',
      )}
    >
      <Icon
        className={cn(
          collapsed ? 'h-5 w-5' : 'h-4 w-4',
          isLoading && 'animate-spin',
        )}
      />
      {!collapsed && (
        <span>
          {isDenied ? 'Blocked' : isSubscribed ? 'Notifications on' : 'Notifications'}
        </span>
      )}
    </button>
  );
}
