import { motion } from 'framer-motion';
import { BarChart3, BrainCircuit, GitBranch } from 'lucide-react';
import { useTelemetry } from '../providers/TelemetryProvider';
import { computeQualityScore } from '../lib/quality';

const models = [
  {
    name: 'BR-LSTM',
    title: 'QoS Latency Prediction Engine',
    purpose: 'Forecast near-future latency and confidence to protect network quality objectives.',
    input: 'Time windows of duration, jitter proxy, loss proxy.',
    output: 'mu, sigma (latency distribution).',
    icon: BarChart3,
    contribution: 'Primary quality forecaster',
  },
  {
    name: 'CNN-BiLSTM',
    title: 'Anomaly and DDoS Pressure Detector',
    purpose: 'Detect burst anomalies that can collapse latency and throughput stability.',
    input: 'Flow sequence features + matrix-encoded traffic signatures.',
    output: 'DDoS probability (0..1).',
    icon: BrainCircuit,
    contribution: 'Quality risk amplifier',
  },
  {
    name: 'GNN',
    title: 'Root Cause Graph Inference',
    purpose: 'Map probable degradation source across topology neighborhoods.',
    input: 'Node state vectors and graph context.',
    output: 'Root-cause node + confidence.',
    icon: GitBranch,
    contribution: 'Repair targeting intelligence',
  },
];

export default function ModelsPage() {
  const { data } = useTelemetry();
  const latest = data[data.length - 1];
  const qualityScore = computeQualityScore(latest);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cyan-400/25 bg-[linear-gradient(140deg,rgba(14,116,144,0.24),rgba(2,6,23,0.92))] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Model Intelligence Layer</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-50">Network Quality Prediction Stack</h2>
        <p className="mt-2 max-w-3xl text-slate-300">
          These models are orchestrated to forecast quality, identify quality threats, and localize remediation targets.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-100">
          Live quality score: {qualityScore.toFixed(0)} / 100
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
        <h3 className="text-lg font-semibold text-slate-100">Quality Decision Equation</h3>
        <pre className="mt-3 overflow-auto rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-slate-300">
{`Quality Index = f(
  BR-LSTM predicted latency,
  CNN-BiLSTM anomaly pressure,
  link saturation + error profile,
  GNN root-cause confidence
)`}
        </pre>
      </section>

      <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Operational Highlights</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
            <p className="text-amber-200">CN Contribution</p>
            <p className="mt-1 text-slate-300">Early warning for QoS degradation from Layer 3/4 telemetry.</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
            <p className="text-amber-200">ML Contribution</p>
            <p className="mt-1 text-slate-300">Forecast + anomaly confidence, not threshold-only monitoring.</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
            <p className="text-amber-200">Systems Contribution</p>
            <p className="mt-1 text-slate-300">Closed-loop remediation with auditable RESTCONF actions.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {models.map((model, index) => {
          const Icon = model.icon;
          return (
            <motion.article
              key={model.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-100">{model.name}</p>
                <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">
                  {model.contribution}
                </span>
              </div>

              <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <Icon className="mb-2 h-5 w-5 text-cyan-300" />
                <p className="text-sm text-slate-200">{model.title}</p>
                <p className="mt-2 text-sm text-slate-400">{model.purpose}</p>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-slate-200"><span className="text-slate-400">Input:</span> {model.input}</p>
                <p className="text-slate-200"><span className="text-slate-400">Output:</span> {model.output}</p>
              </div>

              <div className="mt-5 flex items-end gap-1">
                {[18, 32, 26, 49, 43, 57, 65].map((h, idx) => (
                  <motion.div
                    key={`${model.name}-${h}`}
                    initial={{ height: 8 }}
                    animate={{ height: h }}
                    transition={{ delay: idx * 0.04, duration: 0.4 }}
                    className="w-2 rounded-sm bg-gradient-to-t from-cyan-500/30 to-cyan-300"
                  />
                ))}
              </div>
            </motion.article>
          );
        })}
      </section>
    </div>
  );
}
