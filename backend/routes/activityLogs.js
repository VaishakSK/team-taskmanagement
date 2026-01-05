const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get activity logs (Admin/Manager only)
router.get('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { entity_type, entity_id, action_type, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (entity_type) {
      query += ` AND al.entity_type = $${paramCount++}`;
      params.push(entity_type);
    }

    if (entity_id) {
      query += ` AND al.entity_id = $${paramCount++}`;
      params.push(entity_id);
    }

    if (action_type) {
      query += ` AND al.action_type = $${paramCount++}`;
      params.push(action_type);
    }

    // Managers can only see logs for their teams
    if (req.user.role === 'manager') {
      query += ` AND (
        al.user_id = $${paramCount} 
        OR al.entity_id IN (SELECT id FROM teams WHERE manager_id = $${paramCount})
        OR al.entity_id IN (SELECT id FROM tasks WHERE team_id IN (SELECT id FROM teams WHERE manager_id = $${paramCount}))
      )`;
      params.push(req.user.id);
      paramCount++;
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Parse metadata JSON
    const logs = result.rows.map(log => ({
      ...log,
      metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
    }));

    res.json({ logs, total: logs.length });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
