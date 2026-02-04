import { motion } from 'framer-motion';
import './MetricCard.css';

export default function MetricCard({ title, value, icon: Icon, delay = 0, prefix = '', suffix = '' }) {
  return (
    <motion.div
      className="metric-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="metric-card-header">
        <div className="metric-card-icon">
          <Icon size={20} />
        </div>
        <span className="metric-card-title">{title}</span>
      </div>
      <div className="metric-card-value">
        {prefix}{value}{suffix}
      </div>
    </motion.div>
  );
}
