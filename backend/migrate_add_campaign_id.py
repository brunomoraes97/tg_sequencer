"""
Migration script to add campaign_id column to contacts table
"""
from db import SessionLocal
from sqlalchemy import text

def migrate():
    print("Adding campaign_id column to contacts table...")
    
    try:
        # Use SQLAlchemy to execute the migration
        with SessionLocal() as db:
            # Check if column already exists (PostgreSQL version)
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='contacts' AND column_name='campaign_id'
            """))
            
            if not result.fetchone():
                print("Adding campaign_id column...")
                db.execute(text("ALTER TABLE contacts ADD COLUMN campaign_id VARCHAR REFERENCES campaigns(id)"))
                db.commit()
                print("✅ Migration completed successfully!")
            else:
                print("✅ Column campaign_id already exists, skipping migration.")
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate()
