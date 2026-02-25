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
import ConversionsByPlan from '../components/Dashboard/ConversionsByPlan';
import PlanDistribution from '../components/Dashboard/PlanDistribution';
import CommissionBreakdown from '../components/Dashboard/CommissionBreakdown';
import CHCMovement from '../components/Dashboard/CHCMovement';
import InstagramConnect from '../components/InstagramConnect';
import { analyticsAPI } from '../services/api';
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
  { id: '1', user_name: 'João S.',    amount: 250.00, status: 'paid',    converted_at: '2026-01-23T14:30:00Z', chc_moved: 25000 },
  { id: '2', user_name: 'Maria L.',   amount: 180.00, status: 'paid',    converted_at: '2026-01-22T10:15:00Z', chc_moved: 18000 },
  { id: '3', user_name: 'Carlos M.',  amount: 320.00, status: 'pending', converted_at: '2026-01-22T08:45:00Z', chc_moved: 15000 },
  { id: '4', user_name: 'Ana P.',     amount: 150.00, status: 'paid',    converted_at: '2026-01-21T16:20:00Z', chc_moved: 7200  },
  { id: '5', user_name: 'Pedro R.',   amount: 410.00, status: 'paid',    converted_at: '2026-01-20T11:00:00Z', chc_moved: 5800  },
  { id: '6', user_name: 'Lucia F.',   amount: 95.00,  status: 'pending', converted_at: '2026-01-19T09:30:00Z', chc_moved: 3100  },
  { id: '7', user_name: 'Roberto G.', amount: 275.00, status: 'paid',    converted_at: '2026-01-18T13:10:00Z', chc_moved: 4400  },
  { id: '8', user_name: 'Fernanda A.',amount: 200.00, status: 'paid',    converted_at: '2026-01-17T15:45:00Z', chc_moved: 2900  },
];

const mockCHCData = {
  total_chc_moved: 450000,
  real_value: 450.00,
  average_per_user: 5172,
  by_type: {
    earned:    { chc: 180000, percentage: 40.0 },
    spent:     { chc: 150000, percentage: 33.3 },
    purchased: { chc:  80000, percentage: 17.8 },
    won:       { chc:  30000, percentage:  6.7 },
    lost:      { chc:  10000, percentage:  2.2 },
  },
  top_users: [
    { username: 'João S.',   chc_moved: 25000 },
    { username: 'Maria L.',  chc_moved: 18000 },
    { username: 'Carlos M.', chc_moved: 15000 },
  ],
  trend: [
    { date: '19/01', chc: 38000 },
    { date: '20/01', chc: 42000 },
    { date: '21/01', chc: 55000 },
    { date: '22/01', chc: 48000 },
    { date: '23/01', chc: 71000 },
    { date: '24/01', chc: 65000 },
    { date: '25/01', chc: 82000 },
  ],
};

export default function DashboardPage() {
  const [metrics] = useState(mockMetrics);
  const [conversions] = useState(mockConversions);
  const [pagination] = useState({ page: 1, totalPages: 1, total: mockConversions.length });
  const [referralCode, setReferralCode] = useState('CHICO_DEMO12345');
  const [referralLink, setReferralLink] = useState('https://chicoai.com.br/ref/CHICO_DEMO12345');
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [planAnalytics, setPlanAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [commissionData, setCommissionData] = useState(null);
  const [commissionLoading, setCommissionLoading] = useState(true);
  const [chcData, setChcData] = useState(null);
  const [chcLoading, setChcLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setAnalyticsLoading(true);
    setCommissionLoading(true);
    setChcLoading(true);

    // Simulate loading for demo
    setTimeout(() => {
      setLoading(false);

      // Mock plan analytics data for demo
      setPlanAnalytics({
        total_conversions: 64,
        total_value: 12450,
        by_plan: {
          free: { count: 0, percentage: 0, total_value: 0 },
          starter: { count: 42, percentage: 65.6, total_value: 4074 },
          pro: { count: 22, percentage: 34.4, total_value: 4334 },
        },
        upgrades: {
          total: 8,
          paths: [
            { from: 'starter', to: 'pro', count: 7 },
            { from: 'free', to: 'starter', count: 1 },
          ],
        },
      });
      setAnalyticsLoading(false);

      // Mock commission data for demo
      setCommissionData({
        totals: {
          paid: 450.50,
          pending: 89.76,
          total: 540.26,
        },
        by_plan: {
          free: {
            conversions: 0,
            commission_paid: 0,
            commission_pending: 0,
            commission_total: 0,
            avg_plan_value: 0,
          },
          starter: {
            conversions: 42,
            commission_paid: 142.16,
            commission_pending: 25.86,
            commission_total: 168.02,
            avg_plan_value: 19.90,
          },
          pro: {
            conversions: 22,
            commission_paid: 308.34,
            commission_pending: 63.90,
            commission_total: 372.24,
            avg_plan_value: 49.90,
          },
        },
        upgrades: {
          count: 7,
          total_commission: 69.86,
        },
        period_days: period,
      });
      setCommissionLoading(false);

      // Mock CHC data (period-aware slight variation for realism)
      const scaleFactor = period === 7 ? 0.25 : period === 90 ? 2.8 : 1;
      setChcData({
        ...mockCHCData,
        total_chc_moved: Math.round(mockCHCData.total_chc_moved * scaleFactor),
        real_value: parseFloat((mockCHCData.real_value * scaleFactor).toFixed(2)),
      });
      setChcLoading(false);
    }, 600);
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

            <div className="dashboard-main-grid">
              <div className="dashboard-left-col">
                <ReferralCard
                  code={referralCode}
                  link={referralLink}
                  onCodeUpdate={handleCodeUpdate}
                />
                {planAnalytics && (
                  <>
                    <ConversionsByPlan data={planAnalytics} loading={analyticsLoading} />
                    {commissionData && (
                      <CommissionBreakdown data={commissionData} loading={commissionLoading} />
                    )}
                    <CHCMovement data={chcData} loading={chcLoading} />
                    <PlanDistribution data={planAnalytics} loading={analyticsLoading} />
                  </>
                )}
              </div>
              <div className="dashboard-right-col">
                <ConversionsTable
                  conversions={conversions}
                  pagination={pagination}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
