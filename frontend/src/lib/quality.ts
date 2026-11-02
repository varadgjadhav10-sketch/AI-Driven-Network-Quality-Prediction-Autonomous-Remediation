import type { TelemetryData } from '../types/telemetry';

export function computeQualityScore(sample?: TelemetryData): number {
  if (!sample) {
    return 0;
  }

  const duration = sample.metrics?.duration ?? 0;
  const saturation = sample.metrics?.saturation ?? 0;
  const errors = sample.metrics?.errors ?? 0;
  const ddos = sample.ddos?.probability ?? 0;

  const score =
    100 -
    Math.min(duration / 2.2, 32) -
    Math.min(saturation * 0.42, 28) -
    Math.min(errors * 18, 25) -
    Math.min(ddos * 34, 34);

  return Math.max(0, Math.min(100, score));
}

export function qualityTier(score: number): 'Excellent' | 'Good' | 'Warning' | 'Critical' {
  if (score >= 82) {
    return 'Excellent';
  }
  if (score >= 66) {
    return 'Good';
  }
  if (score >= 45) {
    return 'Warning';
  }
  return 'Critical';
}
