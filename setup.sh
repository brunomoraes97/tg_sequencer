#!/bin/bash

# Script de setup inicial para o Telegram Follow-up System

echo "🚀 Configurando Telegram Follow-up System..."

# Verificar se o Docker e Docker Compose estão instalados
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Por favor, instale o Docker primeiro."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Por favor, instale o Docker Compose primeiro."
    exit 1
fi

# Verificar se existe arquivo .env
if [ ! -f .env ]; then
    echo "📋 Criando arquivo .env a partir do template..."
    cp .env.example .env
    echo "✅ Arquivo .env criado. Por favor, edite o arquivo .env com suas credenciais do Telegram."
    echo ""
    echo "📝 Você precisa configurar:"
    echo "   - TG_API_ID (obtenha em https://my.telegram.org)"
    echo "   - TG_API_HASH (obtenha em https://my.telegram.org)"
    echo "   - SESSION_SECRET (gere uma string aleatória segura)"
    echo ""
    echo "⚠️  Após configurar o .env, execute este script novamente."
    exit 0
fi

# Verificar se as credenciais do Telegram estão configuradas
source .env
if [ "$TG_API_ID" == "123456" ] || [ "$TG_API_HASH" == "your_api_hash" ]; then
    echo "⚠️  Por favor, configure suas credenciais do Telegram no arquivo .env"
    echo "   Obtenha suas credenciais em: https://my.telegram.org"
    exit 1
fi

echo "🐳 Iniciando containers..."

# Parar containers existentes se estiverem rodando
docker-compose down 2>/dev/null || docker compose down 2>/dev/null

# Construir e iniciar os containers
if command -v docker-compose &> /dev/null; then
    docker-compose up --build -d
else
    docker compose up --build -d
fi

# Aguardar a aplicação inicializar
echo "⏳ Aguardando inicialização..."
sleep 10

# Verificar se os containers estão rodando
if docker ps | grep -q "tg_api"; then
    echo "✅ API container está rodando"
else
    echo "❌ Problema com o container da API"
    exit 1
fi

if docker ps | grep -q "tg_worker"; then
    echo "✅ Worker container está rodando"
else
    echo "❌ Problema com o container do Worker"
    exit 1
fi

if docker ps | grep -q "tg_postgres"; then
    echo "✅ PostgreSQL container está rodando"
else
    echo "❌ Problema com o container do PostgreSQL"
    exit 1
fi

echo ""
echo "🎉 Sistema configurado com sucesso!"
echo ""
echo "📱 Acesse a interface web em: http://localhost:8000"
echo ""
echo "🔧 Comandos úteis:"
echo "   - Ver logs da API:    docker logs -f tg_api"
echo "   - Ver logs do Worker: docker logs -f tg_worker"
echo "   - Parar sistema:      docker-compose down"
echo "   - Restart sistema:    docker-compose restart"
echo ""
echo "📚 Próximos passos:"
echo "   1. Acesse http://localhost:8000"
echo "   2. Adicione uma conta do Telegram"
echo "   3. Crie uma campanha"
echo "   4. Adicione contatos"
echo ""
