#!/usr/bin/env python3
"""
Run all database migrations in sequence with robust error handling.
"""

import sys
import traceback
import os

def main():
    print("=" * 60)
    print("🚀 Starting comprehensive database migration")
    print("=" * 60)
    
    success_count = 0
    failure_count = 0
    
    # Use the robust migration system
    try:
        import migrate_robust
        print("🔄 Running robust migration system...")
        migrate_robust.migrate_database()
        print("✅ Robust migration system completed")
        success_count += 1
    except Exception as e:
        print(f"❌ Robust migration system failed: {e}")
        traceback.print_exc()
        failure_count += 1
    
    # Run additional specific migrations if they exist
    additional_migrations = [
        ('migrate_add_step_interval', 'Per-step interval migration'),
        ('migrate_add_campaign_id', 'Campaign ID migration'),
        ('migrate_add_name_tag', 'Name tag migration')
    ]
    
    for module_name, description in additional_migrations:
        try:
            module = __import__(module_name)
            if hasattr(module, 'migrate'):
                print(f"🔄 Running {description}...")
                module.migrate()
                print(f"✅ {description} completed")
                success_count += 1
            else:
                print(f"⚠️ {module_name} found but no migrate() function")
        except ImportError:
            print(f"ℹ️ {module_name} not found, skipping")
        except Exception as e:
            print(f"❌ {description} failed: {e}")
            traceback.print_exc()
            failure_count += 1
    
    print("=" * 60)
    print(f"📊 Migration summary: {success_count} succeeded, {failure_count} failed")
    print("=" * 60)
    
    if failure_count > 0:
        print("⚠️ Some migrations failed, but core system should be functional")
        # Don't exit with error code - let the application start
    else:
        print("🎉 All migrations completed successfully!")

if __name__ == "__main__":
    main()
