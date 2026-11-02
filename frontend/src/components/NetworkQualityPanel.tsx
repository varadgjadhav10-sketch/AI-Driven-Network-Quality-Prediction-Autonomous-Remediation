import { motion } from 'framer-motion';
import type { TelemetryData } from '../types/telemetry';
import { computeQualityScore, qualityTier } from '../lib/quality';
import AnimatedMetric from './AnimatedMetric';

interface NetworkQualityPanelProps {
  latest?: TelemetryData;
}

export default function NetworkQualityPanel({ latest }: NetworkQualityPanelProps) {
  const score = computeQualityScore(latest);
  const tier = qualityTier(score);
  const forecast = latest?.qos?.mu ?? 0;
  const current = latest?.metrics?.duration ?? 0;
  const delta = forecast - current;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-slate-700 bg-[linear-gradient(120deg,rgba(14,116,144,0.2),rgba(8,47,73,0.14),rgba(15,23,42,0.9))] p-5"
    >
      <div className="grid items-center gap-5 md:grid-cols-[220px_1fr]">
        <div className="mx-auto h-44 w-44 rounded-full border border-slate-700 bg-slate-950/70 p-3">
          <div
            className="grid h-full place-items-center rounded-full"
            style={{
              background: `conic-gradient(#22d3ee ${score * 3.6}deg, rgba(30,41,59,0.8) 0deg)`,
            }}
          >
            <div className="grid h-[82%] w-[82%] place-items-center rounded-full bg-slate-950 text-center">
              <p className="text-4xl font-semibold text-slate-50">
                <AnimatedMetric value={score} decimals={0} />
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Quality</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Network Quality Prediction</p>
          <h2 className="text-2xl font-semibold text-slate-50">SLA Risk Radar</h2>
          <p className="text-sm text-slate-300">
            Quality tier: <span className="font-semibold text-cyan-200">{tier}</span> · Forecast delta:{' '}
            <span className={delta > 0 ? 'text-amber-300' : 'text-emerald-300'}>
              <AnimatedMetric value={delta} decimals={2} suffix=" ms" />
            </span>
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-xs text-slate-400">Current Latency</p>
              <p className="text-lg font-semibold text-slate-100">
                <AnimatedMetric value={current} decimals={2} suffix=" ms" />
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-xs text-slate-400">Predicted Latency</p>
              <p className="text-lg font-semibold text-slate-100">
                <AnimatedMetric value={forecast} decimals={2} suffix=" ms" />
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-xs text-slate-400">DDoS Pressure</p>
              <p className="text-lg font-semibold text-slate-100">
                <AnimatedMetric value={(latest?.ddos?.probability ?? 0) * 100} decimals={1} suffix="%" />
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
