import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chicoai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Só redireciona se tinha um token (sessão expirada)
      // Não redireciona em modo demo (sem token)
      const hadToken = localStorage.getItem('chicoai_token');
      if (hadToken) {
        localStorage.removeItem('chicoai_token');
        localStorage.removeItem('chicoai_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// Instagram
export const instagramAPI = {
  getStatus: () => api.get('/auth/instagram/status'),
  disconnect: () => api.post('/auth/instagram/disconnect'),
};

// Dashboard
export const dashboardAPI = {
  getMetrics: (period = 30) => api.get(`/dashboard/metrics?period=${period}`),
  getConversions: (params) => api.get('/dashboard/conversions', { params }),
};

// Referral
export const referralAPI = {
  getCode: () => api.get('/referral/code'),
  generateNew: () => api.post('/referral/generate'),
};

// Analytics
export const analyticsAPI = {
  getConversionsByPlan: (period = 30) => api.get(`/analytics/conversions-by-plan?period=${period}`),
  getCommissionBreakdown: (period = 30) => api.get(`/analytics/commission/breakdown?period=${period}`),
};

// CHC (Chico Coin) — 1000 CHC = R$ 1,00
export const chcAPI = {
  getTotalMoved: (period = 30) => api.get(`/chc/total-moved?period=${period}`),
  getAveragePerUser: (period = 30) => api.get(`/chc/average-per-user?period=${period}`),
  getBreakdown: (period = 30) => api.get(`/chc/breakdown?period=${period}`),
};

export default api;
