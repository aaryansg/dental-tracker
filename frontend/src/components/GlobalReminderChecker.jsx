import { useState, useEffect } from 'react';
import { remindersAPI } from '../api/api';

// GlobalReminderChecker - keeps reminder data fresh but doesn't show notifications
// TodaysReminders component handles the actual display now

const GlobalReminderChecker = () => {
    useEffect(() => {
        // Check for upcoming reminders every 5 minutes to keep cache fresh
        const interval = setInterval(checkUpcomingReminders, 300000);
        checkUpcomingReminders(); // Check immediately on mount
        return () => clearInterval(interval);
    }, []);

    const checkUpcomingReminders = async () => {
        try {
            // Just make the API call to keep data fresh
            // TodaysReminders component handles display
            await remindersAPI.getUpcomingReminders(1);
        } catch (error) {
            console.error('Error checking reminders:', error);
        }
    };

    return null; // This component doesn't render anything
};

export default GlobalReminderChecker;
