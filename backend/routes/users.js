const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all users (Admin/Manager only - Managers need this to add team members)
router.get('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, email_verified, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user (Admin only)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').isIn(['admin', 'manager', 'employee']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role } = req.body;

      // Check if user already exists
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users (email, password, name, role, email_verified)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, email, name, role, created_at`,
        [email, hashedPassword, name, role]
      );

      res.status(201).json({ user: result.rows[0] });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && parseInt(id) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT id, email, name, role, email_verified, created_at 
       FROM users 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (Admin only) - Completely removes user and all related data
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Start transaction to ensure all deletions happen atomically
    await pool.query('BEGIN');

    try {
      // Delete team memberships (CASCADE will handle this, but being explicit)
      await pool.query('DELETE FROM team_members WHERE user_id = $1', [userId]);

      // Remove user as manager from teams (set to NULL)
      await pool.query('UPDATE teams SET manager_id = NULL WHERE manager_id = $1', [userId]);

      // Remove user assignments from tasks (set to NULL)
      await pool.query('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1', [userId]);
      await pool.query('UPDATE tasks SET created_by = NULL WHERE created_by = $1', [userId]);

      // Finally, delete the user (this will cascade to team_members if needed)
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);

      // Commit transaction
      await pool.query('COMMIT');

      res.json({ message: 'User and all associated data deleted successfully' });
    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error during user deletion' });
  }
});

// Update user
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('role').optional().isIn(['admin', 'manager', 'employee']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, role } = req.body;

      // Users can only update their own profile unless they're admin
      // Only admin can change roles
      if (req.user.role !== 'admin' && parseInt(id) !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (role && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can change roles' });
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }

      if (role && req.user.role === 'admin') {
        updates.push(`role = $${paramCount++}`);
        values.push(role);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} 
         WHERE id = $${paramCount}
         RETURNING id, email, name, role, email_verified, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: result.rows[0] });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
