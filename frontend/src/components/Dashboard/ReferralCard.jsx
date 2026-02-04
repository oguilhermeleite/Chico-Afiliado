import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, Copy, RefreshCw, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { referralAPI } from '../../services/api';
import './ReferralCard.css';

export default function ReferralCard({ code, link, onCodeUpdate }) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const generateNewCode = async () => {
    setGenerating(true);
    try {
      const response = await referralAPI.generateNew();
      onCodeUpdate(response.data.code, response.data.link);
      toast.success('Novo código gerado!');
    } catch {
      toast.error('Erro ao gerar código');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      className="referral-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className="referral-card-header">
        <div className="referral-card-icon">
          <Link2 size={20} />
        </div>
        <h3>Seu Link de Afiliado</h3>
      </div>

      <div className="referral-code-box">
        <span className="referral-code">{code || 'Carregando...'}</span>
      </div>

      <div className="referral-link-box">
        <input
          type="text"
          value={link || ''}
          readOnly
          className="referral-link-input"
        />
        <button
          className="referral-copy-btn"
          onClick={() => copyToClipboard(link)}
          disabled={!link}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>

      <button
        className="referral-generate-btn"
        onClick={generateNewCode}
        disabled={generating}
      >
        <RefreshCw size={16} className={generating ? 'spinning' : ''} />
        {generating ? 'Gerando...' : 'Gerar Novo Código'}
      </button>
    </motion.div>
  );
}
