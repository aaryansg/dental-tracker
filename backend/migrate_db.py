from models import db
from app import app

with app.app_context():
    # Add new columns to reminder table
    from sqlalchemy import text
    try:
        db.session.execute(text('ALTER TABLE reminder ADD COLUMN frequency_days INTEGER'))
        print("Added frequency_days column")
    except Exception as e:
        print(f"frequency_days column may already exist: {e}")
    
    try:
        db.session.execute(text('ALTER TABLE reminder ADD COLUMN pill_count INTEGER'))
        print("Added pill_count column")
    except Exception as e:
        print(f"pill_count column may already exist: {e}")
    
    db.session.commit()
    print("Database migration complete!")
