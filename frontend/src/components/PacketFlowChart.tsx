import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { TelemetryData } from '../types/telemetry';

interface PacketFlowChartProps {
  data: TelemetryData[];
}

export default function PacketFlowChart({ data }: PacketFlowChartProps) {
  const options = useMemo(() => {
    const nowMs = Date.now();
    const liveWindow = nowMs - 5 * 60 * 1000;
    const points = data
      .filter((d) => d.timestamp * 1000 >= liveWindow)
      .slice(-25)
      .map((d) => {
      const rate = d.metrics?.rate ?? 0;
      const saturation = d.metrics?.saturation ?? 0;
      const incoming = Math.max(0, rate * (0.55 + saturation / 250));
      const outgoing = Math.max(0, rate * 0.48);
      return {
        time: new Date(d.timestamp * 1000).toLocaleTimeString(),
        incoming: Number(incoming.toFixed(2)),
        outgoing: Number(outgoing.toFixed(2)),
      };
    });

    return {
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: '#94a3b8' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: points.map((p) => p.time),
        axisLabel: { color: '#64748b', rotate: 25 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [
        {
          name: 'Incoming',
          type: 'bar',
          data: points.map((p) => p.incoming),
          itemStyle: { color: '#2dd4bf' },
          emphasis: { itemStyle: { color: '#5eead4' } },
        },
        {
          name: 'Outgoing',
          type: 'bar',
          data: points.map((p) => p.outgoing),
          itemStyle: { color: '#60a5fa' },
          emphasis: { itemStyle: { color: '#93c5fd' } },
        },
      ],
    };
  }, [data]);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 h-[340px]">
      <h3 className="mb-2 text-sm uppercase tracking-[0.2em] text-slate-400">Packet Flow (In/Out)</h3>
      <ReactECharts option={options} style={{ height: '280px', width: '100%' }} notMerge lazyUpdate />
    </div>
  );
}
