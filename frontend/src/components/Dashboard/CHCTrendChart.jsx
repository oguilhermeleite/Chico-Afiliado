import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import './CHCTrendChart.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const chc = payload[0].value;
  return (
    <div className="chc-tooltip">
      <span className="chc-tooltip-date">{label}</span>
      <span className="chc-tooltip-value">
        🪙 {chc.toLocaleString('pt-BR')} CHC
      </span>
    </div>
  );
};

const formatYAxis = (value) => {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value;
};

export default function CHCTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chc-trend-empty">
        <span>Sem dados de tendência no período</span>
      </div>
    );
  }

  return (
    <div className="chc-trend-chart">
      <h4 className="chc-trend-title">Tendência de Movimentação</h4>
      <div className="chc-trend-wrapper">
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="chcGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#C7FF00" />
                <stop offset="100%" stopColor="#00FF87" />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="chc"
              stroke="url(#chcGradient)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#C7FF00', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
