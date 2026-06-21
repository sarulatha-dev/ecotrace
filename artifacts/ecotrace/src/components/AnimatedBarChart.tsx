import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DataItem {
  category: string;
  value: number;
}

interface AnimatedBarChartProps {
  data: DataItem[];
  color: string;
  maxValue?: number;
}

export const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({ data, color, maxValue }) => {
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="category" hide />
        <YAxis hide domain={[0, max]} />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{ background: '#06140e', border: '1px solid #064e3b', color: '#fff' }}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <motion.rect
              key={`bar-${index}`}
              initial={{ height: 0 }}
              animate={{ height: `${(entry.value / max) * 100}%` }}
              transition={{ duration: 1, delay: index * 0.15 }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
