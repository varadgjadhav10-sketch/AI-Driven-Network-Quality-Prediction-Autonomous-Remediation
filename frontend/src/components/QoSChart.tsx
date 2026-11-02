import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { TelemetryData } from '../types/telemetry';

interface QoSChartProps {
  data: TelemetryData[];
}

const QoSChart: React.FC<QoSChartProps> = ({ data }) => {
  const options = useMemo(() => {
    const nowMs = Date.now();
    const windowStartMs = nowMs - 5 * 60 * 1000;
    const liveData = data.filter((d) => d.timestamp * 1000 >= windowStartMs);

    // Separate historical and forecast data for visualization
    const historical = liveData.map((d) => [d.timestamp * 1000, d.metrics?.duration || 0]);
    const forecastMean = liveData.map((d) => [d.timestamp * 1000, d.qos?.mu || 0]);
    const upperConfidence = liveData.map((d) => [d.timestamp * 1000, (d.qos?.mu || 0) + (d.qos?.sigma || 0) * 1.96]);
    const lowerConfidence = liveData.map((d) => [d.timestamp * 1000, (d.qos?.mu || 0) - (d.qos?.sigma || 0) * 1.96]);

    return {
      title: {
        text: 'QoS Prediction (Latency/Duration)',
        textStyle: { color: '#94a3b8' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { show: false },
        min: windowStartMs,
        max: nowMs,
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      series: [
        {
          name: 'Historical Duration',
          type: 'line',
          data: historical,
          showSymbol: false,
          lineStyle: { color: '#38bdf8', width: 2 }, // sky-400
        },
        {
          name: 'BR-LSTM Forecast',
          type: 'line',
          data: forecastMean,
          showSymbol: false,
          lineStyle: { type: 'dotted', color: '#fb7185', width: 2 }, // rose-400
        },
        {
          name: 'Uncertainty Bounds',
          type: 'line',
          data: upperConfidence,
          lineStyle: { opacity: 0 },
          stack: 'confidence',
          symbol: 'none'
        },
        {
          name: 'Uncertainty Area',
          type: 'line',
          data: lowerConfidence,
          lineStyle: { opacity: 0 },
          stack: 'confidence',
          areaStyle: {
            color: 'rgba(251, 113, 133, 0.2)' // rose-400 with opacity
          },
          symbol: 'none'
        }
      ]
    };
  }, [data]);

  return (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 h-[400px]">
      <ReactECharts 
        option={options} 
        style={{ height: '100%', width: '100%' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};

export default React.memo(QoSChart);
