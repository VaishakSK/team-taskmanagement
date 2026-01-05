import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Notification from '../components/Notification.jsx';
import '../Auth.css';

const Signup = () => {
  const navigate = useNavigate();
  const { signup, googleLogin } = useAuth();
  const [tab, setTab] = useState(0); // 0 for Email/Password, 1 for Google
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    secretKey: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const handleGoogleSignIn = async (response) => {
    setLoading(true);
    setError('');
    try {
      const result = await googleLogin(response.credential);
      if (result.success && result.email) {
        // Show notification and redirect to OTP page
        setNotificationMessage('OTP sent to your email! Redirecting to verification...');
        setShowNotification(true);
        setTimeout(() => {
          navigate('/verify-otp', { 
            state: { 
              email: result.email, 
              authType: 'google' 
            } 
          });
        }, 1500);
      } else {
        setError(result.error || 'Google signup failed');
      }
    } catch (err) {
      setError('An error occurred during Google signup');
    } finally {
      setLoading(false);
    }
  };

  const initializeGoogleSignIn = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!window.google || !googleClientId) {
      return;
    }

    const buttonElement = document.getElementById('google-signup-button');
    if (!buttonElement) {
      return;
    }

    buttonElement.innerHTML = '';

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleSignIn,
    });

    window.google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
      width: '100%',
      text: 'signup_with',
    });
  };

  useEffect(() => {
    if (document.getElementById('google-signin-script')) {
      if (window.google && tab === 1) {
        initializeGoogleSignIn();
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-signin-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google && tab === 1) {
        initializeGoogleSignIn();
      }
    };
  }, [tab]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.role === 'admin' && !formData.secretKey) {
      setError('Admin secret key is required');
      return;
    }

    if (formData.role === 'manager' && !formData.secretKey) {
      setError('Manager secret key is required');
      return;
    }

    setLoading(true);

    try {
      const result = await signup(
        formData.email,
        formData.password,
        formData.name,
        formData.role,
        formData.secretKey || undefined
      );

      if (result.success) {
        // Show notification and redirect to OTP page
        setNotificationMessage('OTP sent to your email! Redirecting to verification...');
        setShowNotification(true);
        setTimeout(() => {
          navigate('/verify-otp', {
            state: {
              email: formData.email,
              authType: 'signup',
              formData: {
                name: formData.name,
                password: formData.password,
                role: formData.role,
                secretKey: formData.secretKey,
              },
            },
          });
        }, 1500);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="homepage-header auth-homepage-header">
        <div className="homepage-header-content">
          <button
            type="button"
            className="homepage-logo-text homepage-logo-button"
            onClick={() => navigate('/')}
            aria-label="Go to homepage"
          >
            Task Manager
          </button>
        </div>
      </header>
      <div className="auth-container">
        {showNotification && (
          <Notification
            message={notificationMessage}
            type="success"
            onClose={() => setShowNotification(false)}
            duration={2000}
          />
        )}
        <div className="auth-content">
        <div className="auth-left-panel">
          <div className="auth-branding">
            <h1 className="auth-brand-title">Welcome!</h1>
            <p className="auth-brand-subtitle">
              Create your account and start managing your teams and tasks efficiently
            </p>
            <div className="auth-illustration">
              <div className="auth-illustration-icon">🚀</div>
            </div>
          </div>
        </div>
        <div className="auth-right-panel">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h2>Create Account</h2>
              <p>Sign up to get started</p>
            </div>

            <div className="tabs">
              <button
                className={`tab ${tab === 0 ? 'active' : ''}`}
                onClick={() => {
                  setTab(0);
                  setError('');
                  setSuccess('');
                }}
              >
                Email & Password
              </button>
              <button
                className={`tab ${tab === 1 ? 'active' : ''}`}
                onClick={() => {
                  setTab(1);
                  setError('');
                  setSuccess('');
                }}
              >
                Google Sign-Up
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {tab === 0 && (
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div className="password-input-container">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="Enter password (min 6 characters)"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <div className="password-input-container">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select
                    className="form-select"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <small className="form-hint">
                    {formData.role === 'employee' && 'No secret key required for employee role'}
                    {formData.role === 'manager' && 'Manager secret key is required'}
                    {formData.role === 'admin' && 'Admin secret key is required'}
                  </small>
                </div>

                {(formData.role === 'admin' || formData.role === 'manager') && (
                  <div className="form-group">
                    <label className="form-label">
                      {formData.role === 'admin' ? 'Admin' : 'Manager'} Secret Key *
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      name="secretKey"
                      value={formData.secretKey}
                      onChange={handleChange}
                      required={formData.role === 'admin' || formData.role === 'manager'}
                      placeholder={`Enter ${formData.role} secret key`}
                    />
                    <small className="form-hint">
                      Contact your administrator to obtain the {formData.role} secret key
                    </small>
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            )}

            {tab === 1 && (
              <div className="google-signin-container">
                <div id="google-signup-button" className="google-button-wrapper"></div>
                {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                  <div className="alert alert-warning">
                    Google Client ID not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file.
                  </div>
                )}
                <p className="text-center" style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
                  Sign up with your Google account
                </p>
              </div>
            )}

            <div className="auth-footer">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="link">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default Signup;
