import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <div className="header-logo">
          <span className="logo-text">Chico</span>
          <span className="logo-accent">IA</span>
        </div>
        <span className="header-divider">|</span>
        <span className="header-subtitle">Painel do Afiliado</span>
      </div>
      <div className="header-right">
        <div className="header-user">
          <div className="header-user-avatar">
            <User size={16} />
          </div>
          <span className="header-user-name">{user?.name || 'Afiliado'}</span>
        </div>
        <button className="header-logout" onClick={logout} title="Sair">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
