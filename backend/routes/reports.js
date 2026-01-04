const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get reports (Admin/Manager only)
router.get('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { type, team_id, start_date, end_date } = req.query;

    let reports = {};

    // Task statistics
    let taskQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM tasks
      WHERE 1=1
    `;
    const taskParams = [];
    let paramCount = 1;

    if (team_id) {
      taskQuery += ` AND team_id = $${paramCount++}`;
      taskParams.push(team_id);
    }

    if (start_date) {
      taskQuery += ` AND created_at >= $${paramCount++}`;
      taskParams.push(start_date);
    }

    if (end_date) {
      taskQuery += ` AND created_at <= $${paramCount++}`;
      taskParams.push(end_date);
    }

    // Managers can only see reports for their teams
    if (req.user.role === 'manager') {
      taskQuery += ` AND (created_by = $${paramCount} OR team_id IN (SELECT id FROM teams WHERE manager_id = $${paramCount}))`;
      taskParams.push(req.user.id);
      paramCount++;
    }

    taskQuery += ` GROUP BY status`;

    const taskStats = await pool.query(taskQuery, taskParams);
    reports.taskStatistics = taskStats.rows;

    // Team statistics
    let teamQuery = `
      SELECT 
        t.id,
        t.name,
        COUNT(DISTINCT tm.user_id) as member_count,
        COUNT(DISTINCT tk.id) as task_count,
        COUNT(DISTINCT CASE WHEN tk.status = 'completed' THEN tk.id END) as completed_tasks
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN tasks tk ON t.id = tk.team_id
      WHERE 1=1
    `;
    const teamParams = [];
    paramCount = 1;

    if (req.user.role === 'manager') {
      teamQuery += ` AND t.manager_id = $${paramCount++}`;
      teamParams.push(req.user.id);
    }

    teamQuery += ` GROUP BY t.id, t.name ORDER BY t.name`;

    const teamStats = await pool.query(teamQuery, teamParams);
    reports.teamStatistics = teamStats.rows;

    // User productivity (tasks assigned)
    let userQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to
      WHERE u.role = 'employee'
    `;
    const userParams = [];

    if (team_id) {
      userQuery += ` AND EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id AND tm.team_id = $1)`;
      userParams.push(team_id);
    }

    userQuery += ` GROUP BY u.id, u.name, u.email ORDER BY u.name`;

    const userStats = await pool.query(userQuery, userParams);
    reports.userProductivity = userStats.rows;

    res.json({ reports });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
