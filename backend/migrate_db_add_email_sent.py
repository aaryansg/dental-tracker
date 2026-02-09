"""
Database migration script to add email_sent column to Reminder table
Run this script after updating models.py to add the email_sent field
"""
from app import app, db
from models import Reminder

def migrate():
    with app.app_context():
        try:
            # Add the email_sent column if it doesn't exist
            with db.engine.connect() as conn:
                # Check if column exists
                result = conn.execute(db.text("PRAGMA table_info(reminder)"))
                columns = [row[1] for row in result]
                
                if 'email_sent' not in columns:
                    print("Adding email_sent column to reminder table...")
                    conn.execute(db.text("ALTER TABLE reminder ADD COLUMN email_sent BOOLEAN DEFAULT 0"))
                    conn.commit()
                    print("✓ email_sent column added successfully!")
                else:
                    print("email_sent column already exists.")
                    
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            raise

if __name__ == '__main__':
    print("Starting database migration...")
    migrate()
    print("Migration complete!")
