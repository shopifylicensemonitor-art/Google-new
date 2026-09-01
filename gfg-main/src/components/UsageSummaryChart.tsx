import React from 'react';
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
  label?: string;
  sent: number;
  failed: number;
  opened?: number;
}

interface UsageSummaryChartProps {
  data: ChartDataPoint[];
  isHourly?: boolean;
}

export function UsageSummaryChart({ data, isHourly = false }: UsageSummaryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[260px] flex items-center justify-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/60">
        No email activity recorded for this timeframe.
      </div>
    );
  }

  return (
    <div className="w-full h-[280px] sm:h-[320px] mt-2 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#635bff" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#635bff" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
          <XAxis
            dataKey="date"
            tickFormatter={(str, idx) => {
              const item = data[idx];
              if (item?.label) return item.label;
              try {
                if (isHourly || (str && str.includes(':'))) {
                  return format(parseISO(str), 'HH:mm');
                }
                return format(parseISO(str), 'MMM d');
              } catch (error) { void error;
                return str;
              }
            }}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              let displayTime = label;
              try {
                if (isHourly || (label && label.includes(':'))) {
                  displayTime = format(parseISO(label), 'MMM d, h:mm a');
                } else {
                  displayTime = format(parseISO(label), 'EEEE, MMM d, yyyy');
                }
              } catch (error) { void error; }

              return (
                <div className="bg-popover/95 backdrop-blur-md border border-border/80 shadow-xl rounded-xl p-3 text-xs space-y-1.5 min-w-[170px] animate-in fade-in zoom-in-95 duration-100">
                  <p className="font-heading font-bold text-foreground text-[11px] pb-1 border-b border-border/50">
                    {displayTime}
                  </p>
                  <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                      <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground font-medium">{entry.name}:</span>
                        </div>
                        <span className="font-mono font-bold text-foreground">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="sent"
            name="Sent Emails"
            stroke="#635bff"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorSent)"
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
          />
          <Area
            type="monotone"
            dataKey="opened"
            name="Opened Emails"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorOpened)"
            activeDot={{ r: 4, strokeWidth: 1.5, stroke: '#fff' }}
          />
          <Area
            type="monotone"
            dataKey="failed"
            name="Failed / Bounced"
            stroke="#ef4444"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#colorFailed)"
            activeDot={{ r: 3.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

