# Telegram Follow-up (UI + Worker)

Sistema multi-tenant minimalista para executar follow-ups automáticos no Telegram com interface web para configuração de contas, campanhas e contatos.

## Características

- **Background follow-ups** com Telethon
- **Interface web** para configurar contas, campanhas, passos e contatos
- **Login completo do Telegram** (telefone → código → 2FA) via UI
- Escalável para ~10 contas em um único servidor
- Usa **StringSession** (sem bloqueios SQLite), **PostgreSQL**, **FastAPI** e **worker assíncrono**

## Configuração Rápida

### 1) Configure .env

Copie o arquivo `.env` de exemplo e preencha suas credenciais do Telegram:

```bash
# Postgres
DB_HOST=db
DB_PORT=5432
DB_NAME=tg
DB_USER=tg
DB_PASS=changeme

# Telegram API credentials (obtenha em https://my.telegram.org)
TG_API_ID=123456
TG_API_HASH=your_api_hash

# Chave secreta para criptografar StringSessions
SESSION_SECRET=please-change-me

# Intervalo do worker em segundos
WORKER_TICK=30
```

**Importante**: Obtenha suas credenciais da API do Telegram em [https://my.telegram.org](https://my.telegram.org).

### 2) Suba com Docker Compose

```bash
docker compose up --build
```

- UI estará disponível em [http://localhost:8000](http://localhost:8000)
- Worker roda em background a cada `WORKER_TICK` segundos (padrão 30s)
- PostgreSQL roda na porta 5432

### 3) Fluxo de Uso na UI

#### Passo 1: Adicionar Conta
1. Acesse **"Adicionar conta"**
2. Informe o telefone com código do país (ex: `+55 11 99999-9999`)
3. Clique em **"Criar & Enviar código"**

#### Passo 2: Verificar Conta
1. Informe o código recebido por Telegram/SMS
2. Se houver 2FA, informe a senha
3. Clique em **"Validar"**

#### Passo 3: Criar Campanha
1. Acesse **"Nova campanha"**
2. Selecione a conta ativa
3. Defina nome, intervalo (segundos) e número máximo de passos
4. Clique em **"Criar"**

#### Passo 4: Adicionar Passos à Campanha
1. Na visualização da campanha, adicione os passos (1, 2, 3...)
2. Cada passo tem uma mensagem que será enviada

#### Passo 5: Adicionar Contatos
1. Acesse **"Novo contato"**
2. Selecione a conta
3. Informe o `telegram_user_id` do destinatário
4. Clique em **"Salvar"**

> **Dica**: Para obter `telegram_user_id`, use bots como [@userinfobot](https://t.me/userinfobot)

### 4) Como Funciona

- O **worker** verifica a cada 30 segundos (configurável) se há mensagens a enviar
- Para cada contato não respondido, verifica se é hora de enviar o próximo passo
- Envia a mensagem e avança para o próximo passo
- Para quando o contato responde (`replied=true`) ou atinge o máximo de passos

## Estrutura do Projeto

```
telegram-followup/
├── docker-compose.yml       # Orquestração dos containers
├── .env                     # Variáveis de ambiente
├── app/
│   ├── requirements.txt     # Dependências Python
│   ├── Dockerfile          # Container da aplicação
│   ├── main.py             # FastAPI + Interface web
│   ├── worker.py           # Worker de background
│   ├── db.py               # Configuração do banco
│   ├── models.py           # Modelos ORM
│   ├── schemas.py          # Schemas Pydantic
│   ├── telethon_manager.py # Gerenciamento de clientes Telegram
│   ├── services.py         # Lógica de negócio
│   ├── templates/          # Templates HTML
│   └── static/             # Arquivos estáticos (CSS)
└── README.md               # Este arquivo
```

## Produção

Para usar em produção:

### Segurança
- [ ] Use HTTPS (proxy reverso com Caddy/Traefik/Nginx)
- [ ] Substitua o XOR por **Fernet** ou KMS para criptografar sessions
- [ ] Configure firewall apropriado
- [ ] Use senhas fortes no PostgreSQL

### Monitoramento
- [ ] Implemente healthchecks
- [ ] Configure logs estruturados
- [ ] Monitore o processo worker
- [ ] Configure alertas para falhas

### Escalabilidade
- [ ] Não execute múltiplos workers na mesma conta simultaneamente
- [ ] Use load balancer se necessário
- [ ] Configure backup do PostgreSQL
- [ ] Considere usar Redis para cache se necessário

## Desenvolvimento

Para desenvolver localmente:

```bash
# Instalar dependências
cd app
pip install -r requirements.txt

# Rodar apenas o PostgreSQL
docker compose up db

# Configurar variáveis locais
export DB_HOST=localhost
export TG_API_ID=your_api_id
export TG_API_HASH=your_api_hash
export SESSION_SECRET=your_secret

# Rodar a API
uvicorn main:app --reload

# Rodar o worker (em outro terminal)
python -m worker
```

## Solução de Problemas

### Erro de autenticação Telegram
- Verifique se `TG_API_ID` e `TG_API_HASH` estão corretos
- Certifique-se de que o telefone está no formato internacional (+código país)

### Worker não está enviando mensagens
- Verifique os logs do container `tg_worker`
- Confirme que há contas ativas e campanhas com passos configurados
- Verifique se há contatos não respondidos

### Erro de conexão com banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no `.env`
- Verifique se as tabelas foram criadas (acontece automaticamente)

## Licença

Este projeto é fornecido como está, para fins educacionais e de demonstração.
