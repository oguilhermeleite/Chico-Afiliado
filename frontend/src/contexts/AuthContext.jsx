import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('chicoai_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const enterDashboard = () => {
    const demoUser = {
      id: 'demo-001',
      name: 'Afiliado',
      email: 'afiliado@chicoai.com',
      referral_code: 'CHICO_DEMO12345',
    };
    localStorage.setItem('chicoai_user', JSON.stringify(demoUser));
    setUser(demoUser);
  };

  const logout = () => {
    localStorage.removeItem('chicoai_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, enterDashboard, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
