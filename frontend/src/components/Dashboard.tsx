import React, { lazy, Suspense } from 'react';
import { useTelemetrySocket } from '../hooks/useTelemetrySocket';
import { Activity, ShieldAlert, Cpu, HardDrive, Network } from 'lucide-react';

const QoSChart = lazy(() => import('./QoSChart'));
const TopologyGraph = lazy(() => import('./TopologyGraph'));

const Dashboard: React.FC = () => {
  const { data, isConnected } = useTelemetrySocket('ws://localhost:8000/ws/telemetry');

  const latestData = data[data.length - 1];

  return (
    <div className="p-8 min-h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">
            AI-Driven Network Telemetry
          </h1>
          <p className="text-slate-400">Phase 5: Real-time Observability & Closed-Loop Control</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
          isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          {isConnected ? 'LIVE' : 'DISCONNECTED'}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* RED ZONE: Flow-level & QoS metrics */}
        <section className="col-span-12 lg:col-span-4 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-sky-400 w-5 h-5" />
            <h2 className="text-xl font-semibold">RED Zone</h2>
            <span className="text-xs text-slate-500 ml-auto">Rate, Errors, Duration</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-sm">Flow Rate</p>
              <h3 className="text-2xl font-bold">{latestData?.metrics?.rate || 0} pkt/s</h3>
            </div>
            <div className={`bg-slate-800/50 p-4 rounded-xl border border-slate-700 ${
              (latestData?.metrics?.errors || 0) > 0 ? 'border-rose-500/50' : ''
            }`}>
              <p className="text-slate-400 text-sm">Error Rate</p>
              <h3 className="text-2xl font-bold">{latestData?.metrics?.errors || 0} err/s</h3>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <p className="text-slate-400 text-sm">Duration (Avg)</p>
              <h3 className="text-2xl font-bold">{latestData?.metrics?.duration?.toFixed(2) || 0} ms</h3>
            </div>
          </div>

          <div className={`bg-rose-500/10 p-4 rounded-xl border border-rose-500/30 ${
            (latestData?.ddos?.probability || 0) > 0.8 ? 'block' : 'hidden'
          }`}>
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <ShieldAlert className="w-5 h-5" />
              <span className="font-bold">DDoS Detected</span>
            </div>
            <p className="text-sm text-rose-400/80">
              High confidence DDoS signature detected. Triggering isolation configuration...
            </p>
          </div>
        </section>

        {/* USE ZONE & Visualizations */}
        <section className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="text-indigo-400 w-5 h-5" />
            <h2 className="text-xl font-semibold">USE Zone</h2>
            <span className="text-xs text-slate-500 ml-auto">Utilization, Saturation, Errors</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Utilization</span>
              </div>
              <h3 className="text-2xl font-bold">{latestData?.metrics?.utilization || 0}%</h3>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <HardDrive className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Saturation</span>
              </div>
              <h3 className="text-2xl font-bold">{latestData?.metrics?.saturation || 0}%</h3>
            </div>
             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <Network className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Node Errors</span>
              </div>
              <h3 className="text-2xl font-bold">0</h3>
            </div>
          </div>

          <Suspense fallback={<div className="h-[400px] bg-slate-800/20 animate-pulse rounded-xl" />}>
            <QoSChart data={data} />
          </Suspense>

          <Suspense fallback={<div className="h-[600px] bg-slate-800/20 animate-pulse rounded-xl" />}>
            <TopologyGraph data={data} />
          </Suspense>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
