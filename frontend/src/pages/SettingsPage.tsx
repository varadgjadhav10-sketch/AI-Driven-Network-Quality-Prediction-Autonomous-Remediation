import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useTelemetry } from '../providers/TelemetryProvider';

export default function SettingsPage() {
  const { socketUrl } = useTelemetry();
  const [autoRemediation, setAutoRemediation] = useState(true);
  const [criticalThreshold, setCriticalThreshold] = useState(90);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-3xl space-y-5"
    >
      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold">Runtime Controls</h2>
        <p className="mt-1 text-sm text-slate-400">Operational toggles for streaming AI telemetry.</p>

        <div className="mt-6 space-y-5">
          <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <span>
              <span className="block text-sm font-medium">Automatic Remediation</span>
              <span className="text-xs text-slate-400">
                Allow backend to execute RESTCONF actions on threat threshold breach.
              </span>
            </span>
            <input
              type="checkbox"
              checked={autoRemediation}
              onChange={(e) => setAutoRemediation(e.target.checked)}
              className="h-5 w-5 accent-cyan-500"
            />
          </label>

          <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <label className="mb-2 block text-sm font-medium">Critical Threat Threshold (%)</label>
            <input
              type="range"
              min={50}
              max={99}
              value={criticalThreshold}
              onChange={(e) => setCriticalThreshold(Number(e.target.value))}
              className="w-full"
            />
            <p className="mt-2 text-sm text-slate-300">Current threshold: {criticalThreshold}%</p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
            <p className="mb-2 font-medium text-slate-100">Active WebSocket Endpoint</p>
            <p className="font-mono text-xs text-cyan-200">{socketUrl}</p>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        className={`ui-btn ui-btn-secondary px-4 py-2 text-sm ${saved ? 'ui-btn-live' : ''}`}
      >
        <Save className="h-4 w-4" />
        Save Configuration
      </button>

      {saved ? (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          Settings saved for this session.
        </p>
      ) : null}
    </motion.div>
  );
}
