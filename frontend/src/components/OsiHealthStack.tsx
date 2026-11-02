interface OsiHealthStackProps {
  ddosProbability: number;
  errorRate: number;
}

const osiLayers = [
  { layer: 7, name: 'Application' },
  { layer: 6, name: 'Presentation' },
  { layer: 5, name: 'Session' },
  { layer: 4, name: 'Transport' },
  { layer: 3, name: 'Network' },
  { layer: 2, name: 'Data Link' },
  { layer: 1, name: 'Physical' },
];

export default function OsiHealthStack({ ddosProbability, errorRate }: OsiHealthStackProps) {
  const layer4Hot = ddosProbability >= 0.75;
  const layer3Hot = errorRate > 0 || ddosProbability >= 0.9;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm uppercase tracking-[0.2em] text-slate-400">OSI Model Health Stack</h3>
      <div className="space-y-1.5">
        {osiLayers.map((item) => {
          const isRed = (item.layer === 4 && layer4Hot) || (item.layer === 3 && layer3Hot);
          return (
            <div
              key={item.layer}
              className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs ${
                isRed
                  ? 'border-rose-400/55 bg-rose-500/15 text-rose-200'
                  : 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              <span>L{item.layer}</span>
              <span>{item.name}</span>
              <span>{isRed ? 'Degraded' : 'Healthy'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
