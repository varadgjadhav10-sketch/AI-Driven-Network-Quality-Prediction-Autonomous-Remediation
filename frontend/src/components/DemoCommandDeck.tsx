import { motion } from 'framer-motion';
import { Clapperboard, Play, Square, TvMinimal } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDemoUi } from '../providers/DemoUiProvider';

const STEP_MS = 7000;

export default function DemoCommandDeck() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    presenterMode,
    togglePresenterMode,
    tourRunning,
    tourStepIndex,
    tourSteps,
    startTour,
    stopTour,
    setTourStepIndex,
  } = useDemoUi();

  useEffect(() => {
    if (!tourRunning) {
      return;
    }

    const step = tourSteps[tourStepIndex];
    if (step && location.pathname !== step.path) {
      navigate(step.path);
    }

    const timer = window.setTimeout(() => {
      if (tourStepIndex >= tourSteps.length - 1) {
        stopTour();
        return;
      }
      setTourStepIndex(tourStepIndex + 1);
    }, STEP_MS);

    return () => window.clearTimeout(timer);
  }, [tourRunning, tourStepIndex, tourSteps, navigate, stopTour, setTourStepIndex, location.pathname]);

  const activeStep = tourSteps[tourStepIndex];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-slate-950/85 px-3 py-2 shadow-[0_0_40px_-18px_rgba(34,211,238,0.9)] backdrop-blur"
      >
        <button
          type="button"
          onClick={tourRunning ? stopTour : startTour}
          className={`ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs ${tourRunning ? 'ui-btn-live' : ''}`}
        >
          {tourRunning ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {tourRunning ? 'Stop Tour' : 'Start Tour'}
        </button>
        <button
          type="button"
          onClick={togglePresenterMode}
          className={`ui-btn px-2.5 py-1.5 text-xs ${
            presenterMode
              ? 'border-violet-400/40 bg-violet-500/20 text-violet-100 ui-btn-live'
              : 'ui-btn-ghost'
          }`}
        >
          <TvMinimal className="h-3.5 w-3.5" />
          {presenterMode ? 'Presenter On' : 'Presenter'}
        </button>
      </motion.div>

      {tourRunning && activeStep ? (
        <motion.div
          key={activeStep.path}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-1/2 top-4 z-[75] w-[min(680px,92vw)] -translate-x-1/2 rounded-2xl border border-cyan-400/35 bg-slate-950/90 p-4 shadow-[0_0_40px_-18px_rgba(34,211,238,0.85)] backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-cyan-200">
              <Clapperboard className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.22em]">Demo Choreography</p>
            </div>
            <p className="text-xs text-slate-400">
              Scene {tourStepIndex + 1}/{tourSteps.length}
            </p>
          </div>
          <h3 className="text-lg font-semibold text-slate-100">{activeStep.title}</h3>
          <p className="mt-1 text-sm text-slate-300">{activeStep.description}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <motion.div
              key={`${tourStepIndex}-progress`}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: STEP_MS / 1000, ease: 'linear' }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-indigo-400"
            />
          </div>
        </motion.div>
      ) : null}
    </>
  );
}
