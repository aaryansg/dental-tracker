import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserPlus, FaUser, FaEnvelope, FaLock, FaCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { authAPI } from '../api/api';
import '../styles/Auth.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Calculate password strength
    if (name === 'password') {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    if (passwordStrength < 3) {
      toast.error('Please use a stronger password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      await authAPI.register(
        formData.username,
        formData.email,
        formData.password
      );
      
      toast.success('Account created successfully! Please sign in.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Signup failed. Please try again.');
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return '#e2e8f0';
    if (passwordStrength === 1) return '#fc8181';
    if (passwordStrength === 2) return '#f6ad55';
    if (passwordStrength === 3) return '#68d391';
    return '#38a169';
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            <FaUserPlus />
          </div>
          <h2>Create Account</h2>
          <p className="auth-subtitle">Start your oral health journey</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">
              <FaUser className="input-icon" />
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Choose a username"
              disabled={loading}
            />
          </div>

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
              placeholder="Create a strong password"
              disabled={loading}
            />
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill"
                    style={{
                      width: `${passwordStrength * 25}%`,
                      backgroundColor: getPasswordStrengthColor()
                    }}
                  />
                </div>
                <div className="strength-text">
                  {passwordStrength === 0 && 'Weak'}
                  {passwordStrength === 1 && 'Fair'}
                  {passwordStrength === 2 && 'Good'}
                  {passwordStrength === 3 && 'Strong'}
                  {passwordStrength === 4 && 'Very Strong'}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <FaCheck className="input-icon" />
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              disabled={loading}
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="error-text">Passwords do not match</p>
            )}
          </div>

          <div className="password-requirements">
            <p>Password must contain:</p>
            <ul>
              <li className={formData.password.length >= 8 ? 'met' : ''}>
                At least 8 characters
              </li>
              <li className={/[A-Z]/.test(formData.password) ? 'met' : ''}>
                One uppercase letter
              </li>
              <li className={/[0-9]/.test(formData.password) ? 'met' : ''}>
                One number
              </li>
              <li className={/[^A-Za-z0-9]/.test(formData.password) ? 'met' : ''}>
                One special character
              </li>
            </ul>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      <div className="auth-background">
        <div className="background-overlay">
          <h1>Join Our Community</h1>
          <p>Track, Analyze, and Improve Your Oral Health</p>
          <div className="benefits-list">
            <div className="benefit">
              <span className="benefit-icon">📱</span>
              <div className="benefit-content">
                <h4>Daily Tracking</h4>
                <p>Track brushing and flossing habits</p>
              </div>
            </div>
            <div className="benefit">
              <span className="benefit-icon">🤖</span>
              <div className="benefit-content">
                <h4>AI Analysis</h4>
                <p>Get personalized dental insights</p>
              </div>
            </div>
            <div className="benefit">
              <span className="benefit-icon">🏆</span>
              <div className="benefit-content">
                <h4>Streaks & Goals</h4>
                <p>Stay motivated with achievements</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;