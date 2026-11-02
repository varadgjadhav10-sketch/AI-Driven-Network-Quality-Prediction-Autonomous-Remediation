import { motion } from 'framer-motion';
import type { TelemetryData } from '../types/telemetry';

interface PacketEventFeedProps {
  data: TelemetryData[];
}

export default function PacketEventFeed({ data }: PacketEventFeedProps) {
  const events = data.slice(-14).reverse();

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm uppercase tracking-[0.2em] text-slate-400">Live Packet Events</h3>
      <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
        {events.map((event) => {
          const risk = event.ddos?.probability ?? 0;
          return (
            <motion.article
              key={`${event.flow_id}-${event.timestamp}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-slate-700 bg-slate-950/70 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-100">{event.flow_id}</p>
                <span className="text-xs text-slate-400">{new Date(event.timestamp * 1000).toLocaleTimeString()}</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                rate {(event.metrics?.rate ?? 0).toFixed(1)} pkt/s · duration {(event.metrics?.duration ?? 0).toFixed(2)} ms
              </p>
              <p className={`mt-1 text-xs ${risk > 0.9 ? 'text-rose-300' : 'text-cyan-300'}`}>
                threat {(risk * 100).toFixed(1)}% · reason {event.reason ?? 'NORMAL'}
              </p>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
