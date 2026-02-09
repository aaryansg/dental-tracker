import React, { useState, useEffect } from 'react';
import {
  FaUser,
  FaEnvelope,
  FaCalendar,
  FaCog,
  FaBell,
  FaShieldAlt,
  FaQuestionCircle,
  FaSignOutAlt,
  FaEdit,
  FaCheck
} from 'react-icons/fa';
import Sidebar from './Sidebar';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/api';
import toast from 'react-hot-toast';
import '../styles/Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    notifications: true,
    emailNotifications: true
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data;
      setUser(userData);
      setFormData({
        username: userData.username,
        email: userData.email,
        notifications: true,
        emailNotifications: true
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      // Update profile API call would go here
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, still logout locally
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="main-content">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="main-content">
        <header className="profile-header">
          <h1>My Profile</h1>
          <p className="profile-subtitle">
            Manage your account settings and preferences
          </p>
        </header>

        <div className="profile-container">
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-header-section">
              <div className="avatar-section">
                <div className="avatar">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="avatar-info">
                  <h2>{user?.username}</h2>
                  <p className="member-since">
                    <FaCalendar className="icon" />
                    Member since {new Date(user?.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {editing ? (
                <div className="edit-actions">
                  <button className="btn btn-success" onClick={handleSave}>
                    <FaCheck /> Save Changes
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        username: user.username,
                        email: user.email,
                        notifications: true,
                        emailNotifications: true
                      });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => setEditing(true)}
                >
                  <FaEdit /> Edit Profile
                </button>
              )}
            </div>

            <div className="profile-details">
              <div className="detail-group">
                <label>
                  <FaUser className="icon" />
                  Username
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="profile-input"
                  />
                ) : (
                  <p className="detail-value">{user?.username}</p>
                )}
              </div>

              <div className="detail-group">
                <label>
                  <FaEnvelope className="icon" />
                  Email Address
                </label>
                {editing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="profile-input"
                  />
                ) : (
                  <p className="detail-value">{user?.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Settings Sections */}
          <div className="settings-grid">
            {/* Notification Settings */}
            <div className="settings-card">
              <div className="settings-header">
                <FaBell className="settings-icon" />
                <h3>Notification Settings</h3>
              </div>

              <div className="settings-options">
                <div className="setting-option">
                  <div className="option-info">
                    <h4>Push Notifications</h4>
                    <p>Receive daily reminders and streak notifications</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      name="notifications"
                      checked={formData.notifications}
                      onChange={handleChange}
                      disabled={!editing}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-option">
                  <div className="option-info">
                    <h4>Email Notifications</h4>
                    <p>Receive weekly reports and health tips</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      name="emailNotifications"
                      checked={formData.emailNotifications}
                      onChange={handleChange}
                      disabled={!editing}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Account Settings */}
            <div className="settings-card">
              <div className="settings-header">
                <FaCog className="settings-icon" />
                <h3>Account Settings</h3>
              </div>

              <div className="settings-options">
                <button className="settings-btn">
                  <FaShieldAlt className="btn-icon" />
                  <div className="btn-content">
                    <h4>Privacy & Security</h4>
                    <p>Manage your privacy settings</p>
                  </div>
                </button>

                <button className="settings-btn">
                  <FaQuestionCircle className="btn-icon" />
                  <div className="btn-content">
                    <h4>Help & Support</h4>
                    <p>Get help with the app</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="stats-card">
            <h3>Your Activity</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">7</div>
                <div className="stat-label">Day Streak</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">24</div>
                <div className="stat-label">Total Checkups</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">85%</div>
                <div className="stat-label">Consistency</div>
              </div>
            </div>
          </div>

          {/* Logout Section */}
          <div className="logout-section">
            <button className="btn btn-danger logout-btn" onClick={handleLogout}>
              <FaSignOutAlt />
              Logout
            </button>
            <p className="logout-note">
              You can log back in anytime using your email and password
            </p>
          </div>

          {/* App Info */}
          <div className="app-info">
            <h4>Oral Health Tracker</h4>
            <p>Version 1.0.0</p>
            <p className="copyright">
              © 2024 Oral Health Tracker. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;