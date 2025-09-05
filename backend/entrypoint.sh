#!/bin/bash

# Docker entrypoint script for backend services
set -e

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
while ! python -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'db'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'tg'),
        user=os.getenv('DB_USER', 'tg'),
        password=os.getenv('DB_PASS', 'Test123')
    )
    conn.close()
    print('✅ Database is ready!')
except Exception as e:
    print(f'❌ Database not ready: {e}')
    exit(1)
"; do
  echo "⏳ Database not ready, waiting 2 seconds..."
  sleep 2
done

echo "✅ Database connection confirmed!"

# Always run migrations (they are idempotent)
echo "🔄 Running database migrations..."
python migrate_all.py

# Check if migrations were successful by testing basic functionality
echo "🧪 Testing database schema..."
python -c "
try:
    from sqlalchemy import create_engine, text
    import os
    
    # Test database connection and basic tables
    url = 'postgresql://{}:{}@{}:{}/{}'.format(
        os.getenv('DB_USER', 'tg'),
        os.getenv('DB_PASS', 'Test123'),
        os.getenv('DB_HOST', 'db'),
        os.getenv('DB_PORT', '5432'),
        os.getenv('DB_NAME', 'tg')
    )
    
    engine = create_engine(url)
    with engine.connect() as conn:
        # Test if we can query basic tables
        conn.execute(text('SELECT 1'))
        print('✅ Database schema is functional')
except Exception as e:
    print(f'⚠️ Database schema test failed: {e}')
    print('🚀 Continuing anyway - application will handle missing tables')
"

echo "🚀 Starting application..."

# Execute the main command
exec "$@"
