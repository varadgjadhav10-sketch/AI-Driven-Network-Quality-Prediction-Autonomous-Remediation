import { motion } from 'framer-motion';

export default function PageLoader() {
  return (
    <div className="grid min-h-[55vh] place-items-center">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-cyan-400/25 bg-slate-950/70 px-8 py-7">
        <motion.div
          className="h-10 w-10 rounded-full border-2 border-cyan-300/40 border-t-cyan-300"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/80">Live Platform Mode</p>
          <p className="mt-1 text-sm text-slate-300">Loading interactive scene...</p>
        </div>
      </div>
    </div>
  );
}
