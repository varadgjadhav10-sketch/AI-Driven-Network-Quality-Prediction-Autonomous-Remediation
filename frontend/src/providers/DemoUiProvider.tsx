import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

export interface DemoTourStep {
  path: string;
  title: string;
  description: string;
}

const TOUR_STEPS: DemoTourStep[] = [
  {
    path: '/',
    title: 'Mission Brief',
    description: 'State the problem: QoS degradation appears late in reactive NOC dashboards, so we predict and prevent.',
  },
  {
    path: '/app/dashboard',
    title: 'Ops Command Center',
    description: 'Show live L3/L4 telemetry, BR-LSTM forecast, and anomaly confidence converging in one operational view.',
  },
  {
    path: '/app/models',
    title: 'Model Intelligence',
    description: 'Explain model roles: forecast QoS, detect pressure, localize root-cause path for targeted action.',
  },
  {
    path: '/app/lab',
    title: 'Network Lab',
    description: 'Validate CN depth with topology, BGP context, packet stream behavior, and virtual CLI diagnostics.',
  },
  {
    path: '/app/alerts',
    title: 'Threat Evidence',
    description: 'Inspect per-event packet traces and risk-ranked incidents before executing a control action.',
  },
  {
    path: '/app/about',
    title: 'Architecture Docs',
    description: 'Close with end-to-end architecture and controlled remediation loop suitable for production hardening.',
  },
];

interface DemoUiContextValue {
  presenterMode: boolean;
  setPresenterMode: (value: boolean) => void;
  togglePresenterMode: () => void;
  tourRunning: boolean;
  tourStepIndex: number;
  tourSteps: DemoTourStep[];
  startTour: () => void;
  stopTour: () => void;
  setTourStepIndex: (index: number) => void;
}

const DemoUiContext = createContext<DemoUiContextValue | undefined>(undefined);

export function DemoUiProvider({ children }: PropsWithChildren) {
  const [presenterMode, setPresenterMode] = useState(false);
  const [tourRunning, setTourRunning] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  const value = useMemo<DemoUiContextValue>(
    () => ({
      presenterMode,
      setPresenterMode,
      togglePresenterMode: () => setPresenterMode((prev) => !prev),
      tourRunning,
      tourStepIndex,
      tourSteps: TOUR_STEPS,
      startTour: () => {
        setTourStepIndex(0);
        setTourRunning(true);
      },
      stopTour: () => setTourRunning(false),
      setTourStepIndex,
    }),
    [presenterMode, tourRunning, tourStepIndex],
  );

  return <DemoUiContext.Provider value={value}>{children}</DemoUiContext.Provider>;
}

export function useDemoUi() {
  const context = useContext(DemoUiContext);
  if (!context) {
    throw new Error('useDemoUi must be used within DemoUiProvider');
  }
  return context;
}
