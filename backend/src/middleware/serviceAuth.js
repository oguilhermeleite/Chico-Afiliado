/**
 * Middleware de autenticação para endpoints /api/internal/*.
 * Valida o header X-Service-Token enviado pelo backend principal (Chico-Back).
 * Nunca usar JWT de usuário aqui — é uma chave compartilhada entre serviços.
 */
const serviceAuth = (req, res, next) => {
  const token = req.headers['x-service-token'];

  if (!process.env.INTERNAL_SERVICE_TOKEN) {
    console.error('[serviceAuth] INTERNAL_SERVICE_TOKEN não configurado no .env');
    return res.status(500).json({ message: 'Configuração do servidor incompleta' });
  }

  if (!token || token !== process.env.INTERNAL_SERVICE_TOKEN) {
    return res.status(401).json({ message: 'Acesso não autorizado: token de serviço inválido' });
  }

  next();
};

module.exports = serviceAuth;
