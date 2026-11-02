import { motion } from 'framer-motion';
import { ArrowRight, Cable, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTelemetry } from '../providers/TelemetryProvider';
import { computeQualityScore, qualityTier } from '../lib/quality';

const features = [
  {
    title: 'Network Quality Forecasting',
    desc: 'BR-LSTM predicts latency drift and confidence bands before SLA violations are visible in raw telemetry.',
    icon: Sparkles,
  },
  {
    title: 'Realtime Telemetry Intelligence',
    desc: 'Digital Twin packet streams are transformed into live QoS features across flow-rate, utilization, and error surfaces.',
    icon: Cable,
  },
  {
    title: 'Autonomous Self-Healing',
    desc: 'High-confidence threat signatures trigger RESTCONF remediation with policy-safe closed-loop execution.',
    icon: ShieldCheck,
  },
];

const architecturePhases = [
  {
    title: 'Capture + Twin Fabric',
    detail: 'Scapy extracts packet_count, byte_count, tcp_flags, duration from spine-leaf digital twin.',
  },
  {
    title: 'Stream + Feature Layer',
    detail: 'Kafka transport feeds FastAPI feature windows (rate, saturation, jitter-proxy, loss-proxy).',
  },
  {
    title: 'Quality Prediction Core',
    detail: 'BR-LSTM predicts latency(mu/sigma), CNN-BiLSTM scores DDoS probability, GNN maps probable root-cause node.',
  },
  {
    title: 'Policy Execution',
    detail: 'RESTCONF interfaces or routing policy updates are executed when risk score breaches threshold.',
  },
];

export default function LandingPage() {
  const { data } = useTelemetry();
  const latest = data[data.length - 1];
  const score = computeQualityScore(latest);
  const tier = qualityTier(score);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_20%_8%,_#193e72_0%,_#07172d_40%,_#01050f_100%)] text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <motion.div
          className="absolute left-[8%] top-[18%] h-56 w-56 rounded-full bg-cyan-500/25 blur-3xl"
          animate={{ x: [0, 20, -10, 0], y: [0, -10, 15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-[10%] top-[24%] h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"
          animate={{ x: [0, -25, 10, 0], y: [0, 15, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-8">
        <header className="mb-14 flex items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-950/45 px-5 py-3 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/75">Computer Networks Course Project</p>
            <h1 className="text-xl font-semibold text-cyan-50">Realtime Network Quality Prediction using ML</h1>
          </div>
          <Link
            to="/app/dashboard"
            className="ui-btn ui-btn-secondary rounded-full px-4 py-2 text-sm"
          >
            Open Platform
          </Link>
        </header>

        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="max-w-3xl text-5xl font-semibold leading-tight text-slate-50 md:text-6xl">
              Predict network quality before it fails, then remediate in real time.
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">
              Built as a CN-first system where packet telemetry, ML inference, and policy-safe control actions run as one
              closed loop across Layer 3 and Layer 4 behaviors.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/app/dashboard"
                className="ui-btn ui-btn-primary px-5 py-3"
              >
                Live Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#architecture"
                className="ui-btn ui-btn-ghost px-5 py-3"
              >
                View Prediction Architecture
              </a>
              <Link
                to="/app/lab"
                className="ui-btn ui-btn-secondary border-indigo-400/40 bg-indigo-500/15 px-5 py-3 text-indigo-100"
              >
                Open Network Lab
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="panel-elevated rounded-3xl border border-slate-700/80 bg-slate-900/60 p-6 shadow-[0_0_80px_-30px_rgba(34,211,238,0.6)]"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Live Quality Snapshot</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-slate-700 bg-slate-950/75 p-4">
                <p className="text-xs text-slate-400">Current Latency</p>
                <p className="text-2xl font-semibold text-slate-100">{(latest?.metrics?.duration ?? 0).toFixed(2)} ms</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/75 p-4">
                <p className="text-xs text-slate-400">Predicted Latency (BR-LSTM)</p>
                <p className="text-2xl font-semibold text-slate-100">{(latest?.qos?.mu ?? 0).toFixed(2)} ms</p>
              </div>
              <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-4">
                <p className="text-xs uppercase tracking-widest text-cyan-200">Network Quality Score</p>
                <div className="mt-1 flex items-end justify-between">
                  <p className="text-3xl font-semibold text-cyan-100">{score.toFixed(0)}</p>
                  <p className="text-sm text-cyan-200">{tier}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + index * 0.06 }}
                className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5"
              >
                <div className="mb-3 inline-flex rounded-xl bg-cyan-500/10 p-2">
                  <Icon className="h-5 w-5 text-cyan-300" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{feature.desc}</p>
              </motion.article>
            );
          })}
        </section>

        <section id="architecture" className="mt-14 rounded-3xl border border-slate-700 bg-slate-900/60 p-7">
          <h3 className="text-2xl font-semibold">Quality Prediction Architecture Preview</h3>
          <p className="mt-2 max-w-3xl text-slate-400">
            This control path is optimized for one mission: keeping network quality inside SLA bands using predictive
            intelligence and autonomous action.
          </p>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              {architecturePhases.map((phase, idx) => (
                <motion.article
                  key={phase.title}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: idx * 0.06 }}
                  className="relative rounded-2xl border border-slate-700 bg-slate-950/70 p-4"
                >
                  <p className="text-sm font-semibold text-cyan-200">{phase.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{phase.detail}</p>
                  {idx < architecturePhases.length - 1 ? (
                    <motion.div
                      className="absolute -bottom-3 left-6 h-5 w-[2px] bg-cyan-400/70"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    />
                  ) : null}
                </motion.article>
              ))}
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/75 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Feature Contract</p>
                <pre className="mt-2 overflow-auto text-xs text-slate-300">
{`{
  "packet_count": 482,
  "byte_count": 218440,
  "duration": 2.14,
  "rate": 225.23,
  "utilization": 0.82,
  "saturation": 22.5
}`}
                </pre>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/75 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Prediction Contract</p>
                <pre className="mt-2 overflow-auto text-xs text-slate-300">
{`{
  "predicted_latency": ${(latest?.qos?.mu ?? 0).toFixed(2)},
  "sigma": ${(latest?.qos?.sigma ?? 0).toFixed(2)},
  "ddos_probability": ${((latest?.ddos?.probability ?? 0) * 100).toFixed(1)}%
}`}
                </pre>
              </div>
              <div className="rounded-2xl border border-cyan-400/35 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                SLO policy: trigger remediation if forecast latency rises with anomaly risk and quality score falls below
                safety guardrails.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ['Prediction Horizon', '10-step sliding window'],
            ['Inference Cadence', 'Live event-by-event'],
            ['Control Action', 'RESTCONF closed loop'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-700 bg-slate-900/55 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Control Loop Workflow</p>
          <div className="mt-3 grid gap-3 text-sm text-slate-200 md:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="font-semibold text-emerald-200">1) Observe</p>
              <p className="mt-1 text-slate-300">Stream packet-rate, utilization, and error signals from the digital twin.</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="font-semibold text-emerald-200">2) Predict</p>
              <p className="mt-1 text-slate-300">Use BR-LSTM + CNN-BiLSTM to forecast QoS drift and anomaly pressure.</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="font-semibold text-emerald-200">3) Act</p>
              <p className="mt-1 text-slate-300">Execute guarded RESTCONF actions and show post-action stabilization.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
