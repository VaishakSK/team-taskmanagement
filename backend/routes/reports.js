const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get reports with graph-friendly data (Admin/Manager only)
router.get('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { type, team_id, start_date, end_date } = req.query;

    let reports = {};

    // Task Status Distribution (Pie Chart Data)
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
    
    // Format for pie chart
    reports.taskStatusDistribution = {
      labels: taskStats.rows.map(r => r.status.replace('_', ' ').toUpperCase()),
      data: taskStats.rows.map(r => parseInt(r.count)),
      colors: taskStats.rows.map(r => {
        switch(r.status) {
          case 'pending': return '#ed6c02';
          case 'in_progress': return '#1976d2';
          case 'completed': return '#2e7d32';
          case 'cancelled': return '#d32f2f';
          default: return '#757575';
        }
      })
    };

    // Tasks Over Time (Line Chart Data) - Last 30 days
    const tasksOverTimeQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM tasks
      WHERE created_at >= NOW() - INTERVAL '30 days'
      ${req.user.role === 'manager' ? `AND (created_by = $1 OR team_id IN (SELECT id FROM teams WHERE manager_id = $1))` : ''}
      ${team_id ? `AND team_id = $${req.user.role === 'manager' ? '2' : '1'}` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    const timeParams = req.user.role === 'manager' ? [req.user.id] : [];
    if (team_id) timeParams.push(team_id);
    
    const tasksOverTime = await pool.query(tasksOverTimeQuery, timeParams);
    reports.tasksOverTime = {
      labels: tasksOverTime.rows.map(r => new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      created: tasksOverTime.rows.map(r => parseInt(r.count)),
      completed: tasksOverTime.rows.map(r => parseInt(r.completed))
    };

    // Team Performance (Bar Chart Data)
    let teamQuery = `
      SELECT 
        t.id,
        t.name,
        COUNT(DISTINCT tm.user_id) as member_count,
        COUNT(DISTINCT tk.id) as task_count,
        COUNT(DISTINCT CASE WHEN tk.status = 'completed' THEN tk.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN tk.status = 'pending' THEN tk.id END) as pending_tasks,
        COUNT(DISTINCT CASE WHEN tk.status = 'in_progress' THEN tk.id END) as in_progress_tasks
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

    if (team_id) {
      teamQuery += ` AND t.id = $${paramCount++}`;
      teamParams.push(team_id);
    }

    teamQuery += ` GROUP BY t.id, t.name ORDER BY t.name`;

    const teamStats = await pool.query(teamQuery, teamParams);
    reports.teamPerformance = {
      labels: teamStats.rows.map(t => t.name),
      tasks: teamStats.rows.map(t => parseInt(t.task_count)),
      completed: teamStats.rows.map(t => parseInt(t.completed_tasks)),
      pending: teamStats.rows.map(t => parseInt(t.pending_tasks)),
      inProgress: teamStats.rows.map(t => parseInt(t.in_progress_tasks)),
      members: teamStats.rows.map(t => parseInt(t.member_count))
    };

    // User Productivity (Bar Chart Data)
    let userQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'pending' THEN t.id END) as pending_tasks
      FROM users u
      LEFT JOIN task_assignees ta ON u.id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id OR t.assigned_to = u.id
      WHERE u.role = 'employee'
    `;
    const userParams = [];
    paramCount = 1;

    if (team_id) {
      userQuery += ` AND EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id AND tm.team_id = $${paramCount++})`;
      userParams.push(team_id);
    }

    userQuery += ` GROUP BY u.id, u.name, u.email HAVING COUNT(DISTINCT t.id) > 0 ORDER BY total_tasks DESC LIMIT 10`;

    const userStats = await pool.query(userQuery, userParams);
    reports.userProductivity = {
      labels: userStats.rows.map(u => u.name),
      total: userStats.rows.map(u => parseInt(u.total_tasks)),
      completed: userStats.rows.map(u => parseInt(u.completed_tasks)),
      inProgress: userStats.rows.map(u => parseInt(u.in_progress_tasks)),
      pending: userStats.rows.map(u => parseInt(u.pending_tasks))
    };

    // Activity Log Summary (Line Chart - Activities over time)
    const activityQuery = `
      SELECT 
        DATE(created_at) as date,
        action_type,
        COUNT(*) as count
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at), action_type
      ORDER BY date ASC, action_type
    `;
    const activities = await pool.query(activityQuery);
    
    // Group by date
    const activityMap = {};
    activities.rows.forEach(row => {
      const date = new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!activityMap[date]) {
        activityMap[date] = { date, task_created: 0, task_updated: 0, task_status_updated: 0, task_deleted: 0, team_created: 0, team_updated: 0 };
      }
      activityMap[date][row.action_type] = parseInt(row.count);
    });

    reports.activityTimeline = {
      labels: Object.keys(activityMap).sort(),
      datasets: [
        {
          label: 'Tasks Created',
          data: Object.values(activityMap).map(d => d.task_created),
          color: '#1976d2'
        },
        {
          label: 'Tasks Updated',
          data: Object.values(activityMap).map(d => d.task_updated),
          color: '#ed6c02'
        },
        {
          label: 'Status Changes',
          data: Object.values(activityMap).map(d => d.task_status_updated),
          color: '#2e7d32'
        },
        {
          label: 'Teams Created',
          data: Object.values(activityMap).map(d => d.team_created),
          color: '#9c27b0'
        }
      ]
    };

    res.json({ reports });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
