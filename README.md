# ChicoIA - Dashboard de Afiliados

Dashboard para influenciadores afiliados da plataforma de apostas esportivas ChicoIA. Permite acompanhar conversões, ganhos e gerenciar códigos de referência.

## Tecnologias

**Backend:**
- Node.js + Express
- PostgreSQL
- JWT (autenticação)
- Passport.js (Google OAuth2 + Facebook/Instagram)
- bcrypt
- express-session

**Frontend:**
- React + Vite
- React Router
- Axios
- Lucide React (ícones)
- Framer Motion (animações)
- React Hot Toast (notificações)

## Estrutura do Projeto

```
chicoai-affiliate-dashboard/
├── frontend/          # Aplicação React
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   └── package.json
│
├── backend/           # API Node.js
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── migrations/
│   │   └── routes/
│   └── package.json
│
└── README.md
```

## Instalação

### Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- Conta Google Cloud (para OAuth2)

### 1. Clonar e instalar dependências

```bash
# Backend
cd backend
cp .env.example .env
npm install

# Frontend
cd ../frontend
cp .env.example .env
npm install
```

### 2. Configurar banco de dados

Crie o banco no PostgreSQL:

```sql
CREATE DATABASE chicoai_affiliate;
```

Execute as migrações:

```bash
cd backend
npm run migrate
```

### 3. Configurar variáveis de ambiente

**Backend (.env):**

```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=chicoai_affiliate
DB_USER=postgres
DB_PASSWORD=sua_senha

JWT_SECRET=seu_secret_seguro
JWT_EXPIRES_IN=7d

# Google OAuth2
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Facebook/Instagram OAuth
FACEBOOK_APP_ID=seu_facebook_app_id
FACEBOOK_APP_SECRET=seu_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:3001/api/auth/facebook/callback

# Sessão (para OAuth do Facebook)
SESSION_SECRET=seu_session_secret_seguro

FRONTEND_URL=http://localhost:5173
BASE_URL=https://www.chicoia.com.br
```

**Frontend (.env):**

```env
VITE_API_URL=http://localhost:3001/api
VITE_GOOGLE_CLIENT_ID=seu_google_client_id
```

### 4. Configurar Google OAuth2

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto ou selecione existente
3. Ative a API "Google+ API" e "People API"
4. Em Credenciais, crie um "ID do cliente OAuth 2.0"
5. Tipo: Aplicativo da Web
6. URIs de redirecionamento autorizados: `http://localhost:3001/api/auth/google/callback`
7. Copie Client ID e Client Secret para o .env

### 5. Configurar Facebook/Instagram OAuth

Para permitir que influenciadores conectem suas contas Instagram:

1. Acesse [Meta for Developers](https://developers.facebook.com)
2. Crie um aplicativo do tipo "Business"
3. Configure o produto "Facebook Login"
4. Adicione as permissões:
   - `instagram_basic`
   - `pages_show_list`
   - `pages_read_engagement`
   - `instagram_manage_insights`
   - `business_management`
5. Configure os URIs de redirecionamento:
   - Desenvolvimento: `http://localhost:3001/api/auth/facebook/callback`
   - Produção: `https://www.chicoia.com.br/api/auth/facebook/callback`
6. Copie App ID e App Secret para o .env

**Requisitos do Instagram:**
- A conta do influenciador deve ser Instagram Business ou Creator
- Deve estar vinculada a uma Página do Facebook
- Contas pessoais não são suportadas pela API do Instagram

### 6. Executar

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Acesse: http://localhost:5173

## Endpoints da API

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Registrar influenciador |
| POST | `/api/auth/login` | Login com email/senha |
| GET | `/api/auth/google` | Iniciar OAuth Google |
| GET | `/api/auth/google/callback` | Callback OAuth Google |
| GET | `/api/auth/facebook` | Iniciar OAuth Facebook/Instagram |
| GET | `/api/auth/facebook/callback` | Callback OAuth Facebook |
| GET | `/api/auth/instagram/status` | Status da conexão Instagram |
| POST | `/api/auth/instagram/disconnect` | Desconectar Instagram |
| GET | `/api/auth/me` | Dados do usuário logado |

### Dashboard

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard/metrics?period=30` | Métricas do dashboard |
| GET | `/api/dashboard/conversions?page=1&limit=20` | Histórico de conversões |

### Referral

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/referral/code` | Buscar código do afiliado |
| POST | `/api/referral/generate` | Gerar novo código |
| GET | `/api/referral/track/:code` | Validar código (público) |

## Sistema de Rastreamento

### Fluxo de conversão:

1. Influenciador compartilha link: `chicoai.com.br/ref/CHICO_ABC123XYZ`
2. Usuário clica e acessa a plataforma
3. Código é armazenado em cookie/localStorage
4. Usuário se cadastra e faz primeiro depósito
5. Sistema cria registro em `conversions`
6. Dashboard atualiza métricas em tempo real

### Formato do código:
- Prefixo: `CHICO_`
- 9 caracteres alfanuméricos maiúsculos
- Exemplo: `CHICO_ABC123XYZ`

## Métricas Disponíveis

- **Ganhos do Mês** - Total em R$ de conversões pagas no mês
- **Usuários Pagantes** - Total de usuários convertidos
- **Conversões Hoje** - Conversões nas últimas 24h
- **Conversões Esta Semana** - Conversões na semana atual
- **Conversões Este Mês** - Conversões no mês atual
- **Taxa de Conversão** - % de visitantes que convertem
- **Ticket Médio** - Valor médio por conversão

## Deploy

### Backend (exemplo com Railway/Render):

```bash
cd backend
npm start
```

### Frontend (exemplo com Vercel):

```bash
cd frontend
npm run build
```

Arquivos gerados em `frontend/dist/`.

## Licença

Projeto privado - ChicoIA © 2024
