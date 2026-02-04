import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  CalendarDays,
  Percent,
  Receipt,
} from 'lucide-react';
import Header from '../components/Dashboard/Header';
import MetricCard from '../components/MetricCard/MetricCard';
import ReferralCard from '../components/Dashboard/ReferralCard';
import ConversionsTable from '../components/Dashboard/ConversionsTable';
import InstagramConnect from '../components/InstagramConnect';
import './DashboardPage.css';

const mockMetrics = {
  monthEarnings: 12450.00,
  totalPaying: 87,
  todayConversions: 5,
  weekConversions: 23,
  monthConversions: 64,
  conversionRate: 12.4,
  avgTicket: 194.53,
};

const mockConversions = [
  { id: '1', user_name: 'João S.', amount: 250.00, status: 'paid', converted_at: '2026-01-23T14:30:00Z' },
  { id: '2', user_name: 'Maria L.', amount: 180.00, status: 'paid', converted_at: '2026-01-22T10:15:00Z' },
  { id: '3', user_name: 'Carlos M.', amount: 320.00, status: 'pending', converted_at: '2026-01-22T08:45:00Z' },
  { id: '4', user_name: 'Ana P.', amount: 150.00, status: 'paid', converted_at: '2026-01-21T16:20:00Z' },
  { id: '5', user_name: 'Pedro R.', amount: 410.00, status: 'paid', converted_at: '2026-01-20T11:00:00Z' },
  { id: '6', user_name: 'Lucia F.', amount: 95.00, status: 'pending', converted_at: '2026-01-19T09:30:00Z' },
  { id: '7', user_name: 'Roberto G.', amount: 275.00, status: 'paid', converted_at: '2026-01-18T13:10:00Z' },
  { id: '8', user_name: 'Fernanda A.', amount: 200.00, status: 'paid', converted_at: '2026-01-17T15:45:00Z' },
];

export default function DashboardPage() {
  const [metrics] = useState(mockMetrics);
  const [conversions] = useState(mockConversions);
  const [pagination] = useState({ page: 1, totalPages: 1, total: mockConversions.length });
  const [referralCode, setReferralCode] = useState('CHICO_DEMO12345');
  const [referralLink, setReferralLink] = useState('https://chicoai.com.br/ref/CHICO_DEMO12345');
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 600);
  }, [period]);

  const handlePageChange = () => {};

  const handleCodeUpdate = (newCode, newLink) => {
    setReferralCode(newCode);
    setReferralLink(newLink);
  };

  const formatCurrency = (value) => {
    return (value || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const metricCards = [
    {
      title: 'Ganhos do Mês',
      value: `R$ ${formatCurrency(metrics.monthEarnings)}`,
      icon: DollarSign,
    },
    {
      title: 'Usuários Pagantes',
      value: metrics.totalPaying,
      icon: Users,
    },
    {
      title: 'Conversões Hoje',
      value: metrics.todayConversions,
      icon: TrendingUp,
    },
    {
      title: 'Conversões Esta Semana',
      value: metrics.weekConversions,
      icon: Calendar,
    },
    {
      title: 'Conversões Este Mês',
      value: metrics.monthConversions,
      icon: CalendarDays,
    },
    {
      title: 'Taxa de Conversão',
      value: `${metrics.conversionRate}%`,
      icon: Percent,
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${formatCurrency(metrics.avgTicket)}`,
      icon: Receipt,
    },
  ];

  return (
    <div className="dashboard-layout">
      <Header />

      <main className="dashboard-content">
        <motion.div
          className="period-selector"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="period-label">Período de visualização:</span>
          <div className="period-buttons">
            {[
              { value: 7, label: '7 dias' },
              { value: 30, label: '30 dias' },
              { value: 90, label: '90 dias' },
            ].map((p) => (
              <button
                key={p.value}
                className={`period-btn ${period === p.value ? 'active' : ''}`}
                onClick={() => { setPeriod(p.value); setLoading(true); }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span>Carregando dados...</span>
          </div>
        ) : (
          <>
            <InstagramConnect />

            <div className="metrics-grid">
              {metricCards.map((card, index) => (
                <MetricCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                  delay={index * 0.05}
                />
              ))}
            </div>

            <div className="dashboard-bottom">
              <ReferralCard
                code={referralCode}
                link={referralLink}
                onCodeUpdate={handleCodeUpdate}
              />
              <ConversionsTable
                conversions={conversions}
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
