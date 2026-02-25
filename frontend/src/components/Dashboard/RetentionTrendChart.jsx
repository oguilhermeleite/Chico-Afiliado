import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import './RetentionTrendChart.css';

const LINES = [
  { key: 'ret_7d',  label: '7 dias',  color: '#00FF87' },
  { key: 'ret_30d', label: '30 dias', color: '#FFA500' },
  { key: 'ret_60d', label: '60 dias', color: '#FF3B3B' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="ret-tooltip">
      <span className="ret-tooltip-label">{label}</span>
      {payload.map((p) => (
        <div key={p.dataKey} className="ret-tooltip-row" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <span>{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

const CustomLegend = ({ payload }) => (
  <div className="ret-legend">
    {payload?.map((entry) => (
      <div key={entry.value} className="ret-legend-item">
        <span className="ret-legend-dot" style={{ background: entry.color }} />
        <span className="ret-legend-label">{entry.value}</span>
      </div>
    ))}
  </div>
);

export default function RetentionTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="ret-trend-empty">Sem dados de tendência disponíveis</div>
    );
  }

  return (
    <div className="ret-trend-chart">
      <h4 className="ret-trend-title">Tendência de Retenção</h4>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          {LINES.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
