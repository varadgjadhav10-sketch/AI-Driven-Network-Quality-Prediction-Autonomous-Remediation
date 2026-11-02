import { motion } from 'framer-motion';
import { useState } from 'react';
import { X } from 'lucide-react';
import BackendFlowVisualizer from '../components/BackendFlowVisualizer';
import NetworkTopologyMap from '../components/NetworkTopologyMap';
import PacketEventFeed from '../components/PacketEventFeed';
import { useTelemetry } from '../providers/TelemetryProvider';

function buildRoutingTable(nodeId: string): string[] {
  const nodeNum = nodeId.replace(/[^0-9]/g, '') || '1';
  const base = Number(nodeNum);
  return [
    `${nodeId}# show ip route`,
    'Codes: C - connected, S - static, B - BGP, O - OSPF',
    `C    10.${base}.0.0/24 is directly connected, ethernet-1/1`,
    `C    10.${base}.1.0/24 is directly connected, ethernet-1/2`,
    `B    172.16.${base}.0/24 [20/0] via 10.${base}.0.1, 00:00:23, ethernet-1/1`,
    `B    172.16.${base + 10}.0/24 [20/0] via 10.${base}.1.1, 00:00:51, ethernet-1/2`,
    `S    0.0.0.0/0 [1/0] via 10.${base}.0.254, ethernet-1/1`,
    `B    203.0.113.${base}/32 [200/0] via 10.${base}.1.1, 00:01:15, ethernet-1/2`,
  ];
}

export default function NetworkLabPage() {
  const { data } = useTelemetry();
  const [showBgpControlPlane, setShowBgpControlPlane] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-cyan-400/25 bg-[linear-gradient(140deg,rgba(14,165,233,0.22),rgba(2,6,23,0.9))] p-6"
      >
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Operational Lab</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl font-semibold text-slate-50">Topology + Data Movement Visualizer</h2>
          <button
            type="button"
            onClick={() => setShowBgpControlPlane((prev) => !prev)}
            className={`ui-btn px-4 py-2 text-xs ${showBgpControlPlane ? 'ui-btn-live ui-btn-secondary' : 'ui-btn-ghost'}`}
          >
            {showBgpControlPlane ? 'Hide BGP Control Plane' : 'Show BGP Control Plane'}
          </button>
        </div>
        <p className="mt-2 text-slate-300">
          Dedicated canvas for GNN topology signals and packet stream movement across Digital Twin, Kafka, AI, and UI.
        </p>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <NetworkTopologyMap
            data={data}
            showBgpControlPlane={showBgpControlPlane}
            onNodeClick={(nodeId) => setSelectedNode(nodeId)}
          />
          <p className="mt-2 text-xs text-slate-400">Tip: click any spine/leaf node to open Virtual CLI route table.</p>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
          className="space-y-4"
        >
          <PacketEventFeed data={data} />
        </motion.aside>
      </div>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <BackendFlowVisualizer data={data} />
      </motion.section>

      {selectedNode ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/80 p-4" onClick={() => setSelectedNode(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-[min(920px,95vw)] rounded-2xl border border-emerald-400/45 bg-[#02070f] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-emerald-500/30 pb-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-emerald-300">Virtual CLI</p>
                <p className="mt-1 text-sm text-emerald-200">Node {selectedNode} · Routing Table Inspection</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="rounded-lg border border-emerald-400/40 p-2 text-emerald-200 hover:bg-emerald-500/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-[#01040a] p-4 font-mono text-xs leading-6 text-emerald-300">
              {buildRoutingTable(selectedNode).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
