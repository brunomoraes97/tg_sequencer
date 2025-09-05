#!/usr/bin/env python3
"""
Migration script to add interval_seconds to campaign_steps for per-step intervals.
"""

import sys
from sqlalchemy import text
from db import engine

def migrate():
    with engine.connect() as conn:
        try:
            print("Adding interval_seconds to campaign_steps (if not exists)...")
            conn.execute(text("ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS interval_seconds INTEGER"))
            conn.commit()
            print("Migration completed successfully!")
        except Exception as e:
            print(f"Migration failed: {e}")
            conn.rollback()
            sys.exit(1)

if __name__ == "__main__":
    migrate()
