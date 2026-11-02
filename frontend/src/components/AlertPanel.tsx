import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import type { TelemetryData } from '../types/telemetry';

interface AlertPanelProps {
  data: TelemetryData[];
}

export default function AlertPanel({ data }: AlertPanelProps) {
  const alerts = useMemo(
    () =>
      data
        .filter((d) => (d.ddos?.probability ?? 0) >= 0.8 || (d.metrics?.errors ?? 0) > 0)
        .slice(-6)
        .reverse(),
    [data],
  );

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Alert Panel</h3>
        <span className="text-xs text-rose-300">{alerts.length} active</span>
      </div>

      <div className="space-y-2">
        {alerts.length === 0 ? (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200">
            No anomalies in current telemetry window.
          </p>
        ) : (
          alerts.map((alert) => {
            const severity = (alert.ddos?.probability ?? 0) >= 0.9 ? 'CRITICAL' : 'WARNING';
            return (
              <motion.article
                key={`${alert.flow_id}-${alert.timestamp}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2"
              >
                <div className="flex items-center gap-2 text-rose-200">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-xs font-semibold tracking-wide">{severity}</p>
                </div>
                <p className="mt-1 text-sm text-slate-200">Flow {alert.flow_id}</p>
                <p className="text-xs text-slate-300">
                  DDoS {(100 * (alert.ddos?.probability ?? 0)).toFixed(1)}% · Errors {alert.metrics?.errors ?? 0}
                </p>
              </motion.article>
            );
          })
        )}
      </div>
    </div>
  );
}
