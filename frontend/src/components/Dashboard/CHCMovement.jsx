import { motion } from 'framer-motion';
import CHCTrendChart from './CHCTrendChart';
import './CHCMovement.css';

// Formata CHC com separador de milhar
function formatCHC(chc) {
  return chc.toLocaleString('pt-BR') + ' CHC';
}

// Converte CHC para reais: 1000 CHC = R$ 1,00
function formatRealFromCHC(chc) {
  return (chc / 1000).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Retorna rating de engajamento baseado na média de CHC por usuário
function getEngagementRating(avgCHC) {
  if (avgCHC > 5000) return { stars: 5, label: 'Excelente', color: '#C7FF00' };
  if (avgCHC > 3500) return { stars: 4, label: 'Muito Bom', color: '#00FF87' };
  if (avgCHC > 2000) return { stars: 3, label: 'Bom', color: '#FFA500' };
  if (avgCHC > 1000) return { stars: 2, label: 'Regular', color: '#F59E0B' };
  return { stars: 1, label: 'Baixo', color: '#EF4444' };
}

const PLATFORM_AVG_CHC = 3500;

const TYPE_CONFIG = {
  earned: { label: 'Ganhos', emoji: '📈' },
  spent:  { label: 'Gastos', emoji: '💸' },
  purchased: { label: 'Compras', emoji: '🛒' },
  won:    { label: 'Vitórias', emoji: '🎯' },
  lost:   { label: 'Perdas', emoji: '❌' },
};

const CHC_HIGH_COLOR  = '#00FF87';
const CHC_MED_COLOR   = '#FFA500';
const CHC_LOW_COLOR   = '#B8B8B8';

function getCHCColor(chcMoved) {
  if (chcMoved > 10000) return CHC_HIGH_COLOR;
  if (chcMoved >= 5000) return CHC_MED_COLOR;
  return CHC_LOW_COLOR;
}

export default function CHCMovement({ data, loading }) {
  if (loading) {
    return (
      <div className="chc-card loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!data) return null;

  const {
    total_chc_moved,
    average_per_user,
    by_type,
    top_users,
    trend,
  } = data;

  const rating = getEngagementRating(average_per_user);
  const abovePlatformAvg = average_per_user > PLATFORM_AVG_CHC;

  return (
    <motion.div
      className="chc-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
    >
      {/* Header */}
      <div className="chc-header">
        <div className="chc-header-left">
          <div className="chc-icon">🪙</div>
          <h3>CHC Movimentado pelos Seus Usuários</h3>
        </div>
        <div className="chc-badge-tooltip" title="CHC (Chico Coin) é a moeda virtual da plataforma. Alta movimentação indica usuários engajados e ativos. 1000 CHC = R$ 1,00">
          <span className="chc-info-icon">ℹ</span>
        </div>
      </div>

      {/* Total + Average */}
      <div className="chc-summary">
        <div className="chc-summary-main">
          <span className="chc-summary-label">Total Movimentado</span>
          <div className="chc-summary-value">
            🪙 {formatCHC(total_chc_moved)}
          </div>
          <div className="chc-summary-real">
            {formatRealFromCHC(total_chc_moved)}
          </div>
        </div>
        <div className="chc-summary-divider" />
        <div className="chc-summary-avg">
          <span className="chc-summary-label">Média por Usuário</span>
          <div className="chc-avg-value">
            {formatCHC(average_per_user)}
          </div>
        </div>
      </div>

      {/* Breakdown por tipo */}
      <div className="chc-breakdown">
        <h4 className="chc-section-title">Breakdown por Tipo</h4>
        {Object.entries(by_type).map(([type, info], idx) => (
          <div key={type} className="chc-type-row">
            <div className="chc-type-left">
              <span className="chc-type-emoji">{TYPE_CONFIG[type]?.emoji}</span>
              <span className="chc-type-label">{TYPE_CONFIG[type]?.label}</span>
            </div>
            <div className="chc-type-right">
              <div className="chc-type-bar-wrap">
                <motion.div
                  className="chc-type-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${info.percentage}%` }}
                  transition={{ duration: 0.9, delay: 0.4 + idx * 0.08 }}
                />
              </div>
              <span className="chc-type-stat">
                {formatCHC(info.chc)}
                <span className="chc-type-pct"> ({info.percentage}%)</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      {trend && trend.length > 0 && (
        <CHCTrendChart data={trend} />
      )}

      {/* Top usuários */}
      {top_users && top_users.length > 0 && (
        <div className="chc-top-users">
          <h4 className="chc-section-title">Top Usuários por Movimentação</h4>
          <div className="chc-top-list">
            {top_users.slice(0, 3).map((user, idx) => (
              <div key={idx} className="chc-top-row">
                <div className="chc-top-rank">
                  {idx === 0 && '🥇'}
                  {idx === 1 && '🥈'}
                  {idx === 2 && '🥉'}
                </div>
                <span className="chc-top-name">{user.username || user.user_id?.substring(0, 8)}</span>
                <span
                  className="chc-top-amount"
                  style={{ color: getCHCColor(user.chc_moved) }}
                >
                  {formatCHC(user.chc_moved)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicador de qualidade de engajamento */}
      <div className="chc-engagement">
        <div className="chc-engagement-header">
          <span className="chc-section-title">Qualidade de Engajamento</span>
          <div className="chc-stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className="chc-star"
                style={{ opacity: i < rating.stars ? 1 : 0.2 }}
              >
                ⭐
              </span>
            ))}
          </div>
        </div>
        <div
          className="chc-engagement-label"
          style={{ color: rating.color }}
        >
          {rating.label}
        </div>
        <div className="chc-engagement-desc">
          Usuários {abovePlatformAvg ? 'muito ativos e engajados' : 'com engajamento a desenvolver'}
        </div>
        <div className="chc-engagement-compare">
          <span className="chc-engagement-mine">
            Sua média: {formatCHC(average_per_user)}/usuário
          </span>
          <span className="chc-engagement-platform">
            Média da plataforma: {formatCHC(PLATFORM_AVG_CHC)}
          </span>
        </div>
        {abovePlatformAvg && (
          <div className="chc-engagement-above">
            ↑ Acima da média da plataforma
          </div>
        )}
      </div>
    </motion.div>
  );
}
