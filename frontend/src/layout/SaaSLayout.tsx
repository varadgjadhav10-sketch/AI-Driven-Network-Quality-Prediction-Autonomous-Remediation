import { motion } from 'framer-motion';
import {
  Activity,
  Bell,
  CircleHelp,
  Gauge,
  Home,
  Orbit,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useDemoUi } from '../providers/DemoUiProvider';
import { useTelemetry } from '../providers/TelemetryProvider';

const navItems = [
  { to: '/', label: 'Landing', icon: Home },
  { to: '/app/dashboard', label: 'Dashboard', icon: Gauge },
  { to: '/app/models', label: 'Models', icon: Activity },
  { to: '/app/lab', label: 'Network Lab', icon: Orbit },
  { to: '/app/alerts', label: 'Alerts', icon: Bell },
  { to: '/app/settings', label: 'Settings', icon: Settings },
  { to: '/app/about', label: 'About', icon: CircleHelp },
];

const pageTitleByPath: Record<string, string> = {
  '/app/dashboard': 'Network Operations Dashboard',
  '/app/models': 'Model Intelligence Center',
  '/app/lab': 'Network Lab & Backend Streams',
  '/app/alerts': 'Live Threat Alerts',
  '/app/settings': 'Control Plane Settings',
  '/app/about': 'System Architecture Docs',
};

export default function SaaSLayout() {
  const { pathname } = useLocation();
  const { isConnected, lastMessageAt } = useTelemetry();
  const { presenterMode } = useDemoUi();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#122947,_#071427_42%,_#020712)] text-slate-100">
      <div
        className={`mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 ${
          presenterMode ? '' : 'lg:grid-cols-[280px_1fr]'
        }`}
      >
        <aside
          className={`border-r border-slate-800/80 bg-slate-950/50 px-5 py-6 backdrop-blur ${
            presenterMode ? 'hidden' : 'block'
          }`}
        >
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <div className="rounded-lg bg-cyan-400/20 p-2">
              <Activity className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-sm text-cyan-100/70">Computer Networks Project</p>
              <p className="text-lg font-semibold tracking-wide text-cyan-50">Realtime Network Quality Prediction</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition duration-200 hover:-translate-y-[1px] ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-300/40'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/45 px-6 py-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Realtime Network Quality Prediction Using ML</p>
                <h1 className="text-2xl font-semibold text-slate-100">
                  {pageTitleByPath[pathname] ?? 'Network Operations Dashboard'}
                </h1>
                <p className="mt-1 inline-flex rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-cyan-200/85">
                  Live Platform Mode
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-emerald-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-rose-400" />
                )}
                <span className={isConnected ? 'text-emerald-300' : 'text-rose-300'}>
                  {isConnected ? 'Telemetry Live' : 'Disconnected'}
                </span>
                {lastMessageAt ? (
                  <span className="text-xs text-slate-400">
                    Last packet {new Date(lastMessageAt).toLocaleTimeString()}
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          <motion.main
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex-1 px-6 py-6"
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
    </div>
  );
}
