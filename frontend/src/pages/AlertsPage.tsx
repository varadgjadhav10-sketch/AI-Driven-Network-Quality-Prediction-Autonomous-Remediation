import { motion } from 'framer-motion';
import { ShieldAlert, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTelemetry } from '../providers/TelemetryProvider';
import type { TelemetryData } from '../types/telemetry';

interface PacketTrace {
  flowLabel: string;
  ipVersion: 'IPv4' | 'IPv6';
  transport: 'TCP' | 'UDP';
  rows: Array<{ offset: string; hex: string; ascii: string }>;
}

function flowSeed(flowId: string): number {
  let seed = 0;
  for (let i = 0; i < flowId.length; i += 1) {
    seed = (seed * 31 + flowId.charCodeAt(i)) >>> 0;
  }
  return seed;
}

function buildPacketTrace(event: TelemetryData): PacketTrace {
  const seed = flowSeed(`${event.flow_id}-${Math.floor(event.timestamp * 1000)}-${event.ddos?.probability ?? 0}`);
  const ipVersion = seed % 2 === 0 ? 'IPv6' : 'IPv4';
  const transport = seed % 3 === 0 ? 'UDP' : 'TCP';

  let state = seed || 1;
  const nextByte = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state & 0xff;
  };

  const protoByte = transport === 'TCP' ? 0x06 : 0x11;
  const ipVersionByte = ipVersion === 'IPv6' ? 0x60 : 0x45;
  const rows = Array.from({ length: 6 }).map((_, idx) => {
    const bytes = Array.from({ length: 16 }).map(() => nextByte());

    if (idx === 0) {
      bytes[12] = ipVersion === 'IPv6' ? 0x86 : 0x08;
      bytes[13] = ipVersion === 'IPv6' ? 0xdd : 0x00;
      bytes[14] = ipVersionByte;
    }
    if (idx === 1) {
      bytes[5] = protoByte;
      bytes[6] = Number(((event.metrics?.rate ?? 0) % 255).toFixed(0));
      bytes[7] = Number((((event.metrics?.duration ?? 0) * 10) % 255).toFixed(0));
    }

    const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = bytes
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('')
      .replace(/\s/g, '.');

    return {
      offset: (idx * 16).toString(16).padStart(4, '0'),
      hex,
      ascii,
    };
  });

  return {
    flowLabel: event.flow_id,
    ipVersion,
    transport,
    rows,
  };
}

export default function AlertsPage() {
  const { data, alertsCount } = useTelemetry();
  const [selectedTrace, setSelectedTrace] = useState<PacketTrace | null>(null);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedTrace(null);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const alerts = useMemo(
    () =>
      data
        .filter((d) => (d.ddos?.probability ?? 0) >= 0.75)
        .slice(-50)
        .reverse(),
    [data],
  );

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/60 p-5"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-rose-500/20 p-3">
            <ShieldAlert className="h-5 w-5 text-rose-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Threat Timeline</p>
            <h2 className="text-xl font-semibold">Autonomous Detection Alerts</h2>
          </div>
        </div>
        <p className="rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-1 text-sm text-rose-200">
          Critical alerts: {alertsCount}
        </p>
      </motion.div>

      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-800/70 text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Flow</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Predicted Latency</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Packet Trace</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No alert events yet. Stream traffic to populate this feed.
                </td>
              </tr>
            ) : (
              alerts.map((event) => {
                const probability = event.ddos?.probability ?? 0;
                const isCritical = probability >= 0.9;
                return (
                  <tr key={`${event.flow_id}-${event.timestamp}`} className="border-t border-slate-800/80">
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(event.timestamp * 1000).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-slate-100">{event.flow_id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-200'
                            : 'bg-amber-500/20 text-amber-200'
                        }`}
                      >
                        {(probability * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{(event.qos?.mu ?? 0).toFixed(2)} ms</td>
                    <td className="px-4 py-3 text-slate-400">{event.reason ?? 'N/A'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedTrace(buildPacketTrace(event))}
                        className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
                      >
                        View Packet Trace
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedTrace ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTrace(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-[min(980px,95vw)] rounded-2xl border border-cyan-400/35 bg-slate-950/95 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">Packet Trace Inspector</p>
                <p className="mt-1 text-sm text-slate-300">
                  Flow {selectedTrace.flowLabel} · {selectedTrace.ipVersion} · {selectedTrace.transport}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrace(null)}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                  Ethernet II
                </span>
                <span className="rounded-full border border-indigo-400/35 bg-indigo-500/10 px-2 py-0.5 text-indigo-200">
                  {selectedTrace.ipVersion}
                </span>
                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                  {selectedTrace.transport}
                </span>
              </div>

              <div className="grid grid-cols-[74px_1fr_220px] gap-3 border-b border-slate-800 pb-2 text-[11px] uppercase tracking-wider text-slate-500">
                <p>Offset</p>
                <p>Hex Bytes</p>
                <p>ASCII</p>
              </div>

              <div className="mt-2 space-y-1.5 leading-6">
                {selectedTrace.rows.map((row) => (
                  <div key={row.offset} className="grid grid-cols-[74px_1fr_220px] gap-3">
                    <p className="text-cyan-300">{row.offset}</p>
                    <p>{row.hex}</p>
                    <p className="text-slate-400">{row.ascii}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Simulated packet dump for presentation use (Wireshark/tcpdump style visual).
            </p>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
