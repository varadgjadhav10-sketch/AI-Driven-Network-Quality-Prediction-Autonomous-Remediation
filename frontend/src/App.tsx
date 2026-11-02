import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import DemoCommandDeck from './components/DemoCommandDeck';
import SaaSLayout from './layout/SaaSLayout';
import PageLoader from './components/PageLoader';
import { DemoUiProvider } from './providers/DemoUiProvider';
import { TelemetryProvider } from './providers/TelemetryProvider';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const ModelsPage = lazy(() => import('./pages/ModelsPage'));
const NetworkLabPage = lazy(() => import('./pages/NetworkLabPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={<SaaSLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<HomePage />} />
              <Route path="models" element={<ModelsPage />} />
              <Route path="lab" element={<NetworkLabPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="about" element={<AboutPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <TelemetryProvider>
      <DemoUiProvider>
        <BrowserRouter>
          <AnimatedRoutes />
          <DemoCommandDeck />
        </BrowserRouter>
      </DemoUiProvider>
    </TelemetryProvider>
  );
}
