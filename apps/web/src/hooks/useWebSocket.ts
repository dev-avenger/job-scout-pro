import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../stores/auth-store';

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: string;
}

/** Stop trying after this many consecutive failures — no console spam. */
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 2000;

/**
 * Server frames arrive as `{ channel, data: DomainEvent }` where DomainEvent
 * is `{ id, timestamp, userId, type, data }`. Unwrap so consumers always see
 * a flat `{ type, data, timestamp }` message.
 */
function normalize(raw: unknown): WebSocketMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const frame = raw as Record<string, unknown>;
  const event = (frame.data && typeof frame.data === 'object' ? frame.data : frame) as Record<
    string,
    unknown
  >;
  const type = (event.type ?? frame.type ?? frame.channel) as string | undefined;
  if (!type) return null;
  return {
    type,
    data: event.data ?? event,
    timestamp: (event.timestamp as string) ?? new Date().toISOString(),
  };
}

export function useWebSocket(onMessage?: (msg: WebSocketMessage) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const disposedRef = useRef(false);
  const token = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);

  // Keep the latest callback in a ref so its identity never re-triggers the
  // connection effect (a new closure per render previously caused a
  // connect/teardown storm and "Insufficient resources" errors).
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!token || !userId) return;
    disposedRef.current = false;
    attemptsRef.current = 0;

    const connect = () => {
      if (disposedRef.current) return;
      const existing = wsRef.current;
      if (
        existing &&
        (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
        setConnected(true);
        // The gateway routes user-scoped broadcasts only after an auth frame
        ws.send(JSON.stringify({ event: 'auth', data: { userId } }));
      };

      ws.onclose = () => {
        setConnected(false);
        if (disposedRef.current) return;
        attemptsRef.current += 1;
        if (attemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
          // Give up quietly; a page reload or re-login starts fresh.
          return;
        }
        const delay = BASE_RECONNECT_DELAY_MS * 2 ** (attemptsRef.current - 1);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const msg = normalize(JSON.parse(event.data));
          if (msg) onMessageRef.current?.(msg);
        } catch {}
      };
    };

    connect();

    return () => {
      disposedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [token, userId]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, send };
}
