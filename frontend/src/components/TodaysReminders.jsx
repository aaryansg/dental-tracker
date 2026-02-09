import { useState, useEffect } from 'react';
import { remindersAPI } from '../api/api';
import '../styles/TodaysReminders.css';

const TodaysReminders = () => {
    const [todaysReminders, setTodaysReminders] = useState([]);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        loadTodaysReminders();
        // Refresh every 5 minutes
        const interval = setInterval(loadTodaysReminders, 300000);
        return () => clearInterval(interval);
    }, []);

    const loadTodaysReminders = async () => {
        try {
            const response = await remindersAPI.getUpcomingReminders(0); // Today only
            const now = new Date();
            const today = now.toISOString().split('T')[0];

            const filtered = response.data.reminders.filter(
                r => r.date === today && !r.completed
            );
            setTodaysReminders(filtered);
        } catch (error) {
            console.error('Error loading today\'s reminders:', error);
        }
    };

    if (todaysReminders.length === 0) return null;

    return (
        <div className={`todays-reminders ${expanded ? 'expanded' : ''}`}>
            <div className="reminders-header" onClick={() => setExpanded(!expanded)}>
                <span className="reminders-count">{todaysReminders.length}</span>
                <span className="reminders-label">Today</span>
                <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
            </div>

            {expanded && (
                <div className="reminders-list-compact">
                    {todaysReminders.map(reminder => (
                        <div key={reminder.id} className={`reminder-item ${reminder.type}`}>
                            <span className="reminder-icon-small">
                                {reminder.type === 'appointment' ? '🦷' : '💊'}
                            </span>
                            <div className="reminder-details">
                                <div className="reminder-title-small">{reminder.title}</div>
                                {reminder.time && (
                                    <div className="reminder-time-small">{reminder.time}</div>
                                )}
                                {reminder.type === 'medication' && reminder.pill_count && (
                                    <div className="reminder-pills">{reminder.pill_count} pill{reminder.pill_count > 1 ? 's' : ''}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TodaysReminders;
