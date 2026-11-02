import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { TelemetryData } from '../types/telemetry';

const stages = [
  { title: 'Digital Twin', subtitle: 'Containerlab + Scapy packets' },
  { title: 'Kafka Stream', subtitle: 'Topic: network-telemetry-flows' },
  { title: 'AI Inference', subtitle: 'BR-LSTM + CNN-BiLSTM + GNN' },
  { title: 'Remediation', subtitle: 'RESTCONF actions to SR Linux' },
  { title: 'Frontend UI', subtitle: 'WebSocket streaming dashboards' },
];

interface BackendFlowVisualizerProps {
  data: TelemetryData[];
}

export default function BackendFlowVisualizer({ data }: BackendFlowVisualizerProps) {
  const [tick, setTick] = useState(0);

  const latest = data[data.length - 1];
  const latestTsMs = latest ? latest.timestamp * 1000 : 0;
  const isLive = latestTsMs > 0 && Date.now() - latestTsMs < 9000;

  useEffect(() => {
    const cadence = isLive ? 650 : 1350;
    const id = window.setInterval(() => setTick((prev) => prev + 1), cadence);
    return () => window.clearInterval(id);
  }, [isLive]);

  const activeStageIndex = useMemo(() => {
    const ddosHigh = (latest?.ddos?.probability ?? 0) >= 0.9;
    const chain = ddosHigh ? [0, 1, 2, 3, 4] : [0, 1, 2, 4];
    return chain[tick % chain.length] ?? 0;
  }, [latest?.ddos?.probability, tick]);

  const flowRate = latest?.metrics?.rate ?? 0;
  const anomaly = (latest?.ddos?.probability ?? 0) * 100;

  return (
    <div className="panel-elevated rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Backend Activity Stream</h3>
        <div className="text-xs text-slate-400">
          event #{data.length} · rate {flowRate.toFixed(1)} pkt/s · anomaly {anomaly.toFixed(1)}%
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/70 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {stages.map((stage, idx) => {
            const isActive = idx === activeStageIndex;
            return (
              <motion.article
                key={stage.title}
                animate={{
                  borderColor: isActive ? 'rgba(34,211,238,0.55)' : 'rgba(51,65,85,0.8)',
                  boxShadow: isActive
                    ? '0 0 0 1px rgba(34,211,238,0.20), 0 0 28px -16px rgba(34,211,238,0.9)'
                    : '0 0 0 0 rgba(0,0,0,0)',
                }}
                transition={{ duration: 0.28 }}
                className="rounded-xl border bg-slate-900/75 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-100">{stage.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                      isActive ? 'bg-cyan-500/20 text-cyan-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isActive ? 'active' : 'idle'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{stage.subtitle}</p>
              </motion.article>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center px-3 xl:flex">
          <motion.div
            initial={false}
            animate={{ left: `${activeStageIndex * 20 + 10}%` }}
            transition={{ duration: isLive ? 0.45 : 0.8, ease: 'easeOut' }}
            className="absolute h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_16px_#67e8f9]"
          />
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            key={tick}
            initial={{ x: '-30%' }}
            animate={{ x: '110%' }}
            transition={{ duration: isLive ? 1.2 : 2.2, ease: 'linear' }}
            className="h-full w-[28%] rounded-full bg-gradient-to-r from-cyan-400/0 via-cyan-300 to-indigo-400/0"
          />
        </div>
      </div>
    </div>
  );
}
