#!/usr/bin/env python3
"""
Robust migration system that handles database schema updates properly.
Uses raw psycopg2 for better transaction control.
"""

import os
import sys
import uuid
import psycopg2
from psycopg2 import sql
from passlib.context import CryptContext

# Setup password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def get_db_config():
    """Get database configuration from environment"""
    return {
        'host': os.getenv('DB_HOST', 'db'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'tg'),
        'user': os.getenv('DB_USER', 'tg'),
        'password': os.getenv('DB_PASS', 'Test123')
    }

def connect_db():
    """Create database connection"""
    config = get_db_config()
    return psycopg2.connect(**config)

def table_exists(cursor, table_name):
    """Check if a table exists"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = %s
        )
    """, (table_name,))
    return cursor.fetchone()[0]

def column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = %s 
            AND column_name = %s
        )
    """, (table_name, column_name))
    return cursor.fetchone()[0]

def constraint_exists(cursor, constraint_name):
    """Check if a constraint exists"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE constraint_name = %s
        )
    """, (constraint_name,))
    return cursor.fetchone()[0]

def run_migration_step(cursor, step_name, sql_commands):
    """Run a migration step with proper error handling"""
    print(f"🔄 Running: {step_name}")
    try:
        if isinstance(sql_commands, str):
            sql_commands = [sql_commands]
        
        for cmd in sql_commands:
            cursor.execute(cmd)
        
        print(f"✅ Completed: {step_name}")
        return True
    except Exception as e:
        print(f"❌ Failed: {step_name} - {e}")
        return False

def migrate_database():
    """Run all database migrations"""
    print("=" * 60)
    print("🚀 Starting robust database migration")
    print("=" * 60)
    
    conn = None
    try:
        # Connect to database
        conn = connect_db()
        conn.autocommit = False  # Use transactions
        cursor = conn.cursor()
        
        print("✅ Database connection established")
        
        # Migration 1: Create users table
        if not table_exists(cursor, 'users'):
            sql_cmd = """
                CREATE TABLE users (
                    id VARCHAR PRIMARY KEY,
                    email VARCHAR UNIQUE NOT NULL,
                    hashed_password VARCHAR NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            if run_migration_step(cursor, "Create users table", sql_cmd):
                conn.commit()
            else:
                conn.rollback()
        else:
            print("✅ Users table already exists")
        
        # Migration 2: Add user_id to accounts table
        if table_exists(cursor, 'accounts') and not column_exists(cursor, 'accounts', 'user_id'):
            sql_cmd = "ALTER TABLE accounts ADD COLUMN user_id VARCHAR"
            if run_migration_step(cursor, "Add user_id to accounts", sql_cmd):
                conn.commit()
            else:
                conn.rollback()
        else:
            print("✅ user_id column in accounts already exists or accounts table doesn't exist")
        
        # Migration 3: Add user_id to campaigns table
        if table_exists(cursor, 'campaigns') and not column_exists(cursor, 'campaigns', 'user_id'):
            sql_cmd = "ALTER TABLE campaigns ADD COLUMN user_id VARCHAR"
            if run_migration_step(cursor, "Add user_id to campaigns", sql_cmd):
                conn.commit()
            else:
                conn.rollback()
        else:
            print("✅ user_id column in campaigns already exists or campaigns table doesn't exist")
        
        # Migration 4: Add user_id to contacts table
        if table_exists(cursor, 'contacts') and not column_exists(cursor, 'contacts', 'user_id'):
            sql_cmd = "ALTER TABLE contacts ADD COLUMN user_id VARCHAR"
            if run_migration_step(cursor, "Add user_id to contacts", sql_cmd):
                conn.commit()
            else:
                conn.rollback()
        else:
            print("✅ user_id column in contacts already exists or contacts table doesn't exist")
        
        # Migration 5: Add user_id to messages_sent table
        if table_exists(cursor, 'messages_sent') and not column_exists(cursor, 'messages_sent', 'user_id'):
            sql_cmd = "ALTER TABLE messages_sent ADD COLUMN user_id VARCHAR"
            if run_migration_step(cursor, "Add user_id to messages_sent", sql_cmd):
                conn.commit()
            else:
                conn.rollback()
        else:
            print("✅ user_id column in messages_sent already exists or messages_sent table doesn't exist")
        
        # Migration 6: Add interval_seconds to campaign_steps table
        if table_exists(cursor, 'campaign_steps') and not column_exists(cursor, 'campaign_steps', 'interval_seconds'):
            sql_cmd = "ALTER TABLE campaign_steps ADD COLUMN interval_seconds INTEGER"
            if run_migration_step(cursor, "Add interval_seconds to campaign_steps", sql_cmd):
                conn.commit()
            else:
                conn.rollback()
        else:
            print("✅ interval_seconds column in campaign_steps already exists or campaign_steps table doesn't exist")
        
        # Migration 7: Create default user if we have existing data
        cursor.execute("SELECT COUNT(*) FROM accounts")
        account_count = cursor.fetchone()[0]
        
        if account_count > 0:
            # Check if default user exists
            cursor.execute("SELECT COUNT(*) FROM users WHERE email = %s", ('admin@example.com',))
            user_exists = cursor.fetchone()[0] > 0
            
            if not user_exists:
                default_user_id = str(uuid.uuid4())
                hashed_password = get_password_hash("secret")
                
                sql_cmd = """
                    INSERT INTO users (id, email, hashed_password, is_active) 
                    VALUES (%s, %s, %s, true)
                """
                cursor.execute(sql_cmd, (default_user_id, 'admin@example.com', hashed_password))
                
                # Update existing records
                update_commands = [
                    ("UPDATE accounts SET user_id = %s WHERE user_id IS NULL", (default_user_id,)),
                    ("UPDATE campaigns SET user_id = %s WHERE user_id IS NULL", (default_user_id,)),
                    ("UPDATE contacts SET user_id = %s WHERE user_id IS NULL", (default_user_id,)),
                    ("UPDATE messages_sent SET user_id = %s WHERE user_id IS NULL", (default_user_id,))
                ]
                
                for cmd, params in update_commands:
                    try:
                        cursor.execute(cmd, params)
                    except Exception as e:
                        print(f"⚠️ Warning updating existing data: {e}")
                
                if run_migration_step(cursor, "Create default user and update existing data", "-- Data updated"):
                    conn.commit()
                    print("✅ Default user created: admin@example.com / secret")
                else:
                    conn.rollback()
            else:
                print("✅ Default user already exists")
        else:
            print("✅ No existing data found, skipping default user creation")
        
        # Migration 8: Add foreign key constraints (optional, non-critical)
        fk_constraints = [
            ("fk_accounts_user", "ALTER TABLE accounts ADD CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id)"),
            ("fk_campaigns_user", "ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_user FOREIGN KEY (user_id) REFERENCES users(id)"),
            ("fk_contacts_user", "ALTER TABLE contacts ADD CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES users(id)"),
            ("fk_messages_user", "ALTER TABLE messages_sent ADD CONSTRAINT fk_messages_user FOREIGN KEY (user_id) REFERENCES users(id)")
        ]
        
        for constraint_name, sql_cmd in fk_constraints:
            if not constraint_exists(cursor, constraint_name):
                if run_migration_step(cursor, f"Add {constraint_name} constraint", sql_cmd):
                    conn.commit()
                else:
                    conn.rollback()
                    print(f"⚠️ Warning: Could not add {constraint_name} constraint, continuing...")
            else:
                print(f"✅ {constraint_name} constraint already exists")
        
        print("=" * 60)
        print("✅ All migrations completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_database()
