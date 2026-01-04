import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        const response = await axios.get(`${API_URL}/api/auth/me`);
        setUser(response.data.user);
        setToken(storedToken);
      } catch (error) {
        console.error('Error fetching user:', error);
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        delete axios.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    delete axios.defaults.headers.common['Authorization'];
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const googleLogin = async (idToken) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/google`, {
        idToken,
      });
      
      // If user is existing and verified, sign them in directly
      if (response.data.token && response.data.user) {
        const { token: newToken, user: userData, refreshToken } = response.data;
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        return { success: true, message: response.data.message || 'Login successful' };
      }
      
      // If new user or unverified, return email for OTP verification
      return { success: true, message: response.data.message, email: response.data.email };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Google login failed',
      };
    }
  };

  const verifyGoogleOTP = async (email, otp) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/google-verify-otp`, {
        email,
        otp,
      });
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'OTP verification failed',
      };
    }
  };

  const sendOTP = async (email) => {
    try {
      await axios.post(`${API_URL}/api/auth/send-otp`, { email });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to send OTP',
      };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        email,
        otp,
      });
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'OTP verification failed',
      };
    }
  };

  const signup = async (email, password, name, role, secretKey) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, {
        email,
        password,
        name,
        role,
        secretKey,
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Signup failed',
      };
    }
  };

  const verifySignupOTP = async (email, otp, password, name, role, secretKey) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup-verify-otp`, {
        email,
        otp,
      });
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'OTP verification failed',
      };
    }
  };

      const value = {
        user,
        token,
        loading,
        login,
        signup,
        verifySignupOTP,
        googleLogin,
        verifyGoogleOTP,
        sendOTP,
        verifyOTP,
        logout,
        isAdmin: user?.role === 'admin',
        isManager: user?.role === 'manager' || user?.role === 'admin',
        isEmployee: user?.role === 'employee',
      };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
