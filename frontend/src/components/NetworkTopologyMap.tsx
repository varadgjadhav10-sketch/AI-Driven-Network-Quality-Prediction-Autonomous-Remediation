import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { TelemetryData } from '../types/telemetry';

const nodes = [
  { id: 'spine1', x: 140, y: 65 },
  { id: 'spine2', x: 420, y: 65 },
  { id: 'leaf1', x: 60, y: 240 },
  { id: 'leaf2', x: 180, y: 240 },
  { id: 'leaf3', x: 300, y: 240 },
  { id: 'leaf4', x: 420, y: 240 },
];

const links: Array<[string, string]> = [
  ['spine1', 'leaf1'],
  ['spine1', 'leaf2'],
  ['spine1', 'leaf3'],
  ['spine1', 'leaf4'],
  ['spine2', 'leaf1'],
  ['spine2', 'leaf2'],
  ['spine2', 'leaf3'],
  ['spine2', 'leaf4'],
];

interface NetworkTopologyMapProps {
  data: TelemetryData[];
  showBgpControlPlane?: boolean;
  onNodeClick?: (nodeId: string) => void;
}

const asnByNode: Record<string, string> = {
  spine1: 'AS65001',
  spine2: 'AS65002',
  leaf1: 'AS65101',
  leaf2: 'AS65102',
  leaf3: 'AS65103',
  leaf4: 'AS65104',
};

export default function NetworkTopologyMap({
  data,
  showBgpControlPlane = false,
  onNodeClick,
}: NetworkTopologyMapProps) {
  const highlighted = useMemo(() => {
    for (let i = data.length - 1; i >= 0; i -= 1) {
      const row = data[i];
      if (!row) {
        continue;
      }
      if (row.rca?.root_cause_node && row.rca.root_cause_node !== 'unknown') {
        return row.rca.root_cause_node;
      }
    }
    return '';
  }, [data]);

  const latest = data[data.length - 1];
  const rate = latest?.metrics?.rate ?? 0;
  const utilization = latest?.metrics?.utilization ?? 0;
  const intensity = Math.max(0.2, Math.min(1, (rate / 1200 + utilization / 100) / 2));
  const packetDur = `${(2.6 - intensity * 1.8).toFixed(2)}s`;

  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), []);

  const bgpLabelPosition = (a: string, b: string, n1: { x: number; y: number }, n2: { x: number; y: number }) => {
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const len = Math.max(Math.hypot(dx, dy), 1);
    const nx = -dy / len;
    const ny = dx / len;

    const t = a === 'spine1' ? 0.38 : 0.62;
    const baseX = n1.x + dx * t;
    const baseY = n1.y + dy * t;

    const leafIdx = Number(b.replace('leaf', '')) - 1;
    const fanout = Number.isFinite(leafIdx) ? (leafIdx - 1.5) * 12 : 0;
    const signedFanout = a === 'spine1' ? fanout : -fanout;

    return {
      x: baseX + nx * signedFanout,
      y: baseY + ny * signedFanout,
    };
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">GNN Topology Map</h3>
        <p className="text-xs text-slate-400">
          Root cause: {highlighted || 'none detected'} · traffic intensity {(intensity * 100).toFixed(0)}%
        </p>
      </div>

      <svg viewBox="0 0 480 290" className="h-[320px] w-full rounded-xl border border-slate-700 bg-slate-950/70">
        {links.map(([a, b]) => {
          const n1 = byId[a] as { x: number; y: number };
          const n2 = byId[b] as { x: number; y: number };
          const pathId = `${a}-${b}-path`;

          return (
            <g key={`${a}-${b}`}>
              <path id={pathId} d={`M ${n1.x} ${n1.y} L ${n2.x} ${n2.y}`} fill="none" />
              <line x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke="#1e3a5f" strokeWidth="2" />
              <line
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke="#22d3ee"
                strokeWidth="1.5"
                strokeDasharray="6 8"
                opacity="0.7"
              >
                <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.6s" repeatCount="indefinite" />
              </line>

              {[0, 0.35].map((beginOffset, idx) => (
                <circle key={`${pathId}-${idx}`} r={2 + intensity * 2.3} fill="#67e8f9" opacity={0.8}>
                  <animateMotion dur={packetDur} repeatCount="indefinite" begin={`${beginOffset}s`}>
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              ))}

              {showBgpControlPlane ? (
                <g>
                  <rect
                    x={bgpLabelPosition(a, b, n1, n2).x - 58}
                    y={bgpLabelPosition(a, b, n1, n2).y - 8}
                    width="116"
                    height="14"
                    rx="5"
                    fill="rgba(2,6,23,0.82)"
                    stroke="rgba(134,239,172,0.45)"
                  />
                  <text
                    x={bgpLabelPosition(a, b, n1, n2).x}
                    y={bgpLabelPosition(a, b, n1, n2).y + 2}
                    textAnchor="middle"
                    fill="#86efac"
                    fontSize="8.5"
                  >
                    BGP ESTABLISHED | KA 60s
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}

        {nodes.map((node) => {
          const isHot = highlighted === node.id;
          return (
            <g key={node.id}>
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={isHot ? 17 : 13}
                initial={{ scale: 0.9, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35 }}
                fill={isHot ? '#fb7185' : '#38bdf8'}
                opacity={isHot ? 0.92 : 0.8}
                style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
                onClick={() => onNodeClick?.(node.id)}
              />
              <text x={node.x} y={node.y + 34} textAnchor="middle" fill="#cbd5e1" fontSize="12">
                {node.id}
              </text>
              {showBgpControlPlane ? (
                <text x={node.x} y={node.y + 48} textAnchor="middle" fill="#a7f3d0" fontSize="10">
                  {asnByNode[node.id]}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
