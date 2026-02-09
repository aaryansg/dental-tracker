from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, date
from models import Reminder, User, db
from email_service import send_reminder_email
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_and_send_reminders():
    """
    Check for reminders scheduled for today and send emails
    Called daily at 8 AM
    """
    try:
        from app import app  # Import here to avoid circular import
        
        with app.app_context():
            today = date.today()
            logger.info(f"Checking for reminders on {today}")
            
            # Get all reminders for today that are:
            # 1. Not completed
            # 2. Haven't been emailed yet
            reminders = Reminder.query.filter(
                Reminder.date == today,
                Reminder.completed == False,
                Reminder.email_sent == False
            ).all()
            
            logger.info(f"Found {len(reminders)} reminders to send emails for")
            
            for reminder in reminders:
                try:
                    # Get the user associated with this reminder
                    user = User.query.get(reminder.user_id)
                    
                    if user and user.email:
                        # Send the email
                        success = send_reminder_email(user.email, reminder)
                        
                        if success:
                            # Mark as email sent
                            reminder.email_sent = True
                            db.session.commit()
                            logger.info(f"Sent reminder email for: {reminder.title} to {user.email}")
                        else:
                            logger.error(f"Failed to send email for reminder: {reminder.title}")
                    else:
                        logger.warning(f"No user or email found for reminder ID: {reminder.id}")
                        
                except Exception as e:
                    logger.error(f"Error processing reminder {reminder.id}: {str(e)}")
                    db.session.rollback()
                    
    except Exception as e:
        logger.error(f"Error in check_and_send_reminders: {str(e)}")

def start_scheduler(app):
    """
    Start the background scheduler
    Runs daily at 8:00 AM
    """
    scheduler = BackgroundScheduler()
    
    # Schedule the reminder checker to run daily at 8:00 AM
    scheduler.add_job(
        func=check_and_send_reminders,
        trigger='cron',
        hour=8,
        minute=00,
        id='reminder_email_job',
        name='Send daily reminder emails',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Email reminder scheduler started - will check daily at 8:00 AM")
    
    return scheduler
