import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Notification from '../components/Notification.jsx';
import '../Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { user, login, googleLogin } = useAuth();
  const [tab, setTab] = useState(0); // 0 for Email/Password, 1 for Google
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      if (result.success) {
        if (result.email) {
          // New user or unverified - show notification and redirect to OTP page
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
          // Existing verified user - show notification and redirect
          setNotificationMessage('Login successful! Redirecting...');
          setShowNotification(true);
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        }
      } else {
        setError(result.error || 'Google login failed');
      }
    } catch (err) {
      setError('An error occurred during Google login');
    } finally {
      setLoading(false);
    }
  };

  const initializeGoogleSignIn = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!window.google || !googleClientId) {
      return;
    }

    const buttonElement = document.getElementById('google-signin-button');
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
      text: 'signin_with',
    });
  };

  useEffect(() => {
    if (user && user.id) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Load Google Sign-In script only when Google tab is active
    if (tab === 1) {
      if (document.getElementById('google-signin-script')) {
        if (window.google) {
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
        if (window.google) {
          initializeGoogleSignIn();
        }
      };
    }
  }, [tab]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      setNotificationMessage('Login successful! Redirecting...');
      setShowNotification(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } else {
      setError(result.error);
    }
  };

  return (
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
            <h1 className="auth-brand-title">Welcome Back!</h1>
            <p className="auth-brand-subtitle">
              Sign in to continue managing your teams and tasks
            </p>
            <div className="auth-illustration">
              <div className="auth-illustration-icon">✨</div>
            </div>
          </div>
        </div>
        <div className="auth-right-panel">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h2>Sign In</h2>
              <p>Enter your credentials to access your account</p>
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
                Google Sign-In
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {tab === 0 && (
              <form onSubmit={handleEmailLogin} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
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
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      <span>Signing In...</span>
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            )}

            {tab === 1 && (
              <div className="google-signin-container">
                <div id="google-signin-button" className="google-button-wrapper"></div>
                {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                  <div className="alert alert-warning">
                    Google Client ID not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file.
                  </div>
                )}
                <p className="text-center" style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
                  Sign in with your Google account
                </p>
              </div>
            )}

            <div className="auth-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/signup" className="link">
                  Sign up here
                </Link>
              </p>
              <p className="text-small" style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Default Admin: admin@example.com / admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
