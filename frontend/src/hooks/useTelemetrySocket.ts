import { useTelemetry } from '../providers/TelemetryProvider';
import type { TelemetryData } from '../types/telemetry';

export type { TelemetryData };

export const useTelemetrySocket = (_url?: string) => {
  const telemetry = useTelemetry();
  return { data: telemetry.data, isConnected: telemetry.isConnected };
};
