import { motion } from 'framer-motion';
import { Activity, AlertTriangle, HardDrive, Network } from 'lucide-react';
import { Suspense, lazy, useMemo } from 'react';
import AnimatedMetric from '../components/AnimatedMetric';
import NetworkQualityPanel from '../components/NetworkQualityPanel';
import SystemStatusCards from '../components/SystemStatusCards';
import { useTelemetry } from '../providers/TelemetryProvider';
import { Link } from 'react-router-dom';

const AlertPanel = lazy(() => import('../components/AlertPanel'));
const OsiHealthStack = lazy(() => import('../components/OsiHealthStack'));
const PacketFlowChart = lazy(() => import('../components/PacketFlowChart'));
const QoSChart = lazy(() => import('../components/QoSChart'));
const TcpFlagDistribution = lazy(() => import('../components/TcpFlagDistribution'));
const TrafficPulseChart = lazy(() => import('../components/TrafficPulseChart'));

const cardMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

function flowToIpv6(flowId: string): string {
  let seed = 0;
  for (let i = 0; i < flowId.length; i += 1) {
    seed = (seed * 33 + flowId.charCodeAt(i)) >>> 0;
  }

  const a = ((seed >>> 0) & 0xffff).toString(16);
  const b = ((seed >>> 4) & 0xffff).toString(16);
  const c = ((seed >>> 8) & 0xffff).toString(16);
  return `2001:db8:${a}:${b}::${c}`;
}

export default function HomePage() {
  const { data } = useTelemetry();
  const latest = data[data.length - 1];
  const ddosProb = latest?.ddos?.probability ?? 0;
  const recentFlows = useMemo(() => data.slice(-8).reverse(), [data]);

  const panelFallback = (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">Loading panel...</div>
  );

  return (
    <div className="space-y-6">
      <SystemStatusCards />
      <NetworkQualityPanel latest={latest} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <motion.article
          variants={cardMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5"
        >
          <div className="mb-3 flex items-center gap-2 text-cyan-300">
            <Activity className="h-4 w-4" />
            <p className="text-sm uppercase tracking-widest">L3 Forwarding Rate</p>
          </div>
          <p className="text-3xl font-semibold">
            <AnimatedMetric value={latest?.metrics?.rate ?? 0} decimals={2} />
          </p>
          <p className="text-xs text-slate-400">IPv4/IPv6 packets per second</p>
        </motion.article>

        <motion.article
          variants={cardMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5"
        >
          <div className="mb-3 flex items-center gap-2 text-violet-300">
            <HardDrive className="h-4 w-4" />
            <p className="text-sm uppercase tracking-widest">ifHCInOctets Utilization</p>
          </div>
          <p className="text-3xl font-semibold">
            <AnimatedMetric value={latest?.metrics?.utilization ?? 0} decimals={2} suffix="%" />
          </p>
          <p className="text-xs text-slate-400">Interface occupancy (percent)</p>
        </motion.article>

        <motion.article
          variants={cardMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5"
        >
          <div className="mb-3 flex items-center gap-2 text-sky-300">
            <Network className="h-4 w-4" />
            <p className="text-sm uppercase tracking-widest">One-Way Delay Forecast</p>
          </div>
          <p className="text-3xl font-semibold">
            <AnimatedMetric value={latest?.qos?.mu ?? 0} decimals={2} suffix=" ms" />
          </p>
          <p className="text-xs text-slate-400">BR-LSTM QoS predictive estimate</p>
        </motion.article>

        <motion.article
          variants={cardMotion}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className={`rounded-2xl border p-5 ${
            ddosProb > 0.9
              ? 'border-rose-500/70 bg-rose-500/10'
              : 'border-slate-700 bg-slate-900/60'
          }`}
        >
          <div className="mb-3 flex items-center gap-2 text-rose-300">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm uppercase tracking-widest">L4 Anomaly Likelihood</p>
          </div>
          <p className="text-3xl font-semibold">
            <AnimatedMetric value={ddosProb * 100} decimals={2} suffix="%" />
          </p>
          <p className="text-xs text-slate-400">CNN-BiLSTM transport-layer risk score</p>
        </motion.article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <Suspense fallback={panelFallback}>
            <TrafficPulseChart data={data} />
          </Suspense>
        </motion.section>
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.35 }}
          className="space-y-4"
        >
          <Suspense fallback={panelFallback}>
            <TcpFlagDistribution ddosProbability={ddosProb} />
          </Suspense>
          <Suspense fallback={panelFallback}>
            <OsiHealthStack ddosProbability={ddosProb} errorRate={latest?.metrics?.errors ?? 0} />
          </Suspense>
        </motion.aside>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.35 }}
          className="space-y-4"
        >
          <Suspense fallback={panelFallback}>
            <QoSChart data={data} />
          </Suspense>
          <Suspense fallback={panelFallback}>
            <PacketFlowChart data={data} />
          </Suspense>
          <div className="panel-elevated rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Deep-Dive Views</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-100">Topology and Backend Stream Visualizer</h3>
            <p className="mt-2 text-sm text-slate-300">
              Open the dedicated Network Lab page for full-screen GNN topology maps, packet event feed, and Kafka-to-AI
              animation lanes.
            </p>
            <Link
              to="/app/lab"
              className="ui-btn ui-btn-secondary mt-4 px-4 py-2 text-sm"
            >
              Open Network Lab
            </Link>
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
            <h3 className="text-sm uppercase tracking-[0.2em] text-cyan-200">CN + ML Evidence Chain</h3>
            <p className="mt-2 text-sm text-slate-200">
              BR-LSTM predicts <span className="font-semibold text-cyan-200">{(latest?.qos?.mu ?? 0).toFixed(2)} ms</span> delay while
              transport telemetry shows <span className="font-semibold text-amber-200">{(ddosProb * 100).toFixed(2)}%</span> anomaly
              probability. This links QoS drift to Layer 3/4 signal behavior in near real time.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-2">
                <p className="text-slate-400">Rate</p>
                <p className="mt-1 font-semibold text-slate-100">{(latest?.metrics?.rate ?? 0).toFixed(2)} pps</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-2">
                <p className="text-slate-400">Errors</p>
                <p className="mt-1 font-semibold text-slate-100">{(latest?.metrics?.errors ?? 0).toFixed(3)}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-2">
                <p className="text-slate-400">Util</p>
                <p className="mt-1 font-semibold text-slate-100">{(latest?.metrics?.utilization ?? 0).toFixed(2)}%</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Flow Export Registry</h3>
            <div className="mt-3 max-h-[300px] space-y-2 overflow-auto pr-1">
              {recentFlows.length === 0 ? (
                <p className="text-xs text-slate-500">Awaiting IPFIX records...</p>
              ) : (
                recentFlows.map((flow) => (
                  <article
                    key={`${flow.flow_id}-${flow.timestamp}`}
                    className="rounded-xl border border-slate-700 bg-slate-950/70 p-3"
                  >
                    <p className="text-sm font-medium text-slate-100">{flow.flow_id}</p>
                    <p className="mt-1 font-mono text-xs text-cyan-200">{flowToIpv6(flow.flow_id)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">
                        Protocol: TCP/UDP
                      </span>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                        SRv6 Path Active
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
          <Suspense fallback={panelFallback}>
            <AlertPanel data={data} />
          </Suspense>
        </motion.aside>
      </div>
    </div>
  );
}
