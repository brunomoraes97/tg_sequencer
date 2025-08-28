#!/usr/bin/env python3
"""
Migration script to add name and tag columns to accounts and contacts tables
"""

import os
import sys
from sqlalchemy import text
from db import engine

def migrate():
    """Add name and tag columns to accounts and contacts tables"""
    
    with engine.connect() as conn:
        try:
            # Add columns to accounts table
            print("Adding name and tag columns to accounts table...")
            conn.execute(text("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS name VARCHAR"))
            conn.execute(text("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tag VARCHAR"))
            
            # Add columns to contacts table
            print("Adding name and tag columns to contacts table...")
            conn.execute(text("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS name VARCHAR"))
            conn.execute(text("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tag VARCHAR"))
            
            conn.commit()
            print("Migration completed successfully!")
            
        except Exception as e:
            print(f"Migration failed: {e}")
            conn.rollback()
            sys.exit(1)

if __name__ == "__main__":
    migrate()
