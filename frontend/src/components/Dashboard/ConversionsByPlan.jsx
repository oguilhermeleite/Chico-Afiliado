import { motion } from 'framer-motion';
import { TrendingUp, ArrowUpRight } from 'lucide-react';
import './ConversionsByPlan.css';

export default function ConversionsByPlan({ data, loading }) {
  if (loading) {
    return (
      <div className="conversions-by-plan-card loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  const { by_plan, upgrades } = data;

  // Calculate upgrade paths for visual display
  const upgradeJourneys = [
    { from: 'free', to: 'starter', label: 'Free → Starter', count: 0 },
    { from: 'starter', to: 'pro', label: 'Starter → Pro', count: 0 },
    { from: 'free', to: 'pro', label: 'Free → Pro', count: 0 },
  ];

  upgrades.paths.forEach(path => {
    const journey = upgradeJourneys.find(j => j.from === path.from && j.to === path.to);
    if (journey) journey.count = path.count;
  });

  return (
    <motion.div
      className="conversions-by-plan-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="cbp-header">
        <div className="cbp-header-left">
          <div className="cbp-icon">
            <TrendingUp size={20} />
          </div>
          <h3>Conversões por Plano</h3>
        </div>
        <span className="cbp-total">
          {upgrades.total} upgrades
        </span>
      </div>

      <div className="cbp-plans">
        {/* Starter Plan */}
        <div className="cbp-plan-row">
          <div className="cbp-plan-info">
            <span className="cbp-plan-badge starter">⭐ Starter</span>
            <span className="cbp-plan-count">{by_plan.starter.count} conversões</span>
          </div>
          <div className="cbp-progress-wrapper">
            <div className="cbp-progress-bar">
              <motion.div
                className="cbp-progress-fill starter"
                initial={{ width: 0 }}
                animate={{ width: `${by_plan.starter.percentage}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
            <span className="cbp-percentage">{by_plan.starter.percentage}%</span>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="cbp-plan-row">
          <div className="cbp-plan-info">
            <span className="cbp-plan-badge pro">💎 Pro</span>
            <span className="cbp-plan-count">{by_plan.pro.count} conversões</span>
          </div>
          <div className="cbp-progress-wrapper">
            <div className="cbp-progress-bar">
              <motion.div
                className="cbp-progress-fill pro"
                initial={{ width: 0 }}
                animate={{ width: `${by_plan.pro.percentage}%` }}
                transition={{ duration: 1, delay: 0.4 }}
              />
            </div>
            <span className="cbp-percentage">{by_plan.pro.percentage}%</span>
          </div>
        </div>
      </div>

      {upgrades.total > 0 && (
        <div className="cbp-upgrades">
          <h4 className="cbp-upgrades-title">Caminhos de Upgrade</h4>
          <div className="cbp-upgrade-paths">
            {upgradeJourneys.filter(j => j.count > 0).map((journey, idx) => (
              <div key={idx} className="cbp-upgrade-path">
                <ArrowUpRight size={14} />
                <span>{journey.label}</span>
                <span className="cbp-upgrade-count">{journey.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
