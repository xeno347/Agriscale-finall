import { getBaseUrl } from './config';

// VAPID public key must be set via VITE_VAPID_PUBLIC_KEY env variable.
const VAPID_PUBLIC_KEY = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPermissionState(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  return Notification.requestPermission();
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<PushSubscription> {
  if (!VAPID_PUBLIC_KEY) throw new Error('VITE_VAPID_PUBLIC_KEY is not set');
  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const sub = await getExistingSubscription();
  if (!sub) return false;
  return sub.unsubscribe();
}

export async function sendSubscriptionToServer(
  subscription: PushSubscription,
  token: string,
  userId: string,
  staffId: string,
): Promise<void> {
  const base = getBaseUrl().replace(/\/$/, '');
  const res = await fetch(`${base}/admin_staff/update_notification_subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: userId,
      staff_id: staffId,
      notification_subscription: subscription.toJSON(),
    }),
  });
  if (!res.ok) throw new Error(`Subscribe failed: HTTP ${res.status}`);
}

export async function removeSubscriptionFromServer(
  subscription: PushSubscription,
  token: string,
): Promise<void> {
  const base = getBaseUrl().replace(/\/$/, '');
  await fetch(`${base}/notifications/unsubscribe`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
}
