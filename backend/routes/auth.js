const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const otpGenerator = require('otp-generator');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const { sendOTP } = require('../utils/email');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Login with email and password
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      if (!user.password) {
        return res.status(401).json({ error: 'Please use Google Sign-In for this account' });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.email_verified) {
        return res.status(401).json({ error: 'Please verify your email first' });
      }

      const token = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      res.json({
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error during login' });
    }
  }
);

// Google Sign-In/Signup - Send OTP (does not sign in immediately)
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // Check if verified user already exists
    const existingUser = await pool.query(
      'SELECT id, email_verified, google_id, name, role FROM users WHERE email = $1',
      [email]
    );

    // If user exists and is verified, sign them in directly (no OTP for login)
    if (existingUser.rows.length > 0 && existingUser.rows[0].email_verified) {
      const user = existingUser.rows[0];
      
      // Update Google ID if not set
      if (!user.google_id) {
        await pool.query(
          'UPDATE users SET google_id = $1 WHERE email = $2',
          [googleId, email]
        );
      }

      // Generate tokens and sign in directly
      const token = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      return res.json({
        token,
        refreshToken,
        user: {
          id: user.id,
          email: email,
          name: user.name,
          role: user.role,
        },
        message: 'Login successful',
      });
    }

    // Generate OTP for new user or unverified user
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (existingUser.rows.length > 0) {
      // Update existing unverified user
      await pool.query(
        `UPDATE users SET name = $1, google_id = $2, email_verified = false, otp = $3, otp_expires_at = $4 WHERE email = $5`,
        [name, googleId, otp, expiresAt, email]
      );
    } else {
      // Create new unverified user
      await pool.query(
        `INSERT INTO users (email, name, google_id, email_verified, role, otp, otp_expires_at)
         VALUES ($1, $2, $3, false, 'employee', $4, $5)`,
        [email, name, googleId, otp, expiresAt]
      );
    }

    // Send OTP email synchronously to catch errors
    try {
      await sendOTP(email, otp);
      console.log('OTP sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send OTP email for Google signup:', emailError);
      return res.status(500).json({ 
        error: 'Failed to send OTP email. Please try again.',
        details: emailError.message 
      });
    }

    // Return immediately after storing OTP
    res.json({ 
      message: 'OTP sent to your email. Please verify to complete signup.',
      requiresOTP: true,
      email: email
    });
  } catch (error) {
    console.error('Google Sign-In error:', error);
    
    // Provide more specific error messages
    if (error.message && error.message.includes('Invalid token')) {
      return res.status(401).json({ error: 'Invalid Google token. Please try signing in again.' });
    }
    
    if (error.message && error.message.includes('audience')) {
      return res.status(400).json({ 
        error: 'Google OAuth configuration error. Please check your Google Client ID.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Server error during Google Sign-In',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify Google OTP and sign in/signup
router.post(
  '/google-verify-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otp } = req.body;

      // Find user by email
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found. Please try again.' });
      }

      const user = result.rows[0];

      // Verify OTP
      if (!user.otp || user.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // Check if OTP has expired
      if (new Date() > new Date(user.otp_expires_at)) {
        return res.status(400).json({ error: 'OTP has expired. Please try again.' });
      }

      // Activate user and clear OTP
      await pool.query(
        `UPDATE users SET email_verified = true, otp = NULL, otp_expires_at = NULL WHERE id = $1`,
        [user.id]
      );

      // Generate tokens
      const token = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      res.json({
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        message: 'Verification successful',
      });
    } catch (error) {
      console.error('Google OTP verification error:', error);
      res.status(500).json({ error: 'Server error during OTP verification' });
    }
  }
);

// Send OTP
router.post(
  '/send-otp',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await pool.query(
        `UPDATE users SET otp = $1, otp_expires_at = $2 WHERE email = $3`,
        [otp, expiresAt, email]
      );

      // Send OTP email synchronously to catch errors
      try {
        await sendOTP(email, otp);
        console.log('OTP sent successfully to:', email);
      } catch (emailError) {
        console.error('Failed to send OTP email:', emailError);
        return res.status(500).json({ 
          error: 'Failed to send OTP email. Please try again.',
          details: emailError.message 
        });
      }

      res.json({ message: 'OTP sent to your email' });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  }
);

// Verify OTP
router.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otp } = req.body;

      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      if (!user.otp || user.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      if (new Date() > new Date(user.otp_expires_at)) {
        return res.status(400).json({ error: 'OTP has expired' });
      }

      await pool.query(
        `UPDATE users SET email_verified = true, otp = NULL, otp_expires_at = NULL WHERE id = $1`,
        [user.id]
      );

      const token = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      res.json({
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ error: 'Server error during OTP verification' });
    }
  }
);

// Signup/Register - Send OTP (does not create user yet)
router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('role').isIn(['admin', 'manager', 'employee']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role, secretKey } = req.body;

      // Validate secret key for admin and manager roles
      if (role === 'admin') {
        if (!secretKey) {
          return res.status(400).json({ error: 'Admin secret key is required' });
        }
        if (secretKey !== process.env.ADMIN_SECRET_KEY) {
          return res.status(403).json({ error: 'Invalid admin secret key' });
        }
      } else if (role === 'manager') {
        if (!secretKey) {
          return res.status(400).json({ error: 'Manager secret key is required' });
        }
        if (secretKey !== process.env.MANAGER_SECRET_KEY) {
          return res.status(403).json({ error: 'Invalid manager secret key' });
        }
      }

      // Check if verified user already exists
      const existingUser = await pool.query(
        'SELECT id, email_verified FROM users WHERE email = $1',
        [email]
      );
      if (existingUser.rows.length > 0 && existingUser.rows[0].email_verified) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Hash password for temporary storage
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate OTP
      const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create or update temporary user with email_verified=false and OTP stored
      // This user will be verified and activated after OTP verification
      if (existingUser.rows.length > 0) {
        // Update existing unverified user
        await pool.query(
          `UPDATE users SET password = $1, name = $2, role = $3, email_verified = false, otp = $4, otp_expires_at = $5 WHERE email = $6`,
          [hashedPassword, name, role, otp, expiresAt, email]
        );
      } else {
        // Create new unverified user
        await pool.query(
          `INSERT INTO users (email, password, name, role, email_verified, otp, otp_expires_at)
           VALUES ($1, $2, $3, $4, false, $5, $6)`,
          [email, hashedPassword, name, role, otp, expiresAt]
        );
      }

      // Send OTP email synchronously to catch errors
      try {
        await sendOTP(email, otp);
        console.log('OTP sent successfully to:', email);
      } catch (emailError) {
        console.error('Failed to send OTP email for signup:', emailError);
        return res.status(500).json({ 
          error: 'Failed to send OTP email. Please try again.',
          details: emailError.message 
        });
      }

      // Return immediately after storing OTP
      res.json({ message: 'OTP sent to your email. Please verify to complete signup.' });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Server error during signup' });
    }
  }
);

// Verify OTP and complete signup
router.post(
  '/signup-verify-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otp } = req.body;

      // Find user by email
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found. Please signup again.' });
      }

      const user = result.rows[0];

      // Check if user is already verified
      if (user.email_verified) {
        return res.status(400).json({ error: 'Email already verified. Please login instead.' });
      }

      // Verify OTP
      if (!user.otp || user.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // Check if OTP has expired
      if (new Date() > new Date(user.otp_expires_at)) {
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      // Activate user and clear OTP
      await pool.query(
        `UPDATE users SET email_verified = true, otp = NULL, otp_expires_at = NULL WHERE id = $1`,
        [user.id]
      );

      // Generate tokens
      const token = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      res.json({
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        message: 'Account created successfully',
      });
    } catch (error) {
      console.error('Signup OTP verification error:', error);
      res.status(500).json({ error: 'Server error during OTP verification' });
    }
  }
);

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const { verifyRefreshToken } = require('../utils/jwt');
    const decoded = verifyRefreshToken(refreshToken);

    const result = await pool.query('SELECT id FROM users WHERE id = $1', [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newToken = generateToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test email endpoint (for debugging)
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required for testing' });
    }

    const testOtp = '123456';
    await sendOTP(email, testOtp);
    
    console.log('Test email sent successfully to:', email);
    res.json({ 
      message: 'Test email sent successfully',
      email: email,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ 
      error: 'Email configuration error', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
