import { motion } from 'framer-motion';
import RetentionTrendChart from './RetentionTrendChart';
import './RetentionOverview.css';

function getRetentionLabel(rate) {
  if (rate >= 85) return { text: 'Excelente', color: '#00FF87' };
  if (rate >= 70) return { text: 'Boa',       color: '#C7FF00' };
  if (rate >= 50) return { text: 'Regular',   color: '#FFA500' };
  return              { text: 'Baixa',      color: '#FF3B3B' };
}

export default function RetentionOverview({ data, loading }) {
  if (loading) {
    return (
      <div className="retention-card loading">
        <div className="loading-spinner" />
      </div>
    );
  }
  if (!data) return null;

  const {
    total_users,
    active_users,
    churned_users,
    retention_rates,
    by_plan,
    upgrade_rate,
    upgrade_paths,
    average_lifetime_days,
    trend,
  } = data;

  const rate30d   = retention_rates['30_days'];
  const rate7d    = retention_rates['7_days'];
  const rate60d   = retention_rates['60_days'];
  const mainLabel = getRetentionLabel(rate30d);

  const periods = [
    { label: '7 dias',  rate: rate7d,  users: Math.round(total_users * rate7d / 100)  },
    { label: '30 dias', rate: rate30d, users: Math.round(total_users * rate30d / 100) },
    { label: '60 dias', rate: rate60d, users: Math.round(total_users * rate60d / 100) },
  ];

  const upgradeTotal = upgrade_paths?.reduce((s, p) => s + p.count, 0) || 0;

  return (
    <motion.div
      className="retention-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      {/* Header */}
      <div className="ret-header">
        <div className="ret-header-left">
          <div className="ret-icon">📊</div>
          <h3>Taxa de Retenção e Qualidade</h3>
        </div>
        <span
          className="ret-header-badge"
          style={{ color: mainLabel.color, borderColor: mainLabel.color }}
        >
          {mainLabel.text}
        </span>
      </div>

      {/* Main retention bar */}
      <div className="ret-main">
        <div className="ret-main-labels">
          <span className="ret-main-title">Usuários Ativos (30 dias)</span>
          <span className="ret-main-count">
            {active_users} de {total_users} usuários
          </span>
        </div>
        <div className="ret-bar-wrap">
          <div className="ret-bar-outer">
            <motion.div
              className="ret-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${rate30d}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <span className="ret-bar-pct" style={{ color: mainLabel.color }}>
            {rate30d}%
          </span>
        </div>
        <div className="ret-churn-note">
          {churned_users > 0 && (
            <span className="ret-churn">
              🔴 {churned_users} usuário{churned_users > 1 ? 's' : ''} com churn
            </span>
          )}
          <span className="ret-lifetime">
            Tempo médio: {average_lifetime_days} dias
          </span>
        </div>
      </div>

      {/* Period breakdown */}
      <div className="ret-periods">
        <h4 className="ret-section-title">Retenção por Período</h4>
        {periods.map((p, idx) => {
          const lbl = getRetentionLabel(p.rate);
          return (
            <div key={p.label} className="ret-period-row">
              <div className="ret-period-left">
                <span className="ret-period-dot" style={{ background: lbl.color }} />
                <span className="ret-period-label">{p.label}</span>
              </div>
              <div className="ret-period-bar-wrap">
                <div className="ret-period-bar-bg">
                  <motion.div
                    className="ret-period-bar-fill"
                    style={{ background: lbl.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.rate}%` }}
                    transition={{ duration: 0.9, delay: 0.5 + idx * 0.1 }}
                  />
                </div>
              </div>
              <span className="ret-period-stat">
                <strong style={{ color: lbl.color }}>{p.rate}%</strong>
                <span className="ret-period-users"> ({p.users} usuários)</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Trend chart */}
      {trend && trend.length > 0 && (
        <RetentionTrendChart data={trend} />
      )}

      {/* Upgrades */}
      {upgradeTotal > 0 && (
        <div className="ret-upgrades">
          <h4 className="ret-section-title">Upgrades de Plano</h4>
          <div className="ret-upgrade-summary">
            <span className="ret-upgrade-count">
              🚀 {upgradeTotal} usuários fizeram upgrade
            </span>
            <span className="ret-upgrade-rate" style={{ color: '#C7FF00' }}>
              {upgrade_rate}% da base
            </span>
          </div>
          <div className="ret-upgrade-paths">
            {upgrade_paths?.filter(p => p.count > 0).map((p, i) => (
              <div key={i} className="ret-upgrade-path">
                <span className="ret-path-from">{p.from}</span>
                <span className="ret-path-arrow">→</span>
                <span className="ret-path-to">{p.to}</span>
                <span className="ret-path-count">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By plan */}
      <div className="ret-by-plan">
        <h4 className="ret-section-title">Retenção por Plano (30 dias)</h4>
        <div className="ret-plan-rows">
          {[
            { key: 'starter', badge: '⭐ Starter', color: '#4A90E2' },
            { key: 'pro',     badge: '💎 Pro',     color: '#C7FF00' },
          ].map(({ key, badge, color }) => {
            const plan = by_plan?.[key];
            if (!plan) return null;
            const lbl = getRetentionLabel(plan.retention_30d);
            return (
              <div key={key} className="ret-plan-row">
                <span className="ret-plan-badge" style={{ color }}>
                  {badge}
                </span>
                <span className="ret-plan-rate" style={{ color: lbl.color }}>
                  {plan.retention_30d}%
                </span>
                <span className="ret-plan-label" style={{ color: lbl.color }}>
                  {lbl.text}
                </span>
                <span className="ret-plan-days">
                  ~{plan.avg_activity_days}d médio
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
