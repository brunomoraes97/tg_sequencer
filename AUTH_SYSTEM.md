# Sistema de Autenticação - Telegram Sequencer

## Visão Geral

Foi implementado um sistema completo de autenticação baseado em usuários (perfis). Cada usuário agora tem suas próprias contas do Telegram, campanhas e contatos, garantindo isolamento total dos dados.

## Mudanças Principais

### 1. Novo Modelo de Usuário
- Cada perfil tem um email único e senha
- Autenticação via JWT tokens
- Separação completa de dados entre usuários

### 2. Tabelas Atualizadas
- `users` - Nova tabela para usuários/perfis
- `accounts` - Agora pertence a um usuário específico
- `campaigns` - Filtradas por usuário
- `contacts` - Isolados por usuário
- `messages_sent` - Rastreados por usuário

## Instalação e Migração

### 1. Instalar Dependências
```bash
./install_auth_deps.sh
```

### 2. Executar Migração do Banco
```bash
cd backend
python migrate_add_auth.py
```

A migração irá:
- Criar a tabela de usuários
- Adicionar colunas user_id em todas as tabelas
- Criar um usuário padrão para dados existentes
- Configurar chaves estrangeiras

### 3. Usuário Padrão (se houver dados existentes)
- **Email**: admin@example.com
- **Senha**: secret
- **⚠️ IMPORTANTE**: Altere esta senha após o primeiro login!

## Novas Rotas de Autenticação

### Registro de Usuário
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha_segura"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=usuario@exemplo.com&password=senha_segura
```

**Resposta:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

### Obter Informações do Usuário Atual
```http
GET /api/auth/me
Authorization: Bearer eyJ...
```

## Autenticação nas Rotas Existentes

Todas as rotas existentes agora requerem autenticação via Bearer token:

```http
Authorization: Bearer eyJ...
```

### Rotas Protegidas:
- `GET /api/dashboard` - Dashboard filtrado por usuário
- `GET/POST/PUT/DELETE /api/accounts/*` - Contas do usuário
- `GET/POST/PUT/DELETE /api/campaigns/*` - Campanhas do usuário  
- `GET/POST/PUT/DELETE /api/contacts/*` - Contatos do usuário

## Exemplo de Uso (JavaScript)

```javascript
// 1. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    username: 'usuario@exemplo.com',
    password: 'senha_segura'
  })
});

const { access_token } = await loginResponse.json();

// 2. Usar token nas outras requisições
const accountsResponse = await fetch('/api/accounts', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

const accounts = await accountsResponse.json();
```

## Segurança

- Senhas são hasheadas com bcrypt
- Tokens JWT com expiração de 30 minutos
- Isolamento completo de dados entre usuários
- Validação de email no registro

## Configuração

### Variáveis de Ambiente (Opcionais)
- `SECRET_KEY` - Chave para assinar JWT tokens (mude em produção)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Tempo de expiração do token (padrão: 30)

### Exemplo de .env
```
SECRET_KEY=sua-chave-super-secreta-aqui
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

## Migração de Dados Existentes

Se você já possui dados no banco:
1. Execute a migração que criará um usuário padrão
2. Todos os dados existentes serão associados a este usuário
3. Faça login com as credenciais padrão
4. Crie novos usuários conforme necessário
5. **IMPORTANTE**: Altere a senha do usuário padrão

## Troubleshooting

### Erro 401 Unauthorized
- Verifique se o token está sendo enviado no header Authorization
- Verifique se o token não expirou (renove fazendo login novamente)

### Erro 404 Not Found em recursos
- Verifique se o recurso pertence ao usuário autenticado
- Dados são isolados por usuário - não é possível acessar dados de outros usuários

### Problemas na Migração
- Verifique se o banco de dados está acessível
- Verifique as permissões de escrita no banco
- Execute a migração com privilégios adequados
