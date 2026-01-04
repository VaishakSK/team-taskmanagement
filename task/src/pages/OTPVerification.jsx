import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Notification from '../components/Notification.jsx';
import '../Auth.css';

const OTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifySignupOTP, verifyGoogleOTP } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [authType, setAuthType] = useState('signup');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      setAuthType(location.state.authType || 'signup');
    } else {
      navigate('/signup');
    }
  }, [location.state, navigate]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (i < 6) newOtp[i] = digit;
        });
        setOtp(newOtp);
        const nextEmptyIndex = newOtp.findIndex((val, i) => !val && i < digits.length);
        if (nextEmptyIndex !== -1) {
          inputRefs.current[nextEmptyIndex]?.focus();
        } else if (digits.length === 6) {
          inputRefs.current[5]?.focus();
        }
      });
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter a complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let result;
      if (authType === 'google') {
        result = await verifyGoogleOTP(email, otpString);
      } else {
        const formData = location.state?.formData;
        if (!formData) {
          setError('Signup data not found. Please signup again.');
          navigate('/signup');
          return;
        }
        result = await verifySignupOTP(
          email,
          otpString,
          formData.password,
          formData.name,
          formData.role,
          formData.secretKey
        );
      }

      if (result.success) {
        setSuccess('Verification successful! Redirecting...');
        setShowNotification(true);
        setNotificationMessage('Account verified! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(result.error);
        // Clear OTP on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('An error occurred during OTP verification');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
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
            <h1 className="auth-brand-title">Verify Email</h1>
            <p className="auth-brand-subtitle">
              We've sent a verification code to your email address
            </p>
            <div className="auth-illustration">
              <div className="auth-illustration-icon">🔐</div>
            </div>
          </div>
        </div>
        <div className="auth-right-panel">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h2>Email Verification</h2>
              <p>We've sent a 6-digit code to <strong>{email}</strong></p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleVerify} className="auth-form">
              <div className="form-group">
                <label className="form-label">Enter Verification Code</label>
                <div className="otp-container">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      className="otp-box"
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      maxLength={1}
                      autoFocus={index === 0}
                      disabled={loading}
                    />
                  ))}
                </div>
                <small className="form-hint">Enter the 6-digit code sent to your email</small>
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={loading || otp.join('').length !== 6}>
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    <span style={{ marginLeft: '8px' }}>Verifying...</span>
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                Didn't receive the code?{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate(authType === 'google' ? '/login' : '/signup')}
                >
                  Go back to {authType === 'google' ? 'login' : 'signup'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
