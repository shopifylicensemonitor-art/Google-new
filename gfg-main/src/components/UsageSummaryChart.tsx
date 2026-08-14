import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface ChartDataPoint {
  date: string;
  sent: number;
  failed: number;
}

interface UsageSummaryChartProps {
  data: ChartDataPoint[];
}

export function UsageSummaryChart({ data }: UsageSummaryChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={(str) => {
              try {
                return format(parseISO(str), 'MMM d');
              } catch (e) {
                return str;
              }
            }}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelFormatter={(label) => {
              try {
                return format(parseISO(label), 'MMM d, yyyy');
              } catch (e) {
                return label;
              }
            }}
          />
          <Area
            type="monotone"
            dataKey="sent"
            name="Sent Emails"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSent)"
            activeDot={{ r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="failed"
            name="Failed Emails"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorFailed)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
