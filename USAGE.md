# 🚀 Guia de Uso - Telegram Follow-up System

## 📋 Pré-requisitos

### 1. Credenciais do Telegram
- Acesse [https://my.telegram.org](https://my.telegram.org)
- Faça login com seu número do Telegram
- Vá em "API Development Tools"
- Crie uma nova aplicação e anote:
  - `api_id` (número)
  - `api_hash` (string)

### 2. Sistema
- Docker e Docker Compose instalados
- Servidor com pelo menos 1GB RAM (recomendado 2GB+)

## 🛠️ Instalação

### Método 1: Script Automático
```bash
git clone <seu-repositorio>
cd telegram-followup
chmod +x setup.sh
./setup.sh
```

### Método 2: Manual
```bash
# 1. Clone e configure
git clone <seu-repositorio>
cd telegram-followup
cp .env.example .env

# 2. Edite o .env com suas credenciais
nano .env

# 3. Inicie os containers
docker compose up --build -d

# 4. Verifique se está funcionando
docker compose logs -f api
```

## 🔧 Configuração do .env

```bash
# PostgreSQL (pode manter os padrões)
DB_HOST=db
DB_PORT=5432
DB_NAME=tg
DB_USER=tg
DB_PASS=suasenhaforte123

# Telegram API (OBRIGATÓRIO configurar)
TG_API_ID=1234567
TG_API_HASH=abcdef1234567890abcdef1234567890

# Segurança (MUDE para produção)
SESSION_SECRET=uma-chave-aleatoria-muito-segura-aqui

# Worker (opcional)
WORKER_TICK=30
```

## 📱 Uso do Sistema

### 1. Adicionar Conta do Telegram

1. Acesse `http://localhost:8000`
2. Clique em **"Adicionar conta"**
3. Digite seu número com código do país: `+55 11 99999-9999`
4. Clique em **"Criar & Enviar código"**
5. Digite o código recebido no Telegram
6. Se tiver 2FA, digite a senha
7. Clique em **"Validar"**

### 2. Criar Campanha

1. Na tela inicial, clique em **"Nova campanha"**
2. Selecione a conta ativa
3. Defina:
   - **Nome**: Ex: "Follow-up Vendas"
   - **Intervalo**: 120 segundos (2 minutos entre mensagens)
   - **Máximo de passos**: 3 (enviará no máximo 3 mensagens)
4. Clique em **"Criar"**

### 3. Adicionar Passos à Campanha

1. Na visualização da campanha, adicione os passos:

**Passo 1:**
```
Olá! Vi que você se interessou pelo nosso produto. 
Tem alguma dúvida que posso esclarecer? 😊
```

**Passo 2:**
```
Oi! Só para lembrar que nossa promoção termina em breve. 
Ainda tem interesse? Posso te ajudar com mais informações! 🚀
```

**Passo 3:**
```
Última chance! Nossa oferta especial acaba hoje. 
Se quiser aproveitar, me chama que fechamos juntos! 💪
```

### 4. Adicionar Contatos

1. Clique em **"Novo contato"**
2. Selecione a conta
3. Digite o `telegram_user_id` do destinatário
4. Clique em **"Salvar"**

**Como obter telegram_user_id:**
- Use o bot [@userinfobot](https://t.me/userinfobot)
- Encaminhe uma mensagem da pessoa para o bot
- O bot retornará o ID numérico

### 5. Monitorar Envios

- O worker verifica a cada 30 segundos (configurável)
- Logs do worker: `docker compose logs -f worker`
- Logs da API: `docker compose logs -f api`

## 🔍 Monitoramento

### Verificar Status dos Containers
```bash
docker compose ps
```

### Ver Logs em Tempo Real
```bash
# API
docker compose logs -f api

# Worker
docker compose logs -f worker

# PostgreSQL
docker compose logs -f db
```

### Testar Conexão com Banco
```bash
python test_db.py
```

### Acessar PostgreSQL
```bash
docker compose exec db psql -U tg -d tg
```

Queries úteis:
```sql
-- Ver contas
SELECT id, phone, status FROM accounts;

-- Ver campanhas
SELECT id, name, interval_seconds, max_steps, active FROM campaigns;

-- Ver contatos e status
SELECT telegram_user_id, current_step, replied, last_message_at FROM contacts;

-- Ver mensagens enviadas
SELECT account_id, step_number, sent_at FROM messages_sent ORDER BY sent_at DESC LIMIT 10;
```

## 🐛 Solução de Problemas

### Erro "TG_API_ID inválido"
- Verifique se copiou corretamente de my.telegram.org
- TG_API_ID deve ser um número (sem aspas no .env)
- TG_API_HASH deve ser uma string de 32 caracteres

### Worker não envia mensagens
```bash
# Ver logs do worker
docker compose logs worker

# Verificar se há contas ativas
docker compose exec db psql -U tg -d tg -c "SELECT phone, status FROM accounts;"

# Verificar se há contatos para processar
docker compose exec db psql -U tg -d tg -c "SELECT COUNT(*) FROM contacts WHERE replied = false;"
```

### Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
docker compose ps db

# Testar conexão
python test_db.py

# Reiniciar banco se necessário
docker compose restart db
```

### Container não inicia
```bash
# Ver logs completos
docker compose logs api
docker compose logs worker

# Reconstruir containers
docker compose down
docker compose up --build
```

## 🔒 Segurança em Produção

### 1. HTTPS
Use um proxy reverso (Nginx/Caddy/Traefik):
```nginx
server {
    listen 443 ssl;
    server_name seudominio.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Firewall
```bash
# Permitir apenas HTTPS e SSH
ufw allow 22
ufw allow 443
ufw deny 8000  # Bloquear acesso direto à API
ufw enable
```

### 3. Criptografia
Substitua o XOR por Fernet:
```python
from cryptography.fernet import Fernet

# Gerar chave
key = Fernet.generate_key()
f = Fernet(key)

# Criptografar
encrypted = f.encrypt(session_string.encode())

# Descriptografar
decrypted = f.decrypt(encrypted).decode()
```

### 4. Backup Automático
```bash
#!/bin/bash
# backup_db.sh
docker compose exec db pg_dump -U tg tg > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 📊 Limites e Escalabilidade

### Limites do Telegram
- 30 mensagens por segundo por conta
- 300 mensagens por minuto por conta
- Contas podem ser limitadas se detectado spam

### Escalabilidade
- **1 servidor**: ~10 contas simultâneas
- **Para mais contas**: Use múltiplos servidores com load balancer
- **Performance**: PostgreSQL + Redis para cache

### Otimizações
```python
# No .env, ajuste o intervalo do worker
WORKER_TICK=10  # Verifica a cada 10 segundos (mais responsivo)

# Ou para economizar recursos
WORKER_TICK=60  # Verifica a cada 1 minuto
```

## 📞 Suporte

- **Logs**: Sempre verifique os logs primeiro
- **Documentação**: README.md
- **Teste**: Use `test_db.py` para diagnóstico
- **Status**: `docker compose ps` para ver containers

Lembre-se: Use com responsabilidade e respeite os termos de uso do Telegram! 🤝
