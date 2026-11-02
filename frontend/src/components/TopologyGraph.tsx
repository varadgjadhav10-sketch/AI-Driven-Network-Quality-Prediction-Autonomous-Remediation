import React, { useMemo } from 'react';
import type { TelemetryData } from '../types/telemetry';

interface TopologyGraphProps {
  data: TelemetryData[];
}

const NODES = ['spine1', 'spine2', 'leaf1', 'leaf2', 'leaf3', 'leaf4'];

const TopologyGraph: React.FC<TopologyGraphProps> = ({ data }) => {
  const latestRCA = useMemo(() => {
    for (let i = data.length - 1; i >= 0; i -= 1) {
      if (data[i].rca !== undefined) {
        return data[i];
      }
    }
    return undefined;
  }, [data]);

  const highlighted = latestRCA?.rca?.root_cause_node;

  return (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 h-[600px] w-full">
      <h2 className="text-slate-400 font-medium mb-4">GNN Root Cause Topology</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {NODES.map((node) => {
          const isRootCause = highlighted === node;
          return (
            <div
              key={node}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                isRootCause
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-900/40 border-slate-600 text-slate-200'
              }`}
            >
              {node}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(TopologyGraph);
