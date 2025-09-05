"""
Migration script to add user authentication and update existing tables
Run this script to migrate existing database to new schema with user system
"""

import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
import sys

# Database URL - get from environment variables
def get_database_url():
    """Get database URL from environment variables"""
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "tg")
    db_user = os.getenv("DB_USER", "tg")
    db_pass = os.getenv("DB_PASS", "Test123")
    
    return f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

def migrate_database():
    """Run database migration"""
    DATABASE_URL = get_database_url()
    print(f"Connecting to database: {DATABASE_URL.replace(os.getenv('DB_PASS', ''), '***')}")
    
    try:
        engine = create_engine(DATABASE_URL)
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connection successful")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("Make sure the database is running and environment variables are correct")
        sys.exit(1)
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            print("Starting database migration...")
            
            # 1. Create users table
            print("1. Creating users table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR PRIMARY KEY,
                    email VARCHAR UNIQUE NOT NULL,
                    hashed_password VARCHAR NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # 2. Add user_id column to accounts table
            print("2. Adding user_id to accounts table...")
            try:
                conn.execute(text("ALTER TABLE accounts ADD COLUMN user_id VARCHAR"))
            except Exception as e:
                if "already exists" not in str(e):
                    raise
                print("   user_id column already exists in accounts")
            
            # 3. Add user_id column to campaigns table
            print("3. Adding user_id to campaigns table...")
            try:
                conn.execute(text("ALTER TABLE campaigns ADD COLUMN user_id VARCHAR"))
            except Exception as e:
                if "already exists" not in str(e):
                    raise
                print("   user_id column already exists in campaigns")
            
            # 4. Add user_id column to contacts table
            print("4. Adding user_id to contacts table...")
            try:
                conn.execute(text("ALTER TABLE contacts ADD COLUMN user_id VARCHAR"))
            except Exception as e:
                if "already exists" not in str(e):
                    raise
                print("   user_id column already exists in contacts")
            
            # 5. Add user_id column to messages_sent table
            print("5. Adding user_id to messages_sent table...")
            try:
                conn.execute(text("ALTER TABLE messages_sent ADD COLUMN user_id VARCHAR"))
            except Exception as e:
                if "already exists" not in str(e):
                    raise
                print("   user_id column already exists in messages_sent")
            
            # 6. Create a default user for existing data (if any exists)
            print("6. Checking for existing data...")
            result = conn.execute(text("SELECT COUNT(*) FROM accounts"))
            account_count = result.fetchone()[0]
            
            if account_count > 0:
                print(f"   Found {account_count} existing accounts")
                print("   Creating default user for migration...")
                
                # Create default user
                default_user_id = str(uuid.uuid4())
                conn.execute(text("""
                    INSERT INTO users (id, email, hashed_password, is_active, created_at, updated_at)
                    VALUES (:id, :email, :password, :active, :created, :updated)
                """), {
                    "id": default_user_id,
                    "email": "admin@example.com",
                    "password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # "secret"
                    "active": True,
                    "created": datetime.utcnow(),
                    "updated": datetime.utcnow()
                })
                
                print(f"   Default user created with ID: {default_user_id}")
                print("   Default login: admin@example.com / secret")
                
                # Update existing records with default user_id
                print("   Updating existing accounts...")
                conn.execute(text("UPDATE accounts SET user_id = :user_id WHERE user_id IS NULL"), 
                           {"user_id": default_user_id})
                
                print("   Updating existing campaigns...")
                conn.execute(text("UPDATE campaigns SET user_id = :user_id WHERE user_id IS NULL"), 
                           {"user_id": default_user_id})
                
                print("   Updating existing contacts...")
                conn.execute(text("UPDATE contacts SET user_id = :user_id WHERE user_id IS NULL"), 
                           {"user_id": default_user_id})
                
                print("   Updating existing messages...")
                conn.execute(text("UPDATE messages_sent SET user_id = :user_id WHERE user_id IS NULL"), 
                           {"user_id": default_user_id})
            
            # 7. Add foreign key constraints
            print("7. Adding foreign key constraints...")
            try:
                conn.execute(text("ALTER TABLE accounts ADD CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id)"))
            except Exception as e:
                if "already exists" not in str(e):
                    print(f"   Warning: Could not add FK constraint for accounts: {e}")
            
            try:
                conn.execute(text("ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_user FOREIGN KEY (user_id) REFERENCES users(id)"))
            except Exception as e:
                if "already exists" not in str(e):
                    print(f"   Warning: Could not add FK constraint for campaigns: {e}")
            
            try:
                conn.execute(text("ALTER TABLE contacts ADD CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES users(id)"))
            except Exception as e:
                if "already exists" not in str(e):
                    print(f"   Warning: Could not add FK constraint for contacts: {e}")
            
            try:
                conn.execute(text("ALTER TABLE messages_sent ADD CONSTRAINT fk_messages_user FOREIGN KEY (user_id) REFERENCES users(id)"))
            except Exception as e:
                if "already exists" not in str(e):
                    print(f"   Warning: Could not add FK constraint for messages_sent: {e}")
            
            # 8. Make user_id NOT NULL for new records
            print("8. Setting user_id as NOT NULL...")
            try:
                conn.execute(text("ALTER TABLE accounts ALTER COLUMN user_id SET NOT NULL"))
                conn.execute(text("ALTER TABLE campaigns ALTER COLUMN user_id SET NOT NULL"))  
                conn.execute(text("ALTER TABLE contacts ALTER COLUMN user_id SET NOT NULL"))
                conn.execute(text("ALTER TABLE messages_sent ALTER COLUMN user_id SET NOT NULL"))
            except Exception as e:
                print(f"   Warning: Could not set NOT NULL constraints: {e}")
            
            # Commit transaction
            trans.commit()
            print("✅ Migration completed successfully!")
            
            if account_count > 0:
                print("\n🔑 Default user created:")
                print("   Email: admin@example.com")
                print("   Password: secret")
                print("   Please change this password after first login!")
            
        except Exception as e:
            # Rollback on error
            trans.rollback()
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate_database()
