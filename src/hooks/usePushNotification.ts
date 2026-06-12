import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  getExistingSubscription,
  getPermissionState,
  isPushSupported,
  removeSubscriptionFromServer,
  requestPermission,
  sendSubscriptionToServer,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/pushNotification';

export type PushState = 'unsupported' | 'denied' | 'unsubscribed' | 'subscribed' | 'loading';

export function usePushNotification() {
  const { token, user } = useAuth();
  const supported = isPushSupported();

  const [state, setState] = useState<PushState>(supported ? 'loading' : 'unsupported');

  // Resolve initial state once the service worker is ready
  useEffect(() => {
    if (!supported) return;
    const permission = getPermissionState();
    if (permission === 'denied') {
      setState('denied');
      return;
    }
    getExistingSubscription()
      .then((sub) => setState(sub ? 'subscribed' : 'unsubscribed'))
      .catch(() => setState('unsubscribed'));
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !token) return;
    setState('loading');
    try {
      const permission = await requestPermission();
      if (permission === 'denied') {
        setState('denied');
        toast.error('Notification permission was denied.');
        return;
      }
      if (permission !== 'granted') {
        setState('unsubscribed');
        return;
      }
      const sub = await subscribeToPush();
      const staffId = user?.id ?? '';
      await sendSubscriptionToServer(sub, token, staffId, staffId);
      setState('subscribed');
      toast.success('Push notifications enabled.');
    } catch (err) {
      setState('unsubscribed');
      toast.error('Failed to enable notifications. Please try again.');
      console.error('[PushNotification] subscribe error:', err);
    }
  }, [supported, token, user]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !token) return;
    setState('loading');
    try {
      const sub = await getExistingSubscription();
      if (sub) {
        await removeSubscriptionFromServer(sub, token);
        await unsubscribeFromPush();
      }
      setState('unsubscribed');
      toast.success('Push notifications disabled.');
    } catch (err) {
      // Re-derive state on error
      const current = await getExistingSubscription().catch(() => null);
      setState(current ? 'subscribed' : 'unsubscribed');
      toast.error('Failed to disable notifications. Please try again.');
      console.error('[PushNotification] unsubscribe error:', err);
    }
  }, [supported, token]);

  return { state, subscribe, unsubscribe };
}
