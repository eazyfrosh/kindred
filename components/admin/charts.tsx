'use client';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money } from '@/lib/brand';

/**
 * Every dashboard chart carries a single measure, so each one uses one hue on a
 * light surface rather than a categorical palette. Two measures never share an
 * axis — donation value and donation count are drawn as separate charts.
 */
const SERIES = '#193be0';
const GRID = '#e4e7ec';
const AXIS_TEXT = '#667085';

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: AXIS_TEXT, fontSize: 11 },
} as const;

const compact = (value: number) =>
  Math.abs(value) >= 1000
    ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
    : String(Math.round(value));

function TooltipBox({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
  formatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[#e4e7ec] bg-white px-2.5 py-1.5 shadow-md">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#667085]">{label}</p>
      <p className="text-sm font-semibold text-[#101828]">{formatter(Number(payload[0].value))}</p>
    </div>
  );
}

export interface Point {
  label: string;
  value: number;
}

export function RevenueChart({
  data,
  currency,
}: {
  data: { label: string; revenue: number }[];
  currency: string;
}) {
  const format = (value: number) => money(value, currency);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity={0.22} />
              <stop offset="100%" stopColor={SERIES} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={24} {...axisProps} />
          <YAxis tickFormatter={compact} width={52} {...axisProps} />
          <Tooltip cursor={{ stroke: GRID }} content={<TooltipBox formatter={format} />} />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Donation revenue"
            stroke={SERIES}
            strokeWidth={2}
            fill="url(#revenueFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumeChart({ data }: { data: { label: string; volume: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
          barCategoryGap={2}
        >
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={24} {...axisProps} />
          <YAxis allowDecimals={false} tickFormatter={compact} width={40} {...axisProps} />
          <Tooltip
            cursor={{ fill: '#f2f4f7' }}
            content={<TooltipBox formatter={(value) => `${value} donations`} />}
          />
          <Bar
            dataKey="volume"
            name="Donations"
            fill={SERIES}
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GrowthChart({ data }: { data: Point[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis allowDecimals={false} tickFormatter={compact} width={40} {...axisProps} />
          <Tooltip
            cursor={{ fill: '#f2f4f7' }}
            content={<TooltipBox formatter={(value) => `${value} new members`} />}
          />
          <Bar
            dataKey="value"
            name="New members"
            fill={SERIES}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Horizontal bars for long category and campaign names. `unit` keeps money and
 * percentage readings honest in the tooltip and the axis.
 */
export function RankedBarChart({
  data,
  unit,
  currency,
}: {
  data: Point[];
  unit: 'money' | 'percent';
  currency?: string;
}) {
  const format = (value: number) =>
    unit === 'money' ? money(value, currency || 'USD') : `${Math.round(value)}% funded`;
  return (
    <div className="w-full" style={{ height: Math.max(160, data.length * 34 + 24) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          barCategoryGap={4}
        >
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value) => (unit === 'money' ? compact(value) : `${value}%`)}
            {...axisProps}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={130}
            tick={{ fill: '#475467', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: '#f2f4f7' }} content={<TooltipBox formatter={format} />} />
          <Bar
            dataKey="value"
            name={unit === 'money' ? 'Total' : 'Funded'}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          >
            {data.map((entry) => (
              <Cell key={entry.label} fill={SERIES} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
