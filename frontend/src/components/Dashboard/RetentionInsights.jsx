import { motion } from 'framer-motion';
import './RetentionInsights.css';

// Gera insights acionáveis automaticamente com base nos dados de retenção
function generateInsights(retentionData, chcData) {
  const insights = [];
  if (!retentionData) return insights;

  const {
    churned_users,
    total_users,
    retention_rates,
    by_plan,
    upgrade_rate,
  } = retentionData;

  const rate30  = retention_rates?.['30_days'] ?? 0;
  const rate60  = retention_rates?.['60_days'] ?? 0;
  const churnPct = total_users > 0 ? Math.round((churned_users / total_users) * 100) : 0;
  const proRet   = by_plan?.pro?.retention_30d ?? 0;
  const startRet = by_plan?.starter?.retention_30d ?? 0;
  const retDiff  = proRet - startRet;
  const avgCHC   = chcData?.average_per_user ?? 0;

  // Alerta de churn alto
  if (churned_users >= 5) {
    insights.push({
      type: 'warning',
      emoji: '⚠️',
      title: `${churned_users} usuários inativos há 30+ dias`,
      desc: 'Considere uma campanha de reengajamento via WhatsApp ou e-mail.',
    });
  }

  // Queda de retenção entre 30d e 60d
  if (rate30 - rate60 > 20) {
    insights.push({
      type: 'warning',
      emoji: '📉',
      title: 'Retenção cai muito entre 30 e 60 dias',
      desc: `De ${rate30}% para ${rate60}% — foque em criar hábito de uso no 2.º mês.`,
    });
  }

  // Upgrade rate positivo
  if (upgrade_rate >= 20) {
    insights.push({
      type: 'success',
      emoji: '🎉',
      title: `Taxa de upgrade de ${upgrade_rate}% — excelente!`,
      desc: 'Seus usuários estão evoluindo de plano. Continue destacando o plano Pro.',
    });
  }

  // Pro tem muito mais retenção que Starter
  if (retDiff >= 10) {
    insights.push({
      type: 'tip',
      emoji: '📈',
      title: `Usuários Pro têm ${retDiff}% mais retenção`,
      desc: 'Foque em atrair usuários para o plano Pro — eles ficam mais tempo.',
    });
  }

  // CHC alto = engajamento bom
  if (avgCHC >= 5000) {
    insights.push({
      type: 'success',
      emoji: '🪙',
      title: 'CHC médio acima da plataforma',
      desc: 'Seus usuários são muito ativos na plataforma — ótimo sinal de qualidade!',
    });
  }

  // Retenção 30d boa
  if (rate30 >= 80) {
    insights.push({
      type: 'success',
      emoji: '🏆',
      title: `Retenção de ${rate30}% em 30 dias`,
      desc: 'Você está indicando usuários de alta qualidade. Continue assim!',
    });
  }

  // Fallback se tudo estiver bem
  if (insights.length === 0) {
    insights.push({
      type: 'tip',
      emoji: '💡',
      title: 'Dados em construção',
      desc: 'Continue trazendo usuários — seus indicadores serão calculados com mais dados.',
    });
  }

  return insights.slice(0, 4); // máximo 4 insights
}

export default function RetentionInsights({ retentionData, chcData, loading }) {
  if (loading) {
    return (
      <div className="insights-card loading">
        <div className="loading-spinner" />
      </div>
    );
  }
  if (!retentionData) return null;

  const insights = generateInsights(retentionData, chcData);

  return (
    <motion.div
      className="insights-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      <div className="insights-header">
        <div className="insights-icon">💡</div>
        <h3>Insights</h3>
      </div>

      <div className="insights-list">
        {insights.map((ins, i) => (
          <motion.div
            key={i}
            className={`insight-item ${ins.type}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 + i * 0.08 }}
          >
            <span className="insight-emoji">{ins.emoji}</span>
            <div className="insight-body">
              <div className="insight-title">{ins.title}</div>
              <div className="insight-desc">{ins.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
