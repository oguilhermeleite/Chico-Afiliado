import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, Link2, Users, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import './InstagramConnect.css';

export default function InstagramConnect() {
  const [instagram, setInstagram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    checkInstagramStatus();
    handleURLParams();
  }, []);

  const handleURLParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const instagramStatus = urlParams.get('instagram');
    const error = urlParams.get('error');

    if (instagramStatus === 'connected') {
      toast.success('Instagram conectado com sucesso!');
      // Limpar parâmetros da URL
      window.history.replaceState({}, document.title, window.location.pathname);
      checkInstagramStatus();
    }

    if (error) {
      const errorMessages = {
        'no_instagram_business': 'Sua conta não possui Instagram Business vinculado a uma Página do Facebook.',
        'session_expired': 'Sessão expirada. Por favor, tente novamente.',
        'invalid_token': 'Token inválido. Faça login novamente.',
        'instagram_failed': 'Erro ao conectar Instagram. Tente novamente.',
        'facebook_failed': 'Erro na autenticação com Facebook.',
      };
      toast.error(errorMessages[error] || 'Erro ao conectar Instagram.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const checkInstagramStatus = async () => {
    try {
      // Verificar se tem token real (não é modo demo)
      const token = localStorage.getItem('chicoai_token');
      if (!token) {
        // Modo demo - não fazer chamada API
        setLoading(false);
        return;
      }

      const response = await api.get('/auth/instagram/status');
      setInstagram(response.data.connected ? response.data.instagram : null);
    } catch (error) {
      // Ignorar erro 401 silenciosamente (usuário demo)
      if (error.response?.status !== 401) {
        console.error('Erro ao verificar status do Instagram:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    const token = localStorage.getItem('chicoai_token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    // Redirecionar para o endpoint do Facebook OAuth com o token
    window.location.href = `${apiUrl}/auth/facebook?token=${token}`;
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar seu Instagram?')) return;

    setDisconnecting(true);
    try {
      await api.post('/auth/instagram/disconnect');
      setInstagram(null);
      toast.success('Instagram desconectado com sucesso');
    } catch (error) {
      toast.error('Erro ao desconectar Instagram');
      console.error('Erro ao desconectar:', error);
    } finally {
      setDisconnecting(false);
    }
  };

  const formatFollowers = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <motion.div
        className="instagram-card instagram-loading"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Loader2 className="loading-icon" />
        <span>Verificando Instagram...</span>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!instagram ? (
        <motion.div
          key="connect"
          className="instagram-card instagram-connect"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="instagram-header">
            <div className="instagram-icon-wrapper">
              <Instagram className="instagram-icon" />
            </div>
            <div className="instagram-header-text">
              <h3>Conectar Instagram</h3>
              <p>Conecte sua conta Instagram Business para exibir seu perfil no painel</p>
            </div>
          </div>

          <div className="instagram-requirements">
            <div className="requirement-item">
              <CheckCircle2 className="requirement-icon" />
              <span>Conta Instagram Business ou Creator</span>
            </div>
            <div className="requirement-item">
              <CheckCircle2 className="requirement-icon" />
              <span>Exiba seu perfil e seguidores no painel</span>
            </div>
            <div className="requirement-item">
              <AlertCircle className="requirement-icon warning" />
              <span>Contas pessoais não são suportadas</span>
            </div>
          </div>

          <button
            onClick={handleConnect}
            className="btn-connect-instagram"
            disabled={connecting}
          >
            {connecting ? (
              <>
                <Loader2 className="btn-icon spinning" />
                Conectando...
              </>
            ) : (
              <>
                <Instagram className="btn-icon" />
                Conectar Instagram
              </>
            )}
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="profile"
          className="instagram-card instagram-profile"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="profile-header">
            <div className="profile-picture-wrapper">
              {instagram.profile_picture ? (
                <img
                  src={instagram.profile_picture}
                  alt={instagram.username}
                  className="profile-picture"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="profile-picture-fallback" style={{ display: instagram.profile_picture ? 'none' : 'flex' }}>
                <Instagram />
              </div>
              <div className="profile-badge">
                <CheckCircle2 />
              </div>
            </div>

            <div className="profile-info">
              <h3>@{instagram.username}</h3>
              <div className="profile-stats">
                <div className="stat-item">
                  <Users className="stat-icon" />
                  <span className="stat-value">{formatFollowers(instagram.followers)}</span>
                  <span className="stat-label">seguidores</span>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <a
                href={`https://instagram.com/${instagram.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-view-profile"
              >
                <Link2 />
                Ver perfil
              </a>
              <button
                onClick={handleDisconnect}
                className="btn-disconnect"
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="spinning" />
                ) : (
                  'Desconectar'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
