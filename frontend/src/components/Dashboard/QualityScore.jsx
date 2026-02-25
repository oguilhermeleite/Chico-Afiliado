import { motion } from 'framer-motion';
import './QualityScore.css';

// Benchmarks máximos para normalização de cada fator
const BENCHMARKS = {
  retention30d:  100,
  upgradeRate:   30,
  chcAvg:        5000,
  ticketAvg:     200,
  retention60d:  100,
};

// Pesos (somam 100)
const WEIGHTS = {
  retention30d: 0.30,
  upgradeRate:  0.25,
  chcAvg:       0.20,
  ticketAvg:    0.15,
  retention60d: 0.10,
};

function normalize(value, max) {
  return Math.min(value / max, 1);
}

function calcScore({ retention30d, upgradeRate, chcAvg, ticketAvg, retention60d }) {
  const raw =
    normalize(retention30d, BENCHMARKS.retention30d) * WEIGHTS.retention30d * 10 +
    normalize(upgradeRate,  BENCHMARKS.upgradeRate)  * WEIGHTS.upgradeRate  * 10 +
    normalize(chcAvg,       BENCHMARKS.chcAvg)       * WEIGHTS.chcAvg       * 10 +
    normalize(ticketAvg,    BENCHMARKS.ticketAvg)    * WEIGHTS.ticketAvg    * 10 +
    normalize(retention60d, BENCHMARKS.retention60d) * WEIGHTS.retention60d * 10;
  return Math.round(raw * 10) / 10; // 1 decimal
}

function getRating(score) {
  if (score >= 9.0) return { stars: 5, label: 'Excepcional', color: '#C7FF00' };
  if (score >= 7.5) return { stars: 4, label: 'Excelente',   color: '#00FF87' };
  if (score >= 6.0) return { stars: 3, label: 'Boa',         color: '#FFA500' };
  if (score >= 4.0) return { stars: 2, label: 'Regular',     color: '#F59E0B' };
  return                   { stars: 1, label: 'Baixa',       color: '#EF4444' };
}

function getFactorStatus(value, benchmark, high = 80, mid = 60) {
  const pct = (value / benchmark) * 100;
  if (pct >= high) return { icon: '✅', color: '#00FF87' };
  if (pct >= mid)  return { icon: '⚠️', color: '#FFA500' };
  return                  { icon: '❌', color: '#FF3B3B' };
}

export default function QualityScore({ retentionData, chcData, metrics, loading }) {
  if (loading) {
    return (
      <div className="qs-card loading">
        <div className="loading-spinner" />
      </div>
    );
  }
  if (!retentionData || !chcData || !metrics) return null;

  const retention30d = retentionData.retention_rates?.['30_days'] ?? 0;
  const retention60d = retentionData.retention_rates?.['60_days'] ?? 0;
  const upgradeRate  = retentionData.upgrade_rate ?? 0;
  const chcAvg       = chcData.average_per_user ?? 0;
  const ticketAvg    = metrics.avgTicket ?? 0;

  const score  = calcScore({ retention30d, upgradeRate, chcAvg, ticketAvg, retention60d });
  const rating = getRating(score);

  const factors = [
    {
      label:     'Retenção 30 dias',
      value:     `${retention30d}%`,
      ...getFactorStatus(retention30d, 100, 70, 50),
      qualifier: retention30d >= 80 ? 'Excelente' : retention30d >= 65 ? 'Boa' : 'Regular',
    },
    {
      label:     'Taxa de Upgrade',
      value:     `${upgradeRate}%`,
      ...getFactorStatus(upgradeRate, 30, 60, 33),
      qualifier: upgradeRate >= 20 ? 'Excelente' : upgradeRate >= 10 ? 'Boa' : 'Regular',
    },
    {
      label:     'CHC Médio',
      value:     `${chcAvg.toLocaleString('pt-BR')} CHC`,
      ...getFactorStatus(chcAvg, 5000, 80, 40),
      qualifier: chcAvg >= 5000 ? 'Alto' : chcAvg >= 2500 ? 'Médio' : 'Baixo',
    },
    {
      label:     'Ticket Médio',
      value:     ticketAvg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      ...getFactorStatus(ticketAvg, 200, 80, 50),
      qualifier: ticketAvg >= 180 ? 'Bom' : ticketAvg >= 100 ? 'Regular' : 'Baixo',
    },
    {
      label:     'Retenção 60 dias',
      value:     `${retention60d}%`,
      ...getFactorStatus(retention60d, 100, 65, 45),
      qualifier: retention60d >= 70 ? 'Boa' : retention60d >= 50 ? 'Regular' : 'Baixa',
    },
  ];

  return (
    <motion.div
      className="qs-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
    >
      {/* Header */}
      <div className="qs-header">
        <div className="qs-header-left">
          <div className="qs-icon">⭐</div>
          <h3>Score de Qualidade</h3>
        </div>
        <div className="qs-stars">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ opacity: i < rating.stars ? 1 : 0.2 }}>⭐</span>
          ))}
        </div>
      </div>

      {/* Big score */}
      <div className="qs-score-section">
        <motion.div
          className="qs-score-number"
          style={{ color: rating.color }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {score}
          <span className="qs-score-max">/10</span>
        </motion.div>
        <div className="qs-score-label" style={{ color: rating.color }}>
          {rating.label}
        </div>
        <div className="qs-score-desc">
          {score >= 7.5
            ? 'Suas conversões são de alta qualidade!'
            : score >= 6.0
            ? 'Conversões com boa qualidade, há espaço para crescer.'
            : 'Foque em melhorar a retenção e engajamento.'}
        </div>
      </div>

      {/* Score bar */}
      <div className="qs-bar-wrap">
        <div className="qs-bar-bg">
          <motion.div
            className="qs-bar-fill"
            style={{ background: rating.color }}
            initial={{ width: 0 }}
            animate={{ width: `${score * 10}%` }}
            transition={{ duration: 1, delay: 0.55 }}
          />
        </div>
        <div className="qs-bar-ticks">
          {[0, 4, 6, 7.5, 9, 10].map((t) => (
            <span
              key={t}
              className="qs-tick"
              style={{ left: `${t * 10}%` }}
            />
          ))}
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="qs-factors">
        <h4 className="qs-section-title">Fatores de Qualidade</h4>
        {factors.map((f, i) => (
          <motion.div
            key={f.label}
            className="qs-factor-row"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 + i * 0.06 }}
          >
            <span className="qs-factor-icon">{f.icon}</span>
            <span className="qs-factor-label">{f.label}:</span>
            <span className="qs-factor-value" style={{ color: f.color }}>
              {f.value}
            </span>
            <span className="qs-factor-qualifier" style={{ color: f.color }}>
              ({f.qualifier})
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
