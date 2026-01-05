const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// Get all tasks
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT t.*,
             u1.name as assigned_to_name,
             u1.email as assigned_to_email,
             u2.name as created_by_name,
             tm.name as team_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN teams tm ON t.team_id = tm.id
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    // Employees can only see tasks assigned to them (including via task_assignees)
    if (req.user.role === 'employee') {
      // Check both assigned_to and task_assignees
      conditions.push(`(
        t.assigned_to = $${paramCount} 
        OR EXISTS (
          SELECT 1 FROM task_assignees ta 
          WHERE ta.task_id = t.id AND ta.user_id = $${paramCount}
        )
      )`);
      values.push(req.user.id);
      paramCount++;
    }

    // Admins and Managers can see ALL tasks (no filtering)
    // Only employees are filtered above

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' OR ')}`;
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, values);
    const tasks = result.rows;

    // Fetch assignees for each task (handle case where table doesn't exist yet)
    for (const task of tasks) {
      try {
        const assigneesResult = await pool.query(
          `SELECT u.id, u.name, u.email
           FROM task_assignees ta
           JOIN users u ON ta.user_id = u.id
           WHERE ta.task_id = $1`,
          [task.id]
        );
        task.assignees = assigneesResult.rows;
      } catch (err) {
        // If table doesn't exist, use assigned_to as fallback
        if (err.code === '42P01') {
          task.assignees = task.assigned_to ? [{
            id: task.assigned_to,
            name: task.assigned_to_name,
            email: task.assigned_to_email
          }].filter(a => a.id) : [];
        } else {
          throw err;
        }
      }
    }

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get task by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*,
              u1.name as assigned_to_name,
              u1.email as assigned_to_email,
              u2.name as created_by_name,
              tm.name as team_name
       FROM tasks t
       LEFT JOIN users u1 ON t.assigned_to = u1.id
       LEFT JOIN users u2 ON t.created_by = u2.id
       LEFT JOIN teams tm ON t.team_id = tm.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = result.rows[0];

    // Fetch assignees (handle case where table doesn't exist yet)
    let assigneesResult;
    try {
      assigneesResult = await pool.query(
        `SELECT u.id, u.name, u.email
         FROM task_assignees ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.task_id = $1`,
        [id]
      );
      task.assignees = assigneesResult.rows;
    } catch (err) {
      // If table doesn't exist, use assigned_to as fallback
      if (err.code === '42P01') {
        task.assignees = task.assigned_to ? [{
          id: task.assigned_to,
          name: task.assigned_to_name,
          email: task.assigned_to_email
        }].filter(a => a.id && a.name) : [];
        assigneesResult = { rows: task.assignees };
      } else {
        throw err;
      }
    }

    // Check access permissions - all users can view tasks
    // Only employees are restricted to tasks assigned to them
    const assigneeIds = assigneesResult.rows.map(r => r.id);
    if (req.user.role === 'employee') {
      if (task.assigned_to !== req.user.id && !assigneeIds.includes(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    // Admins and Managers can view all tasks - no restriction needed

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task (Admin/Manager only)
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('title').notEmpty().withMessage('Task title is required'),
    body('description').optional(),
    body('assigned_to').optional().isInt().withMessage('Assigned to must be an integer'),
    body('team_id').optional().isInt().withMessage('Team ID must be an integer'),
    body('due_date').optional().isISO8601().withMessage('Invalid date format'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, assigned_to, assigned_user_ids, team_id, due_date } = req.body;

      // Verify team if provided
      let teamMembers = [];
      if (team_id) {
        const teamCheck = await pool.query('SELECT * FROM teams WHERE id = $1', [team_id]);
        if (teamCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Team not found' });
        }

        // Managers can only create tasks in teams they manage
        if (req.user.role === 'manager' && teamCheck.rows[0].manager_id !== req.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Get team members
        const membersResult = await pool.query(
          'SELECT user_id FROM team_members WHERE team_id = $1',
          [team_id]
        );
        teamMembers = membersResult.rows.map(r => r.user_id);
      }

      // Handle multiple assignees (assigned_user_ids takes precedence over assigned_to)
      const assigneeIds = assigned_user_ids && Array.isArray(assigned_user_ids) && assigned_user_ids.length > 0
        ? assigned_user_ids
        : assigned_to ? [assigned_to] : [];

      // Validate all assignees are from the same team if team_id is provided
      if (team_id && assigneeIds.length > 0) {
        const invalidAssignees = assigneeIds.filter(id => !teamMembers.includes(parseInt(id)));
        if (invalidAssignees.length > 0) {
          return res.status(400).json({ 
            error: 'All assigned users must be members of the selected team' 
          });
        }
      }

      // Verify all assigned users exist
      if (assigneeIds.length > 0) {
        for (const userId of assigneeIds) {
          const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
          if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: `User with ID ${userId} not found` });
          }
        }
      }

      // Create task (keep assigned_to for backward compatibility, but use first assignee)
      const firstAssignee = assigneeIds.length > 0 ? assigneeIds[0] : null;
      const result = await pool.query(
        `INSERT INTO tasks (title, description, assigned_to, team_id, created_by, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, description || null, firstAssignee, team_id || null, req.user.id, due_date || null]
      );

      const task = result.rows[0];

      // Add multiple assignees to task_assignees table (handle case where table doesn't exist)
      if (assigneeIds.length > 0) {
        try {
          for (const userId of assigneeIds) {
            await pool.query(
              'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [task.id, userId]
            );
          }
        } catch (err) {
          if (err.code === '42P01') {
            console.error('task_assignees table does not exist. Please run: npm run migrate:assignees');
            // Continue without error - the assigned_to field is still set
          } else {
            throw err;
          }
        }
      }

      // Log activity
      try {
        const assigneeNames = assigneeIds.length > 0 
          ? (await pool.query('SELECT name FROM users WHERE id = ANY($1::int[])', [assigneeIds])).rows.map(u => u.name).join(', ')
          : 'Unassigned';
        const teamName = team_id ? (await pool.query('SELECT name FROM teams WHERE id = $1', [team_id])).rows[0]?.name : null;
        
        await logActivity(
          req,
          'task_created',
          'task',
          task.id,
          `Created task "${title}"${teamName ? ` in team "${teamName}"` : ''}${assigneeIds.length > 0 ? ` and assigned to ${assigneeNames}` : ''}`,
          { task_id: task.id, title, team_id, assignee_ids: assigneeIds }
        );
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      res.status(201).json({ task });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update task (Admin/Manager only, except status)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional(),
    body('assigned_to').optional().isInt().withMessage('Assigned to must be an integer'),
    body('team_id').optional().isInt().withMessage('Team ID must be an integer'),
    body('due_date').optional().isISO8601().withMessage('Invalid date format'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { title, description, assigned_to, team_id, due_date } = req.body;

      // Check if task exists and user has permission
      const taskCheck = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = taskCheck.rows[0];

      // Managers and Admins can update any task (authorize middleware already ensures only admin/manager can access this route)
      // No additional restrictions needed - if they reached this route, they have permission

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (title) {
        updates.push(`title = $${paramCount++}`);
        values.push(title);
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }

      // Handle multiple assignees
      if (req.body.assigned_user_ids !== undefined) {
        const assigneeIds = req.body.assigned_user_ids && Array.isArray(req.body.assigned_user_ids) && req.body.assigned_user_ids.length > 0
          ? req.body.assigned_user_ids
          : [];

        // Validate all assignees are from the same team if team_id is provided
        const finalTeamId = req.body.team_id !== undefined ? req.body.team_id : task.team_id;
        if (finalTeamId && assigneeIds.length > 0) {
          const membersResult = await pool.query(
            'SELECT user_id FROM team_members WHERE team_id = $1',
            [finalTeamId]
          );
          const teamMembers = membersResult.rows.map(r => r.user_id);
          
          const invalidAssignees = assigneeIds.filter(id => !teamMembers.includes(parseInt(id)));
          if (invalidAssignees.length > 0) {
            return res.status(400).json({ 
              error: 'All assigned users must be members of the selected team' 
            });
          }
        }

        // Verify all assigned users exist
        for (const userId of assigneeIds) {
          const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
          if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: `User with ID ${userId} not found` });
          }
        }

        // Update assigned_to to first assignee for backward compatibility
        const firstAssignee = assigneeIds.length > 0 ? assigneeIds[0] : null;
        updates.push(`assigned_to = $${paramCount++}`);
        values.push(firstAssignee);

        // Update task_assignees table (handle case where table doesn't exist)
        try {
          await pool.query('DELETE FROM task_assignees WHERE task_id = $1', [id]);
          if (assigneeIds.length > 0) {
            for (const userId of assigneeIds) {
              await pool.query(
                'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [id, userId]
              );
            }
          }
        } catch (err) {
          if (err.code === '42P01') {
            console.error('task_assignees table does not exist. Please run: npm run migrate:assignees');
            // Continue without error - the assigned_to field is still set
          } else {
            throw err;
          }
        }
      } else if (assigned_to !== undefined) {
        if (assigned_to) {
          const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [assigned_to]);
          if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
          }
        }
        updates.push(`assigned_to = $${paramCount++}`);
        values.push(assigned_to);
        
        // Update task_assignees table (handle case where table doesn't exist)
        try {
          await pool.query('DELETE FROM task_assignees WHERE task_id = $1', [id]);
          if (assigned_to) {
            await pool.query(
              'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [id, assigned_to]
            );
          }
        } catch (err) {
          if (err.code === '42P01') {
            console.error('task_assignees table does not exist. Please run: npm run migrate:assignees');
            // Continue without error - the assigned_to field is still set
          } else {
            throw err;
          }
        }
      }

      if (team_id !== undefined) {
        if (team_id) {
          const teamCheck = await pool.query('SELECT * FROM teams WHERE id = $1', [team_id]);
          if (teamCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
          }
        }
        updates.push(`team_id = $${paramCount++}`);
        values.push(team_id);
      }

      if (due_date !== undefined) {
        updates.push(`due_date = $${paramCount++}`);
        values.push(due_date);
      }

      // Only check updates.length if we're not handling assignees separately
      if (updates.length === 0 && req.body.assigned_user_ids === undefined) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      let updatedTask = task;
      if (updates.length > 0) {
        values.push(id);
        const result = await pool.query(
          `UPDATE tasks SET ${updates.join(', ')} 
           WHERE id = $${paramCount}
           RETURNING *`,
          values
        );
        updatedTask = result.rows[0];
      }

      // Fetch assignees for response
      const assigneesResult = await pool.query(
        `SELECT u.id, u.name, u.email
         FROM task_assignees ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.task_id = $1`,
        [id]
      );
      updatedTask.assignees = assigneesResult.rows;

      // Log activity
      try {
        const changes = [];
        if (title && title !== task.title) changes.push(`title: "${task.title}" → "${title}"`);
        if (description !== undefined && description !== task.description) changes.push('description updated');
        if (req.body.assigned_user_ids !== undefined || assigned_to !== undefined) {
          const oldAssignees = task.assignees ? task.assignees.map(a => a.name) : [];
          const newAssignees = updatedTask.assignees.map(a => a.name);
          if (JSON.stringify(oldAssignees.sort()) !== JSON.stringify(newAssignees.sort())) {
            changes.push(`assignees: ${oldAssignees.join(', ') || 'None'} → ${newAssignees.join(', ') || 'None'}`);
          }
        }
        if (team_id !== undefined && team_id !== task.team_id) {
          const oldTeam = task.team_id ? (await pool.query('SELECT name FROM teams WHERE id = $1', [task.team_id])).rows[0]?.name : 'None';
          const newTeam = team_id ? (await pool.query('SELECT name FROM teams WHERE id = $1', [team_id])).rows[0]?.name : 'None';
          changes.push(`team: ${oldTeam} → ${newTeam}`);
        }

        if (changes.length > 0) {
          await logActivity(
            req,
            'task_updated',
            'task',
            id,
            `Updated task "${updatedTask.title || task.title}": ${changes.join(', ')}`,
            { task_id: id, changes }
          );
        }
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      res.json({ task: updatedTask });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update task status (Employee only)
router.patch(
  '/:id/status',
  authenticate,
  [body('status').isIn(['pending', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      // Check if task exists
      const taskCheck = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = taskCheck.rows[0];

      // Employees can only update status of tasks assigned to them
      if (req.user.role === 'employee' && task.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. You can only update tasks assigned to you.' });
      }

      const oldStatus = task.status;
      const result = await pool.query(
        `UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *`,
        [status, id]
      );

      // Log activity
      try {
        await logActivity(
          req,
          'task_status_updated',
          'task',
          id,
          `Changed task "${task.title}" status from ${oldStatus} to ${status}`,
          { task_id: id, old_status: oldStatus, new_status: status }
        );
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      res.json({ task: result.rows[0] });
    } catch (error) {
      console.error('Update task status error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete task (Admin/Manager only)
router.delete('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if task exists and user has permission
    const taskCheck = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskCheck.rows[0];

    // Managers and Admins can delete any task (authorize middleware already ensures only admin/manager can access this route)
    // No additional restrictions needed

    // Log activity before deletion
    try {
      await logActivity(
        req,
        'task_deleted',
        'task',
        id,
        `Deleted task "${task.title}"`,
        { task_id: id, title: task.title }
      );
    } catch (logError) {
      console.error('Error logging activity:', logError);
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
