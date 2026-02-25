import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Package } from 'lucide-react';
import './PlanDistribution.css';

export default function PlanDistribution({ data, loading }) {
  if (loading) {
    return (
      <div className="plan-distribution-card loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  const { by_plan } = data;

  // Preparar dados para o gráfico (excluindo Free se for 0)
  const chartData = [
    { name: 'Starter', value: by_plan.starter.count, color: '#4A90E2' },
    { name: 'Pro', value: by_plan.pro.count, color: '#C7FF00' },
  ].filter(item => item.value > 0);

  const totalPaid = by_plan.starter.count + by_plan.pro.count;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="pd-tooltip">
          <p className="pd-tooltip-label">{payload[0].name}</p>
          <p className="pd-tooltip-value">
            {payload[0].value} conversões ({((payload[0].value / totalPaid) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="plan-distribution-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className="pd-header">
        <div className="pd-header-left">
          <div className="pd-icon">
            <Package size={20} />
          </div>
          <h3>Distribuição de Planos</h3>
        </div>
      </div>

      {totalPaid > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="pd-legend">
            {chartData.map((item, index) => (
              <div key={index} className="pd-legend-item">
                <div className="pd-legend-color" style={{ background: item.color }} />
                <span className="pd-legend-label">{item.name}</span>
                <span className="pd-legend-value">{item.value}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="pd-empty">
          <p>Nenhuma conversão paga no período</p>
        </div>
      )}
    </motion.div>
  );
}
