import { motion } from 'framer-motion';
import { Activity, Brain, Database, PlugZap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTelemetry } from '../providers/TelemetryProvider';

interface HealthPayload {
  status?: string;
  models_loaded?: boolean;
  connected_ws_clients?: number;
}

export default function SystemStatusCards() {
  const { isConnected, lastMessageAt } = useTelemetry();
  const [health, setHealth] = useState<HealthPayload | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchHealth = async () => {
      try {
        const res = await fetch('http://localhost:8000/health');
        const payload = (await res.json()) as HealthPayload;
        if (mounted) {
          setHealth(payload);
        }
      } catch {
        if (mounted) {
          setHealth(null);
        }
      }
    };

    fetchHealth();
    const id = window.setInterval(fetchHealth, 4000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const kafkaHealthy = useMemo(() => {
    if (!lastMessageAt) {
      return false;
    }
    return Date.now() - lastMessageAt < 12000;
  }, [lastMessageAt]);

  const cards = [
    {
      label: 'Kafka Stream',
      icon: Database,
      status: kafkaHealthy ? 'Online' : 'Stale',
      accent: kafkaHealthy ? 'emerald' : 'amber',
    },
    {
      label: 'AI Inference',
      icon: Brain,
      status: health?.models_loaded ? 'Loaded' : 'Unavailable',
      accent: health?.models_loaded ? 'emerald' : 'rose',
    },
    {
      label: 'API Health',
      icon: PlugZap,
      status: health?.status === 'running' ? 'Healthy' : 'Unknown',
      accent: health?.status === 'running' ? 'emerald' : 'amber',
    },
    {
      label: 'WebSocket',
      icon: Activity,
      status: isConnected ? 'Connected' : 'Disconnected',
      accent: isConnected ? 'emerald' : 'rose',
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const accent =
          card.accent === 'emerald'
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            : card.accent === 'rose'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-200';

        return (
          <motion.article
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-300">{card.label}</p>
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <span className={`rounded-full border px-2 py-1 text-xs ${accent}`}>{card.status}</span>
          </motion.article>
        );
      })}
    </div>
  );
}
