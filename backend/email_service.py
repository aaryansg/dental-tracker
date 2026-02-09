from flask_mail import Mail, Message
from flask import current_app
from datetime import datetime

mail = Mail()

def init_mail(app):
    """Initialize Flask-Mail with app configuration"""
    mail.init_app(app)

def send_reminder_email(user_email, reminder):
    """
    Send a reminder email to the user
    
    Args:
        user_email: User's email address
        reminder: Reminder object with title, date, time, description, type
    """
    try:
        # Format the date
        reminder_date = reminder.date.strftime('%B %d, %Y')  # e.g., "February 02, 2026"
        
        # Format time if available
        time_str = ""
        if reminder.time:
            time_str = f" at {reminder.time.strftime('%I:%M %p')}"  # e.g., "at 02:30 PM"
        
        # Email subject
        subject = f"Reminder: {reminder.title}"
        
        # Email body (plain text)
        body = f"""Hello,

This is a reminder about:

{reminder.title}

Date: {reminder_date}{time_str}
"""
        
        # Add description if available
        if reminder.description:
            body += f"\nDetails: {reminder.description}"
        
        # Add medication-specific info
        if reminder.type == 'medication' and reminder.pill_count:
            body += f"\n\nPill Count: {reminder.pill_count}"
        
        body += "\n\nBest regards,\nDental Tracker"
        
        # Create and send message
        msg = Message(
            subject=subject,
            recipients=[user_email],
            body=body
        )
        
        mail.send(msg)
        current_app.logger.info(f"Email sent successfully to {user_email} for reminder: {reminder.title}")
        return True
        
    except Exception as e:
        current_app.logger.error(f"Failed to send email to {user_email}: {str(e)}")
        return False
