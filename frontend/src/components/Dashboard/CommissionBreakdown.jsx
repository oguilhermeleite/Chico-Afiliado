import { motion } from 'framer-motion';
import { Wallet, TrendingUp } from 'lucide-react';
import './CommissionBreakdown.css';

export default function CommissionBreakdown({ data, loading }) {
  if (loading) {
    return (
      <div className="commission-breakdown-card loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { totals, by_plan, upgrades } = data;

  const formatCurrency = (value) => {
    return parseFloat(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Calculate percentages for visual bars
  const maxCommission = Math.max(
    by_plan.starter.commission_total,
    by_plan.pro.commission_total
  );

  const getPercentage = (value) => {
    if (maxCommission === 0) return 0;
    return ((value / maxCommission) * 100).toFixed(1);
  };

  return (
    <motion.div
      className="commission-breakdown-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className="cb-header">
        <div className="cb-header-left">
          <div className="cb-icon">
            <Wallet size={20} />
          </div>
          <h3>Comissões por Plano</h3>
        </div>
      </div>

      {/* Total Commission Summary */}
      <div className="cb-total-section">
        <div className="cb-total-label">Total de Comissões</div>
        <div className="cb-total-value">{formatCurrency(totals.total)}</div>
        <div className="cb-total-breakdown">
          <div className="cb-status-item paid">
            <span className="cb-status-dot"></span>
            <span className="cb-status-label">Pago:</span>
            <span className="cb-status-value">{formatCurrency(totals.paid)}</span>
          </div>
          <div className="cb-status-item pending">
            <span className="cb-status-dot"></span>
            <span className="cb-status-label">Pendente:</span>
            <span className="cb-status-value">{formatCurrency(totals.pending)}</span>
          </div>
        </div>
      </div>

      {/* By Plan Breakdown */}
      <div className="cb-plans">
        <h4 className="cb-section-title">Breakdown por Plano</h4>

        {/* Starter Plan */}
        <div className="cb-plan-row">
          <div className="cb-plan-header">
            <span className="cb-plan-badge starter">⭐ Starter</span>
            <span className="cb-plan-conversions">
              {by_plan.starter.conversions} conversões
            </span>
          </div>
          <div className="cb-plan-values">
            <div className="cb-value-item">
              <span className="cb-value-label">Comissão Total:</span>
              <span className="cb-value-amount">
                {formatCurrency(by_plan.starter.commission_total)}
              </span>
            </div>
            <div className="cb-value-item small">
              <span className="cb-value-label">
                Pago: {formatCurrency(by_plan.starter.commission_paid)}
              </span>
              <span className="cb-value-label">
                Pendente: {formatCurrency(by_plan.starter.commission_pending)}
              </span>
            </div>
          </div>
          <div className="cb-progress-bar">
            <motion.div
              className="cb-progress-fill starter"
              initial={{ width: 0 }}
              animate={{ width: `${getPercentage(by_plan.starter.commission_total)}%` }}
              transition={{ duration: 1, delay: 0.4 }}
            />
          </div>
        </div>

        {/* Pro Plan */}
        <div className="cb-plan-row">
          <div className="cb-plan-header">
            <span className="cb-plan-badge pro">💎 Pro</span>
            <span className="cb-plan-conversions">
              {by_plan.pro.conversions} conversões
            </span>
          </div>
          <div className="cb-plan-values">
            <div className="cb-value-item">
              <span className="cb-value-label">Comissão Total:</span>
              <span className="cb-value-amount">
                {formatCurrency(by_plan.pro.commission_total)}
              </span>
            </div>
            <div className="cb-value-item small">
              <span className="cb-value-label">
                Pago: {formatCurrency(by_plan.pro.commission_paid)}
              </span>
              <span className="cb-value-label">
                Pendente: {formatCurrency(by_plan.pro.commission_pending)}
              </span>
            </div>
          </div>
          <div className="cb-progress-bar">
            <motion.div
              className="cb-progress-fill pro"
              initial={{ width: 0 }}
              animate={{ width: `${getPercentage(by_plan.pro.commission_total)}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Upgrade Insight */}
      {upgrades && upgrades.count > 0 && (
        <div className="cb-upgrades-insight">
          <TrendingUp size={16} />
          <span>
            {upgrades.count} upgrade{upgrades.count > 1 ? 's' : ''} geraram{' '}
            {formatCurrency(upgrades.total_commission)} em comissões
          </span>
        </div>
      )}
    </motion.div>
  );
}
