import { useEffect, useRef, useState } from 'react';
import { getBaseUrl } from '@/lib/config';

type LocationTracingMessage = {
  event?: unknown;
  staff_id?: unknown;
  total_points?: unknown;
  unique_points?: unknown;
  tracer_data?: unknown;
};

type LocationTracingState = {
  connected: boolean;
  tracerData: number[][];
  totalPoints: number;
  uniquePoints: number;
  error?: string;
};

const RECONNECT_LIMIT = 5;
const DEBOUNCE_MS = 100;

const normalizePair = (value: unknown): [number, number] | null => {
  if (!Array.isArray(value) || value.length < 2) return null;

  const lat = Number(value[0]);
  const long = Number(value[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(long)) return null;
  return [lat, long];
};

const normalizeTracerData = (value: unknown): number[][] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const pair = normalizePair(entry);
      return pair ? [pair[0], pair[1]] : null;
    })
    .filter((entry): entry is number[] => Array.isArray(entry) && entry.length === 2);
};

const buildWsUrl = () => {
  const baseUrl = String(getBaseUrl() || '').trim();

  if (!baseUrl) return 'ws://localhost/ws/location_tracing';

  try {
    const parsed = new URL(baseUrl);
    const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = parsed.host; // hostname[:port]
    // Preserve any base pathname (e.g. /api) and join with websocket path.
    const basePath = (parsed.pathname || '').replace(/\/$/, '');
    const prefix = basePath === '/' || basePath === '' ? '' : basePath;
    return `${protocol}//${host}${prefix}/ws/location_tracing`;
  } catch (e) {
    // Fallback: best-effort string manipulation
    const protocol = baseUrl.startsWith('https://') ? 'wss:' : 'ws:';
    const host = baseUrl.replace(/^https?:\/\//, '').split('/')[0];
    const maybePath = (baseUrl.replace(/^https?:\/\//, '').split('/').slice(1).join('/') || '').replace(/\/$/, '');
    const prefix = maybePath ? `/${maybePath}` : '';
    return `${protocol}//${host}${prefix}/ws/location_tracing`;
  }
};

export function useLocationTracing(staffId: string, enabled: boolean): LocationTracingState {
  const [connected, setConnected] = useState(false);
  const [tracerData, setTracerData] = useState<number[][]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [uniquePoints, setUniquePoints] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const stoppedRef = useRef(false);
  const activeStaffIdRef = useRef(staffId);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    activeStaffIdRef.current = staffId;
  }, [staffId]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !staffId.trim()) {
      stoppedRef.current = true;

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      try {
        const ws = socketRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'unsubscribe', staff_id: staffId }));
        }
        ws?.close();
      } catch {
        // ignore close errors on cleanup
      } finally {
        socketRef.current = null;
        setConnected(false);
      }

      return;
    }

    stoppedRef.current = false;
    setError(undefined);

    const scheduleReconnect = () => {
      if (stoppedRef.current || !enabledRef.current || !activeStaffIdRef.current.trim()) {
        return;
      }

      if (reconnectAttemptsRef.current >= RECONNECT_LIMIT) {
        setConnected(false);
        setError('Unable to keep the live tracing connection open.');
        return;
      }

      reconnectAttemptsRef.current += 1;
      const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttemptsRef.current - 1));

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    const connect = () => {
      const wsUrl = buildWsUrl();

      try {
        socketRef.current = new WebSocket(wsUrl);
      } catch (socketError) {
        console.error('useLocationTracing: failed to open socket', socketError);
        scheduleReconnect();
        return;
      }

      const ws = socketRef.current;
      if (!ws) return;

      ws.onopen = () => {
        if (stoppedRef.current) return;

        reconnectAttemptsRef.current = 0;
        setConnected(true);
        setError(undefined);

        try {
          ws.send(JSON.stringify({ action: 'subscribe', staff_id: activeStaffIdRef.current }));
        } catch (sendError) {
          console.error('useLocationTracing: failed to send subscribe', sendError);
          setError('Unable to subscribe to live tracing.');
        }
      };

      ws.onmessage = (event) => {
        let parsed: LocationTracingMessage | null = null;

        try {
          parsed = JSON.parse(String(event.data || '')) as LocationTracingMessage;
        } catch (parseError) {
          console.warn('useLocationTracing: JSON parse error', parseError);
          setError('Received an invalid live tracing message.');
          return;
        }

        if (!parsed || parsed.event !== 'LOCATION_TRACING_UPDATED') return;
        if (String(parsed.staff_id ?? '') !== activeStaffIdRef.current) return;

        const nextTracerData = normalizeTracerData(parsed.tracer_data);
        const nextTotalPoints = Number(parsed.total_points);
        const nextUniquePoints = Number(parsed.unique_points);
        const uniqueCount = Number.isFinite(nextUniquePoints)
          ? nextUniquePoints
          : new Set(nextTracerData.map((point) => `${point[0]}:${point[1]}`)).size;

        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = window.setTimeout(() => {
          if (stoppedRef.current) return;

          setTracerData(nextTracerData);
          setTotalPoints(Number.isFinite(nextTotalPoints) ? nextTotalPoints : nextTracerData.length);
          setUniquePoints(uniqueCount);
          setError(undefined);
        }, DEBOUNCE_MS);
      };

      ws.onerror = () => {
        if (!stoppedRef.current) {
          setError('Live tracing connection error.');
        }
      };

      ws.onclose = () => {
        setConnected(false);

        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }

        if (!stoppedRef.current && enabledRef.current && activeStaffIdRef.current.trim()) {
          scheduleReconnect();
        }
      };
    };

    connect();

    return () => {
      stoppedRef.current = true;

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      try {
        const ws = socketRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'unsubscribe', staff_id: activeStaffIdRef.current }));
        }
        ws?.close();
      } catch {
        // ignore cleanup errors
      } finally {
        socketRef.current = null;
        setConnected(false);
      }
    };
  }, [enabled, staffId]);

  return {
    connected,
    tracerData,
    totalPoints,
    uniquePoints,
    error,
  };
}