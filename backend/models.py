from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    habits = db.relationship('DailyHabit', backref='user', lazy=True)
    checkups = db.relationship('AICheckup', backref='user', lazy=True)

class DailyHabit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.Date, default=date.today, nullable=False)
    brushed = db.Column(db.Boolean, default=False)
    flossed = db.Column(db.Boolean, default=False)
    brushing_time = db.Column(db.Integer)  # in seconds
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'date', name='unique_daily_habit'),)

class AICheckup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    image_path = db.Column(db.String(500))
    analysis_result = db.Column(db.Text)
    ai_recommendations = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # 'appointment' or 'medication'
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time)
    completed = db.Column(db.Boolean, default=False)
    # Medication routine fields
    frequency_days = db.Column(db.Integer)  # For medications: repeat every N days
    pill_count = db.Column(db.Integer)  # For medications: number of pills
    email_sent = db.Column(db.Boolean, default=False)  # Track if email notification was sent
    created_at = db.Column(db.DateTime, default=datetime.utcnow)