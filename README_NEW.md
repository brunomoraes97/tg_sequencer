# Telegram Sequencer with Authentication

A complete Telegram automation platform with user authentication, allowing multiple users to manage their own Telegram accounts, campaigns, and contacts independently.

## 🚀 Quick Start (Production)

1. **Clone and configure**:
```bash
git clone <repository-url>
cd tg_sequencer_python
cp .env.example .env  # Edit with your settings
```

2. **Configure environment**:
Edit `.env` with your database credentials, Telegram API keys, and JWT secrets.

3. **Deploy**:
```bash
./setup_production.sh
```

That's it! The system will be available at http://localhost:3000

## 🔧 Development Setup

1. **Start development environment**:
```bash
docker-compose up --build
```

2. **Run migrations**:
```bash
docker-compose --profile migrate run --rm migrate
```

3. **Access services**:
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Database: localhost:5433

## 🔐 Authentication System

### Features
- **Multi-user support**: Each user has isolated data
- **JWT Authentication**: Secure token-based auth
- **Password hashing**: Bcrypt encryption
- **User registration**: Self-service account creation

### Default User (for existing data)
If you had data before adding authentication:
- **Email**: admin@example.com
- **Password**: secret
- **⚠️ Change this password immediately!**

### API Usage
```bash
# Register
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secure_password"}'

# Login  
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=secure_password"

# Use token in requests
curl -X GET "http://localhost:8000/api/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🗄️ Database Management

### Production Migration
```bash
# Run migrations in production
docker-compose --profile migrate run --rm migrate
```

### Manual Migration
```bash
# Access database container
docker exec -it tg_postgres psql -U tg -d tg

# Or run migration script manually
docker exec tg_api python migrate_add_auth.py
```

## 🏗️ Architecture

### Services
- **Frontend**: React app (port 3000)
- **API**: FastAPI backend (port 8000)
- **Worker**: Background message processor
- **Database**: PostgreSQL
- **Migration**: One-time setup service

### Key Components
- **User Management**: Registration, login, JWT tokens
- **Account Management**: Telegram account verification
- **Campaign System**: Multi-step message sequences
- **Contact Management**: User resolution and tracking
- **Background Worker**: Automated message sending

## 📁 Project Structure

```
tg_sequencer_python/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── auth.py              # Authentication system
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── services.py          # Business logic
│   ├── worker.py            # Background worker
│   ├── migrate_add_auth.py  # Migration script
│   ├── entrypoint.sh        # Docker entrypoint
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   └── api.ts          # API client
│   └── package.json
├── docker-compose.yml       # Production config
├── docker-compose.override.yml # Development config
├── .env                     # Environment variables
└── setup_production.sh     # Production setup script
```

## 🔑 Environment Variables

```env
# Database
DB_HOST=db
DB_NAME=tg
DB_USER=tg  
DB_PASS=your_secure_password

# Telegram API
TG_API_ID=your_api_id
TG_API_HASH=your_api_hash

# Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Encryption
SESSION_SECRET=your-encryption-key

# Worker
WORKER_TICK=30
```

## 🛠️ Common Commands

### Development
```bash
# Start development environment
docker-compose up --build

# View logs
docker-compose logs -f api

# Rebuild specific service
docker-compose build api

# Run migrations
docker-compose --profile migrate run --rm migrate
```

### Production
```bash
# Full production setup
./setup_production.sh

# Start production services
docker-compose up -d

# Scale worker instances
docker-compose up -d --scale worker=3

# Update and restart
docker-compose build && docker-compose up -d
```

### Maintenance
```bash
# Database backup
docker exec tg_postgres pg_dump -U tg tg > backup.sql

# Database restore
docker exec -i tg_postgres psql -U tg tg < backup.sql

# View container status
docker-compose ps

# Clean up
docker-compose down -v  # Removes volumes too
```

## 🔍 Troubleshooting

### Common Issues

**Migration fails**:
```bash
# Check database connection
docker-compose logs db

# Run migration manually  
docker exec tg_api python migrate_add_auth.py
```

**Authentication errors**:
- Check JWT_SECRET_KEY in .env
- Verify token hasn't expired (30 min default)
- Ensure user exists and is active

**Worker not processing messages**:
```bash
# Check worker logs
docker-compose logs worker

# Restart worker
docker-compose restart worker
```

**Database connection issues**:
```bash
# Check database health
docker-compose exec db pg_isready -U tg -d tg

# View database logs
docker-compose logs db
```

## 📊 Monitoring

### Health Checks
- API: http://localhost:8000/ (returns 200 if healthy)
- Database: Built-in PostgreSQL health check

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f db
```

## 🔐 Security Considerations

- **Change default passwords**: Update JWT_SECRET_KEY and database passwords
- **Use HTTPS**: Configure reverse proxy (nginx/traefik) for production
- **Firewall**: Restrict database port access
- **Backups**: Regular database backups
- **Updates**: Keep Docker images updated

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test with development environment
5. Submit pull request

## 📄 License

[Your license here]
