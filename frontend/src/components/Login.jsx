import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaEnvelope, FaLock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { authAPI } from '../api/api';
import '../styles/Auth.css';
// Rest of the component...
const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);

    try {
      const response = await authAPI.login(formData.email, formData.password);
      
      // User info is stored in localStorage by the ProtectedRoute component
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            <FaSignInAlt />
          </div>
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your oral health account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">
              <FaEnvelope className="input-icon" />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <FaLock className="input-icon" />
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">
              Create one now
            </Link>
          </p>
          <p className="auth-note">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      <div className="auth-background">
        <div className="background-overlay">
          <h1>Oral Health Tracker</h1>
          <p>AI-Powered Dental Care & Habit Tracking</p>
          <div className="features-list">
            <div className="feature">
              <span className="feature-icon">🦷</span>
              <span>Daily Habit Tracking</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🤖</span>
              <span>AI Dental Analysis</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📈</span>
              <span>Progress Analytics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;