import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { TelemetryData } from '../types/telemetry';

interface TrafficPulseChartProps {
  data: TelemetryData[];
}

export default function TrafficPulseChart({ data }: TrafficPulseChartProps) {
  const options = useMemo(() => {
    const nowMs = Date.now();
    const windowStartMs = nowMs - 5 * 60 * 1000;
    const liveData = data.filter((d) => d.timestamp * 1000 >= windowStartMs);

    const traffic = liveData.map((d) => [d.timestamp * 1000, d.metrics?.rate ?? 0]);
    const utilization = liveData.map((d) => [d.timestamp * 1000, d.metrics?.utilization ?? 0]);

    return {
      tooltip: { trigger: 'axis' },
      legend: {
        textStyle: { color: '#94a3b8' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '6%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#334155' } },
        min: windowStartMs,
        max: nowMs,
      },
      yAxis: [
        {
          type: 'value',
          name: 'pkt/s',
          nameTextStyle: { color: '#94a3b8' },
          axisLine: { lineStyle: { color: '#334155' } },
          splitLine: { lineStyle: { color: '#1e293b' } },
        },
        {
          type: 'value',
          name: 'Utilization %',
          nameTextStyle: { color: '#94a3b8' },
          axisLine: { lineStyle: { color: '#334155' } },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Traffic Rate',
          type: 'line',
          smooth: true,
          yAxisIndex: 0,
          showSymbol: false,
          data: traffic,
          lineStyle: { width: 2, color: '#22d3ee' },
          areaStyle: { color: 'rgba(34,211,238,0.14)' },
        },
        {
          name: 'Utilization',
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          showSymbol: false,
          data: utilization,
          lineStyle: { width: 2, type: 'dashed', color: '#818cf8' },
        },
      ],
    };
  }, [data]);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 h-[340px]">
      <h3 className="mb-2 text-sm uppercase tracking-[0.2em] text-slate-400">Live IPFIX / NetFlow Ingestion</h3>
      <ReactECharts option={options} style={{ height: '280px', width: '100%' }} notMerge lazyUpdate />
    </div>
  );
}
