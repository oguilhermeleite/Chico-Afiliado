import { motion } from 'framer-motion';
import { Table, ChevronLeft, ChevronRight } from 'lucide-react';
import './ConversionsTable.css';

const CHC_HIGH_COLOR = '#00FF87';
const CHC_MED_COLOR  = '#FFA500';
const CHC_LOW_COLOR  = '#B8B8B8';

function getActivityStatus(daysSince) {
  if (daysSince === undefined || daysSince === null) return null;
  if (daysSince < 7)  return { emoji: '🟢', label: 'Ativo',   days: daysSince, color: '#00FF87' };
  if (daysSince < 30) return { emoji: '🟡', label: 'Inativo', days: daysSince, color: '#FFA500' };
  return                     { emoji: '🔴', label: 'Churned', days: daysSince, color: '#FF3B3B' };
}

function getCHCColor(chcMoved) {
  if (!chcMoved) return CHC_LOW_COLOR;
  if (chcMoved > 10000) return CHC_HIGH_COLOR;
  if (chcMoved >= 5000) return CHC_MED_COLOR;
  return CHC_LOW_COLOR;
}

function formatCHCShort(chcMoved) {
  if (!chcMoved) return '—';
  return chcMoved.toLocaleString('pt-BR') + ' CHC';
}

export default function ConversionsTable({ conversions, pagination, onPageChange }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value) => {
    return parseFloat(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <motion.div
      className="conversions-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <div className="conversions-header">
        <div className="conversions-header-left">
          <div className="conversions-icon">
            <Table size={20} />
          </div>
          <h3>Histórico de Conversões</h3>
        </div>
        <span className="conversions-total">
          {pagination?.total || 0} registros
        </span>
      </div>

      <div className="conversions-table-wrapper">
        <table className="conversions-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Usuário</th>
              <th>Plano</th>
              <th>🪙 CHC Movimentado</th>
              <th>Atividade</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {conversions.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-row">
                  Nenhuma conversão encontrada
                </td>
              </tr>
            ) : (
              conversions.map((conversion) => {
                const activity = getActivityStatus(conversion.days_since_activity);
                return (
                  <tr key={conversion.id}>
                    <td>{formatDate(conversion.converted_at)}</td>
                    <td>{conversion.user_name || conversion.user_id?.substring(0, 8) || '—'}</td>
                    <td>
                      <span className={`plan-badge ${conversion.plan_type || 'starter'}`}>
                        {conversion.plan_type === 'free' && '🆓 Free'}
                        {conversion.plan_type === 'starter' && '⭐ Starter'}
                        {conversion.plan_type === 'pro' && '💎 Pro'}
                        {!conversion.plan_type && '⭐ Starter'}
                      </span>
                    </td>
                    <td
                      className="chc-moved-cell"
                      style={{ color: getCHCColor(conversion.chc_moved), fontWeight: 600 }}
                    >
                      {formatCHCShort(conversion.chc_moved)}
                    </td>
                    <td className="activity-cell">
                      {activity ? (
                        <span
                          className="activity-badge"
                          style={{ color: activity.color, borderColor: `${activity.color}40` }}
                        >
                          {activity.emoji} {activity.label}
                          <span className="activity-days"> ({activity.days}d)</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="amount">{formatCurrency(conversion.amount)}</td>
                    <td>
                      <span className={`status-badge ${conversion.status}`}>
                        {conversion.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="conversions-pagination">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pagination-info">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
