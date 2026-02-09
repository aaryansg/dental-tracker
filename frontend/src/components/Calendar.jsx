import React, { useState, useEffect } from 'react';
import { remindersAPI } from '../api/api';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import '../styles/Calendar.css';

const Calendar = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [reminders, setReminders] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [formData, setFormData] = useState({
        type: 'appointment',
        title: '',
        description: '',
        date: '',
        time: '',
        frequency_days: '',
        pill_count: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null); // For daily view modal
    const [selectedDateReminders, setSelectedDateReminders] = useState([]);

    useEffect(() => {
        loadReminders();
    }, []);

    const loadReminders = async () => {
        try {
            const response = await remindersAPI.getReminders();
            setReminders(response.data.reminders);
            setLoading(false);
        } catch (error) {
            console.error('Error loading reminders:', error);
            toast.error('Failed to load reminders');
            setLoading(false);
        }
    };



    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.date) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            // Prepare data with proper types
            const submitData = {
                ...formData,
                frequency_days: formData.frequency_days ? parseInt(formData.frequency_days) : null,
                pill_count: formData.pill_count ? parseInt(formData.pill_count) : null
            };

            console.log('Submitting reminder with data:', submitData);

            if (editingId) {
                await remindersAPI.updateReminder(editingId, submitData);
                toast.success('Reminder updated successfully');
            } else {
                const response = await remindersAPI.createReminder(submitData);
                console.log('Create reminder response:', response.data);
                if (response.data.count && response.data.count > 1) {
                    toast.success(`${response.data.count} reminders created successfully!`);
                } else {
                    toast.success('Reminder created successfully');
                }
            }

            resetForm();
            loadReminders();
        } catch (error) {
            console.error('Error saving reminder:', error);
            toast.error('Failed to save reminder');
        }
    };

    const handleEdit = (reminder) => {
        setFormData({
            type: reminder.type,
            title: reminder.title,
            description: reminder.description || '',
            date: reminder.date,
            time: reminder.time || '',
            frequency_days: reminder.frequency_days || '',
            pill_count: reminder.pill_count || ''
        });
        setEditingId(reminder.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this reminder?')) {
            return;
        }

        try {
            await remindersAPI.deleteReminder(id);
            toast.success('Reminder deleted successfully');
            loadReminders();
        } catch (error) {
            console.error('Error deleting reminder:', error);
            toast.error('Failed to delete reminder');
        }
    };

    const handleToggleComplete = async (reminder) => {
        try {
            await remindersAPI.updateReminder(reminder.id, {
                ...reminder,
                completed: !reminder.completed
            });
            loadReminders();
            toast.success(reminder.completed ? 'Reminder marked as incomplete' : 'Reminder completed!');
        } catch (error) {
            console.error('Error updating reminder:', error);
            toast.error('Failed to update reminder');
        }
    };

    const resetForm = () => {
        setFormData({
            type: 'appointment',
            title: '',
            description: '',
            date: '',
            time: '',
            frequency_days: '',
            pill_count: ''
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleClearAll = async () => {
        if (!window.confirm('Are you sure you want to delete ALL reminders? This cannot be undone.')) {
            return;
        }

        try {
            const response = await remindersAPI.clearAllReminders();
            toast.success(response.data.message);
            loadReminders();
        } catch (error) {
            console.error('Error clearing reminders:', error);
            toast.error('Failed to clear reminders');
        }
    };

    const handleDayClick = (dateStr, dayReminders) => {
        setSelectedDate(dateStr);
        setSelectedDateReminders(dayReminders);
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek };
    };

    const renderCalendar = () => {
        const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const days = [];

        // Empty cells for days before the first of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayReminders = reminders.filter(r => r.date === dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            days.push(
                <div
                    key={day}
                    className={`calendar-day ${isToday ? 'today' : ''}`}
                    onClick={() => handleDayClick(dateStr, dayReminders)}
                    style={{ cursor: 'pointer' }}
                >
                    <span className="day-number">{day}</span>
                    {dayReminders.length > 0 && (
                        <div className="day-reminders">
                            {dayReminders.map(reminder => (
                                <div
                                    key={reminder.id}
                                    className={`reminder-dot ${reminder.type} ${reminder.completed ? 'completed' : ''}`}
                                    title={reminder.title}
                                ></div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return days;
    };

    const changeMonth = (delta) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const upcomingReminders = reminders
        .filter(r => !r.completed && new Date(r.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);

    return (
        <div className="app-layout">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            <div className="main-content">
                <div className="calendar-container">
                    <div className="calendar-header">
                        <h1>📅 Calendar & Reminders</h1>
                        <div className="header-buttons">
                            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                                {showForm ? 'Cancel' : '+ New Reminder'}
                            </button>
                            {reminders.length > 0 && (
                                <button className="btn-danger" onClick={handleClearAll}>
                                    🗑️ Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    {showForm && (
                        <div className="reminder-form-card">
                            <h2>{editingId ? 'Edit Reminder' : 'Create New Reminder'}</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="appointment">🦷 Dental Appointment</option>
                                        <option value="medication">💊 Medication</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g., Dentist checkup or Take calcium supplements"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Additional notes..."
                                        rows="3"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Date *</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Time (optional)</label>
                                        <input
                                            type="time"
                                            value={formData.time}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {formData.type === 'medication' && (
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Repeat Every (days)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.frequency_days}
                                                onChange={(e) => setFormData({ ...formData, frequency_days: e.target.value })}
                                                placeholder="e.g., 1 for daily, 2 for every 2 days"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Number of Doses (days)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.pill_count}
                                                onChange={(e) => setFormData({ ...formData, pill_count: e.target.value })}
                                                placeholder="e.g., 5 for 5 doses"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="form-actions">
                                    <button type="submit" className="btn-primary">
                                        {editingId ? 'Update Reminder' : 'Create Reminder'}
                                    </button>
                                    <button type="button" className="btn-secondary" onClick={resetForm}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="calendar-grid-container">
                        <div className="calendar-controls">
                            <button onClick={() => changeMonth(-1)}>←</button>
                            <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                            <button onClick={() => changeMonth(1)}>→</button>
                        </div>

                        <div className="calendar-grid">
                            <div className="calendar-weekdays">
                                <div>Sun</div>
                                <div>Mon</div>
                                <div>Tue</div>
                                <div>Wed</div>
                                <div>Thu</div>
                                <div>Fri</div>
                                <div>Sat</div>
                            </div>
                            <div className="calendar-days">
                                {renderCalendar()}
                            </div>
                        </div>
                    </div>

                    <div className="reminders-section">
                        <h2>Upcoming Reminders</h2>
                        {loading ? (
                            <p>Loading...</p>
                        ) : upcomingReminders.length === 0 ? (
                            <p className="no-reminders">No upcoming reminders</p>
                        ) : (
                            <div className="reminders-list">
                                {upcomingReminders.map(reminder => (
                                    <div key={reminder.id} className={`reminder-card ${reminder.type}`}>
                                        <div className="reminder-header">
                                            <div className="reminder-icon">
                                                {reminder.type === 'appointment' ? '🦷' : '💊'}
                                            </div>
                                            <div className="reminder-info">
                                                <h3>{reminder.title}</h3>
                                                <p className="reminder-date">
                                                    {new Date(reminder.date).toLocaleDateString('en-US', {
                                                        weekday: 'short',
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                    {reminder.time && ` at ${reminder.time}`}
                                                </p>
                                                {reminder.description && (
                                                    <p className="reminder-description">{reminder.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="reminder-actions">
                                            <button
                                                className="btn-complete"
                                                onClick={() => handleToggleComplete(reminder)}
                                            >
                                                {reminder.completed ? '↩️ Undo' : '✓ Complete'}
                                            </button>
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleEdit(reminder)}
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(reminder.id)}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {reminders.filter(r => r.completed).length > 0 && (
                            <>
                                <h2 style={{ marginTop: '2rem' }}>Completed Reminders</h2>
                                <div className="reminders-list">
                                    {reminders.filter(r => r.completed).map(reminder => (
                                        <div key={reminder.id} className={`reminder-card ${reminder.type} completed`}>
                                            <div className="reminder-header">
                                                <div className="reminder-icon">
                                                    {reminder.type === 'appointment' ? '🦷' : '💊'}
                                                </div>
                                                <div className="reminder-info">
                                                    <h3>{reminder.title}</h3>
                                                    <p className="reminder-date">
                                                        {new Date(reminder.date).toLocaleDateString('en-US', {
                                                            weekday: 'short',
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                        {reminder.time && ` at ${reminder.time}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="reminder-actions">
                                                <button
                                                    className="btn-complete"
                                                    onClick={() => handleToggleComplete(reminder)}
                                                >
                                                    ↩️ Undo
                                                </button>
                                                <button
                                                    className="btn-delete"
                                                    onClick={() => handleDelete(reminder.id)}
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Daily Reminder View Modal */}
                {selectedDate && (
                    <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Reminders for {new Date(selectedDate).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}</h2>
                                <button className="modal-close" onClick={() => setSelectedDate(null)}>✕</button>
                            </div>
                            <div className="modal-body">
                                {selectedDateReminders.length === 0 ? (
                                    <p className="no-reminders">No reminders for this day</p>
                                ) : (
                                    <div className="reminders-list">
                                        {selectedDateReminders.map(reminder => (
                                            <div key={reminder.id} className={`reminder-card ${reminder.type} ${reminder.completed ? 'completed' : ''}`}>
                                                <div className="reminder-header">
                                                    <div className="reminder-icon">
                                                        {reminder.type === 'appointment' ? '🦷' : '💊'}
                                                    </div>
                                                    <div className="reminder-info">
                                                        <h3>{reminder.title}</h3>
                                                        <p className="reminder-date">
                                                            {reminder.time && `at ${reminder.time}`}
                                                            {reminder.type === 'medication' && reminder.pill_count && (
                                                                <span style={{ marginLeft: '10px', color: '#10b981' }}>
                                                                    • {reminder.pill_count} pill{reminder.pill_count > 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                            {reminder.type === 'medication' && reminder.frequency_days && (
                                                                <span style={{ marginLeft: '10px', color: '#6b7280' }}>
                                                                    • Every {reminder.frequency_days} day{reminder.frequency_days > 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                        </p>
                                                        {reminder.description && (
                                                            <p className="reminder-description">{reminder.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="reminder-actions">
                                                    <button
                                                        className="btn-complete"
                                                        onClick={() => handleToggleComplete(reminder)}
                                                    >
                                                        {reminder.completed ? '↩️ Undo' : '✓ Complete'}
                                                    </button>
                                                    <button
                                                        className="btn-edit"
                                                        onClick={() => { handleEdit(reminder); setSelectedDate(null); }}
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => handleDelete(reminder.id)}
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Calendar;
