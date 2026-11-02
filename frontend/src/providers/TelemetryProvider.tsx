import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import type { TelemetryContextValue, TelemetryData } from '../types/telemetry';

const DEFAULT_WS_URL =
  import.meta.env.VITE_TELEMETRY_WS_URL ?? 'ws://localhost:8000/ws/telemetry';

const TelemetryContext = createContext<TelemetryContextValue | undefined>(undefined);

const MAX_POINTS = 300;
const RECONNECT_DELAY_MS = 2000;

export function TelemetryProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<TelemetryData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!isMounted) {
        return;
      }

      const socket = new WebSocket(DEFAULT_WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isMounted) {
          return;
        }
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        if (!isMounted) {
          return;
        }

        try {
          const message = JSON.parse(event.data) as TelemetryData;
          const nowSec = Date.now() / 1000;
          const rawTs = Number(message.timestamp);
          const normalizedTs =
            Number.isFinite(rawTs) && Math.abs(nowSec - rawTs) < 600 ? rawTs : nowSec;

          const normalizedMessage: TelemetryData = {
            ...message,
            timestamp: normalizedTs,
          };

          setLastMessageAt(Date.now());
          setData((prev) => [...prev.slice(-(MAX_POINTS - 1)), normalizedMessage]);
        } catch {
          // ignore malformed websocket payloads
        }
      };

      socket.onclose = () => {
        if (!isMounted) {
          return;
        }
        setIsConnected(false);
        reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, []);

  const alertsCount = useMemo(
    () => data.filter((d) => (d.ddos?.probability ?? 0) >= 0.9).length,
    [data],
  );

  const value = useMemo<TelemetryContextValue>(
    () => ({ data, isConnected, lastMessageAt, alertsCount, socketUrl: DEFAULT_WS_URL }),
    [alertsCount, data, isConnected, lastMessageAt],
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within TelemetryProvider');
  }
  return context;
}
