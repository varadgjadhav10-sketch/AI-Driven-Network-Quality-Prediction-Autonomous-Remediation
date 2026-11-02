export interface TelemetryData {
  flow_id: string;
  timestamp: number;
  reason?: string;
  qos?: {
    mu: number;
    sigma: number;
  };
  ddos?: {
    probability: number;
  };
  rca?: {
    root_cause_node: string;
    confidence: number;
  };
  metrics?: {
    rate: number;
    errors: number;
    duration: number;
    utilization: number;
    saturation: number;
  };
  predictions?: {
    predicted_latency?: number;
    predicted_sigma?: number;
    ddos_probability?: number;
  };
  ai?: {
    predicted_latency?: number;
    ddos_probability?: number;
  };
}

export interface TelemetryContextValue {
  data: TelemetryData[];
  isConnected: boolean;
  lastMessageAt: number | null;
  alertsCount: number;
  socketUrl: string;
}
