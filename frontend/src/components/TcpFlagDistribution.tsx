import { motion } from 'framer-motion';

interface TcpFlagDistributionProps {
  ddosProbability: number;
}

interface FlagRow {
  name: string;
  value: number;
  color: string;
}

export default function TcpFlagDistribution({ ddosProbability }: TcpFlagDistributionProps) {
  const isFlood = ddosProbability >= 0.9;

  const rows: FlagRow[] = isFlood
    ? [
        { name: 'SYN', value: 68, color: 'from-rose-500 to-rose-300' },
        { name: 'ACK', value: 22, color: 'from-amber-500 to-amber-300' },
        { name: 'FIN/RST', value: 10, color: 'from-fuchsia-500 to-fuchsia-300' },
      ]
    : [
        { name: 'SYN', value: 10, color: 'from-cyan-500 to-cyan-300' },
        { name: 'ACK', value: 85, color: 'from-emerald-500 to-emerald-300' },
        { name: 'FIN/RST', value: 5, color: 'from-indigo-500 to-indigo-300' },
      ];

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Layer 4: TCP State Distribution</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
            isFlood ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/20 text-emerald-200'
          }`}
        >
          {isFlood ? 'SYN flood pattern' : 'Baseline pattern'}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.name}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
              <span>{row.name}</span>
              <span>{row.value}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${row.value}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full rounded-full bg-gradient-to-r ${row.color}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
