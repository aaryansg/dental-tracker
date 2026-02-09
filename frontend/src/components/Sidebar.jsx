import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaHome,
  FaRobot,
  FaUser,
  FaSignOutAlt,
  FaTooth,
  FaCalendarAlt,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import { authAPI } from '../api/api';
import toast from 'react-hot-toast';
import '../styles/Sidebar.css';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('user');
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        className={`mobile-menu-btn ${isOpen ? 'sidebar-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <FaTooth className="logo-icon" />
            <h2>Oral Health</h2>
          </div>
          <p className="tagline">AI-Powered Dental Care</p>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item" onClick={() => setIsOpen(false)}>
            <FaHome className="nav-icon" />
            <span>Dashboard</span>
          </Link>

          <Link to="/ai-checkup" className="nav-item" onClick={() => setIsOpen(false)}>
            <FaRobot className="nav-icon" />
            <span>AI Checkup</span>
          </Link>

          <Link to="/calendar" className="nav-item" onClick={() => setIsOpen(false)}>
            <FaCalendarAlt className="nav-icon" />
            <span>Calendar</span>
          </Link>

          <Link to="/profile" className="nav-item" onClick={() => setIsOpen(false)}>
            <FaUser className="nav-icon" />
            <span>Profile</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt className="nav-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;