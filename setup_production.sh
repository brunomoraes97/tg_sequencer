#!/bin/bash

# Production setup script for Telegram Sequencer with Authentication
set -e

echo "🚀 Setting up Telegram Sequencer for Production"
echo "================================================"

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check for docker compose (new) or docker-compose (legacy)
DOCKER_COMPOSE=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Using: $DOCKER_COMPOSE"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one based on .env.example"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build containers
echo "🔨 Building Docker containers..."
$DOCKER_COMPOSE -f docker-compose.prod.yml build

# Start database first
echo "🗃️ Starting database..."
$DOCKER_COMPOSE -f docker-compose.prod.yml up -d db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "🔧 Running database migrations..."
$DOCKER_COMPOSE -f docker-compose.prod.yml --profile migrate run --rm migrate

# Start all services
echo "🚀 Starting all services..."
$DOCKER_COMPOSE -f docker-compose.prod.yml up -d

# Wait a bit for services to start
sleep 5

# Show status
echo ""
echo "📊 Service Status:"
$DOCKER_COMPOSE -f docker-compose.prod.yml ps

echo ""
echo "✅ Setup completed!"
echo ""
echo "🌐 Services available at:"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "🔑 Authentication System:"
echo "   If you had existing data, default user was created:"
echo "   Email: admin@example.com"
echo "   Password: secret"
echo "   ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!"
echo ""
echo "📝 Next steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Register a new user or login with existing credentials"
echo "   3. Configure your Telegram accounts and campaigns"
echo ""
echo "🛠️ Useful commands:"
echo "   View logs: $DOCKER_COMPOSE -f docker-compose.prod.yml logs -f"
echo "   Stop services: $DOCKER_COMPOSE -f docker-compose.prod.yml down"
echo "   Restart services: $DOCKER_COMPOSE -f docker-compose.prod.yml restart"
echo "   Run migration again: $DOCKER_COMPOSE -f docker-compose.prod.yml --profile migrate run --rm migrate"
