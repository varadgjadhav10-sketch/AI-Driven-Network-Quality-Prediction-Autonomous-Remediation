import { animate, useMotionValue } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedMetricProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function AnimatedMetric({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedMetricProps) {
  const motionValue = useMotionValue(value);
  const [display, setDisplay] = useState(value.toFixed(decimals));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.75,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(latest.toFixed(decimals)),
    });

    return () => controls.stop();
  }, [decimals, motionValue, value]);

  return <span className={className}>{`${prefix}${display}${suffix}`}</span>;
}
