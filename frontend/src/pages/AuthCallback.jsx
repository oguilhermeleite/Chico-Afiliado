import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Erro na autenticação com Google');
      navigate('/login');
      return;
    }

    if (token) {
      localStorage.setItem('chicoai_token', token);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [navigate, searchParams]);

  return (
    <div className="auth-container">
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>Autenticando...</span>
      </div>
    </div>
  );
}
