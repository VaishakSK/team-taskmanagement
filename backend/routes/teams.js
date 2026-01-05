const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// Get all teams
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT t.*, 
             u.name as manager_name,
             u.email as manager_email,
             COUNT(DISTINCT tm.user_id) as member_count
      FROM teams t
      LEFT JOIN users u ON t.manager_id = u.id
      LEFT JOIN team_members tm ON t.id = tm.team_id
    `;

    // All users can see all teams
    // No role-based filtering for viewing teams
    query += ` GROUP BY t.id, u.name, u.email ORDER BY t.created_at DESC`;
    const result = await pool.query(query);
    res.json({ teams: result.rows });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get team by ID with members
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee has access to this team
    if (req.user.role === 'employee') {
      const memberCheck = await pool.query(
        'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const teamResult = await pool.query(
      `SELECT t.*, u.name as manager_name, u.email as manager_email
       FROM teams t
       LEFT JOIN users u ON t.manager_id = u.id
       WHERE t.id = $1`,
      [id]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const membersResult = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, tm.joined_at
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at DESC`,
      [id]
    );

    res.json({
      team: teamResult.rows[0],
      members: membersResult.rows,
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create team (Admin/Manager only)
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('name').notEmpty().withMessage('Team name is required'),
    body('description').optional(),
    body('manager_id')
      .optional()
      .custom((value) => {
        // If value is null, undefined, or empty string, it's valid (optional)
        if (value === null || value === undefined || value === '') {
          return true;
        }
        // If provided, must be a valid integer
        const num = Number(value);
        return Number.isInteger(num) && !isNaN(num);
      })
      .withMessage('Manager ID must be an integer'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, manager_id, member_ids } = req.body;
      
      // Convert manager_id to integer or null, or use current user if manager
      let finalManagerId = null;
      if (manager_id && manager_id !== '' && manager_id !== null) {
        const parsedId = parseInt(manager_id);
        if (!isNaN(parsedId)) {
          finalManagerId = parsedId;
        }
      }
      // If no manager_id provided and user is a manager, set it to current user
      if (!finalManagerId && req.user.role === 'manager') {
        finalManagerId = req.user.id;
      }

      if (finalManagerId) {
        const managerCheck = await pool.query(
          'SELECT role FROM users WHERE id = $1',
          [finalManagerId]
        );
        if (managerCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Manager not found' });
        }
        if (!['admin', 'manager'].includes(managerCheck.rows[0].role)) {
          return res.status(400).json({ error: 'Manager must be an admin or manager role' });
        }
      }

      const result = await pool.query(
        `INSERT INTO teams (name, description, manager_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, description || null, finalManagerId]
      );

      const team = result.rows[0];

      // Add members if provided
      if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
        for (const memberId of member_ids) {
          await pool.query(
            'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [team.id, memberId]
          );
        }
      }

      // Log activity
      try {
        const memberCount = member_ids && member_ids.length > 0 ? member_ids.length : 0;
        await logActivity(
          req,
          'team_created',
          'team',
          team.id,
          `Created team "${name}" with ${memberCount} member${memberCount !== 1 ? 's' : ''}`,
          { team_id: team.id, name, member_count: memberCount }
        );
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      res.status(201).json({ team });
    } catch (error) {
      console.error('Create team error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update team (Admin/Manager only)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('name').optional().notEmpty().withMessage('Team name cannot be empty'),
    body('description').optional(),
    body('manager_id').optional().isInt().withMessage('Manager ID must be an integer'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, description, manager_id } = req.body;

      // Managers and Admins can update any team (authorize middleware already ensures only admin/manager can access this route)
      // No additional restrictions needed - if they reached this route, they have permission

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }

      if (manager_id) {
        const managerCheck = await pool.query(
          'SELECT role FROM users WHERE id = $1',
          [manager_id]
        );
        if (managerCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Manager not found' });
        }
        if (!['admin', 'manager'].includes(managerCheck.rows[0].role)) {
          return res.status(400).json({ error: 'Manager must be an admin or manager role' });
        }
        updates.push(`manager_id = $${paramCount++}`);
        values.push(manager_id);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE teams SET ${updates.join(', ')} 
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const updatedTeam = result.rows[0];

      // Log activity
      try {
        const changes = [];
        if (name && name !== team.name) changes.push(`name: "${team.name}" → "${name}"`);
        if (description !== undefined && description !== team.description) changes.push('description updated');
        if (manager_id !== undefined && manager_id !== team.manager_id) {
          const oldManager = team.manager_id ? (await pool.query('SELECT name FROM users WHERE id = $1', [team.manager_id])).rows[0]?.name : 'None';
          const newManager = manager_id ? (await pool.query('SELECT name FROM users WHERE id = $1', [manager_id])).rows[0]?.name : 'None';
          changes.push(`manager: ${oldManager} → ${newManager}`);
        }

        if (changes.length > 0) {
          await logActivity(
            req,
            'team_updated',
            'team',
            id,
            `Updated team "${updatedTeam.name || team.name}": ${changes.join(', ')}`,
            { team_id: id, changes }
          );
        }
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      res.json({ team: updatedTeam });
    } catch (error) {
      console.error('Update team error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete team (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM teams WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add member to team (Admin/Manager only)
router.post(
  '/:id/members',
  authenticate,
  authorize('admin', 'manager'),
  [body('user_id').isInt().withMessage('User ID must be an integer')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { user_id } = req.body;

      // Managers can only add members to teams they manage
      if (req.user.role === 'manager') {
        const teamCheck = await pool.query(
          'SELECT manager_id FROM teams WHERE id = $1',
          [id]
        );
        if (teamCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Team not found' });
        }
        if (teamCheck.rows[0].manager_id !== req.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      await pool.query(
        'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, user_id]
      );

      // Log activity
      try {
        const user = await pool.query('SELECT name FROM users WHERE id = $1', [user_id]);
        const team = await pool.query('SELECT name FROM teams WHERE id = $1', [id]);
        await logActivity(
          req,
          'team_member_added',
          'team',
          id,
          `Added ${user.rows[0]?.name || 'user'} to team "${team.rows[0]?.name || 'team'}"`,
          { team_id: id, user_id, team_name: team.rows[0]?.name, user_name: user.rows[0]?.name }
        );
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      res.json({ message: 'Member added to team successfully' });
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Remove member from team (Admin/Manager only)
router.delete(
  '/:id/members/:userId',
  authenticate,
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      const { id, userId } = req.params;

      // Managers can only remove members from teams they manage
      if (req.user.role === 'manager') {
        const teamCheck = await pool.query(
          'SELECT manager_id FROM teams WHERE id = $1',
          [id]
        );
        if (teamCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Team not found' });
        }
        if (teamCheck.rows[0].manager_id !== req.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const result = await pool.query(
        'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Member not found in team' });
      }

      // Log activity
      const user = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      const team = await pool.query('SELECT name FROM teams WHERE id = $1', [id]);
      await logActivity(
        req,
        'team_member_removed',
        'team',
        id,
        `Removed ${user.rows[0]?.name || 'user'} from team "${team.rows[0]?.name || 'team'}"`,
        { team_id: id, user_id: userId, team_name: team.rows[0]?.name, user_name: user.rows[0]?.name }
      );

      // Log activity
      try {
        const user = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
        const team = await pool.query('SELECT name FROM teams WHERE id = $1', [id]);
        await logActivity(
          req,
          'team_member_removed',
          'team',
          id,
          `Removed ${user.rows[0]?.name || 'user'} from team "${team.rows[0]?.name || 'team'}"`,
          { team_id: id, user_id: userId, team_name: team.rows[0]?.name, user_name: user.rows[0]?.name }
        );
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      res.json({ message: 'Member removed from team successfully' });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
