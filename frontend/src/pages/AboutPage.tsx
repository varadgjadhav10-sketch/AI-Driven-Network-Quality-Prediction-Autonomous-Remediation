import { motion } from 'framer-motion';
import { BrainCircuit, Cable, Container, Cpu, Network, Shield } from 'lucide-react';

const sections = [
  {
    title: 'Spine-Leaf Digital Twin',
    desc: 'Containerlab and Mininet emulate SR Linux fabric behavior for reproducible attack/failure replay in a safe environment.',
    icon: Container,
  },
  {
    title: 'Packet Capture Layer',
    desc: 'Scapy agents parse TCP/IP packet streams, derive flow keys, and export packet_count, byte_count, flags, and duration.',
    icon: Cable,
  },
  {
    title: 'Kafka Streaming Pipeline',
    desc: 'Kafka topic transport decouples edge capture and inference services, providing low-latency fanout and replayable telemetry.',
    icon: Network,
  },
  {
    title: 'AI Processing Layer',
    desc: 'BR-LSTM predicts latency, CNN-BiLSTM estimates DDoS probability, and GNN infers graph-level root-cause candidates.',
    icon: BrainCircuit,
  },
  {
    title: 'Autonomous Remediation',
    desc: 'RESTCONF policies are executed when threat scores exceed guardrails, enabling interface shutdown or routing adjustment.',
    icon: Shield,
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[linear-gradient(120deg,rgba(14,165,233,0.20),rgba(8,47,73,0.35),rgba(15,23,42,0.95))] p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-100/70">System Documentation</p>
        <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-slate-50">
          AI-driven telemetry and autonomous network remediation architecture.
        </h2>
        <p className="mt-4 max-w-3xl text-slate-200/85">
          Technical walkthrough of the data path from packet capture to closed-loop mitigation.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-700 bg-slate-900/60 p-6">
        <div className="mb-6 flex items-center gap-3">
          <Cpu className="h-5 w-5 text-cyan-300" />
          <h3 className="text-2xl font-semibold">Architecture Stack</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="rounded-2xl border border-slate-700 bg-slate-950/60 p-5"
              >
                <div className="mb-3 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-2">
                  <Icon className="h-4 w-4 text-cyan-200" />
                </div>
                <h4 className="text-lg font-medium text-slate-100">{item.title}</h4>
                <p className="mt-2 text-sm text-slate-400">{item.desc}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-700 bg-slate-900/60 p-6">
        <h3 className="text-2xl font-semibold">End-to-End Data Path</h3>
        <p className="mt-1 text-slate-400">Digital Twin → Scapy → Kafka → FastAPI + PyTorch → WebSocket + RESTCONF</p>
        <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-5">
          <p className="text-sm text-slate-300">
            The platform processes streaming telemetry in real time, appends AI predictions, emits dashboard updates, and
            executes remediation calls under high-confidence anomaly conditions without interrupting service availability.
          </p>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th className="px-4 py-3">Layer</th>
                <th className="px-4 py-3">Primary Data</th>
                <th className="px-4 py-3">Quality Objective</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-3 text-slate-200">Capture</td>
                <td className="px-4 py-3 text-slate-400">packet_count, byte_count, tcp_flags, duration</td>
                <td className="px-4 py-3 text-slate-300">Reliable flow observability</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-3 text-slate-200">Prediction</td>
                <td className="px-4 py-3 text-slate-400">mu, sigma, ddos_probability</td>
                <td className="px-4 py-3 text-slate-300">Early quality degradation warning</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="px-4 py-3 text-slate-200">Control</td>
                <td className="px-4 py-3 text-slate-400">RESTCONF patch payloads</td>
                <td className="px-4 py-3 text-slate-300">Protect SLA and network health</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6">
        <h3 className="text-2xl font-semibold text-emerald-100">Incident Response Sequence</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Step 1', 'Start with baseline healthy quality score and normal telemetry trends.'],
            ['Step 2', 'Inject spike event and show rising ddos_probability + latency forecast drift.'],
            ['Step 3', 'Open alerts and lab views to show CN evidence (packet traces, topology, CLI context).'],
            ['Step 4', 'Trigger remediation intent and confirm quality stabilization trend.'],
          ].map(([step, text]) => (
            <article key={step} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-sm font-semibold text-emerald-200">{step}</p>
              <p className="mt-1 text-sm text-slate-300">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
