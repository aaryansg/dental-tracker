import axios from 'axios';

const baseURL = process.env.NODE_ENV === 'production'
  ? window.location.origin
  : 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: `${baseURL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
const login = (email, password) => {
  return apiClient.post('/login', { email, password });
};

const signup = (username, email, password) => {
  return apiClient.post('/register', { username, email, password });
};

const logout = () => {
  return apiClient.post('/logout');
};

const checkAuth = () => {
  return apiClient.get('/check-auth');
};

// Habits API
const getTodayHabit = () => {
  return apiClient.get('/habits/today');
};

const updateHabit = (habitData) => {
  return apiClient.post('/habits/today', habitData);
};

const getStreak = () => {
  return apiClient.get('/habits/streak');
};

const getHistory = (days = 7) => {
  return apiClient.get(`/habits/history?days=${days}`);
};

// Profile API
const getProfile = () => {
  return apiClient.get('/profile');
};

// AI Checkup API
const uploadImage = (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);

  return apiClient.post('/ai-checkup', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

const getCheckupHistory = () => {
  return apiClient.get('/ai-checkup/history');
};

const getCheckupDetails = (checkupId) => {
  return apiClient.get(`/ai-checkup/${checkupId}`);
};

// Model health check
const getModelHealth = () => {
  return apiClient.get('/model-health');
};

// Test model endpoint
const testModel = () => {
  return apiClient.get('/test-model');
};

// Reminders API
const getReminders = () => {
  return apiClient.get('/reminders');
};

const createReminder = (reminderData) => {
  return apiClient.post('/reminders', reminderData);
};

const getReminder = (reminderId) => {
  return apiClient.get(`/reminders/${reminderId}`);
};

const updateReminder = (reminderId, reminderData) => {
  return apiClient.put(`/reminders/${reminderId}`, reminderData);
};

const deleteReminder = (reminderId) => {
  return apiClient.delete(`/reminders/${reminderId}`);
};

const getUpcomingReminders = (days = 7) => {
  return apiClient.get(`/reminders/upcoming?days=${days}`);
};

const clearAllReminders = () => {
  return apiClient.delete('/reminders');
};

// Export all API functions
export const authAPI = {
  login,
  signup,
  register: signup, // Alias for signup
  logout,
  checkAuth,
};

export const habitsAPI = {
  getTodayHabit,
  updateHabit,
  getStreak,
  getHistory,
};

export const profileAPI = {
  getProfile,
};

export const aiCheckupAPI = {
  uploadImage,
  getHistory: getCheckupHistory,
  getCheckupDetails,
  getModelHealth,
  testModel,
};

export const remindersAPI = {
  getReminders,
  createReminder,
  getReminder,
  updateReminder,
  deleteReminder,
  getUpcomingReminders,
  clearAllReminders,
};

export default apiClient;