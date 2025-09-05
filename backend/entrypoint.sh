#!/bin/bash

# Docker entrypoint script for backend services
set -e

# Wait for database to be ready
echo "Waiting for database to be ready..."
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
    print('Database is ready!')
except:
    exit(1)
"; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "Database is ready!"

# Run migrations if needed
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "Running database migrations..."
    python migrate_add_auth.py
    echo "Migrations completed!"
fi

# Execute the main command
exec "$@"
