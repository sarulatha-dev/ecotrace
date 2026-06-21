import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  value: number;
  max: number;
  color: string;
  size?: number;
  thickness?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max,
  color,
  size = 80,
  thickness = 8,
}) => {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = max > 0 ? Math.min(value / max, 1) : 0;

  return (
    <svg width={size} height={size} className={cn('relative -rotate-90')}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={thickness}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * (1 - percent) }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="text-sm font-bold fill-gray-800 dark:fill-white"
      >
        {Math.round(value)}
      </text>
    </svg>
  );
};
