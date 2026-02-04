import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

export default function LoginForm() {
  const { enterDashboard } = useAuth();

  return (
    <div className="auth-container">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-text">Chico</span>
            <span className="logo-accent">IA</span>
          </div>
          <h2>Bem-vindo</h2>
          <p>Painel do Afiliado</p>
        </div>

        <button className="auth-submit-btn" onClick={enterDashboard}>
          <LogIn size={18} />
          Entrar
        </button>
      </motion.div>
    </div>
  );
}
