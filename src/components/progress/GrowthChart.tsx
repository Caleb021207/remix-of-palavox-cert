import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildGrowthSeries, skillLabel, TYPICAL_GROWTH_PER_WINDOW, type TrendPoint } from '@/lib/growth';

/** Growth over benchmark windows with a typical-growth target line. */
const GrowthChart: React.FC<{ skill: string; points: TrendPoint[] }> = ({ skill, points }) => {
  const data = buildGrowthSeries(points);

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No {skillLabel(skill).toLowerCase()} results yet — complete a practice form to start your trend.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="window" fontSize={12} />
          <YAxis domain={[0, 100]} fontSize={12} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="score"
            name="Practice score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot
          />
          <Line
            type="monotone"
            dataKey="target"
            name={`Typical growth (+${TYPICAL_GROWTH_PER_WINDOW}/window)`}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GrowthChart;
