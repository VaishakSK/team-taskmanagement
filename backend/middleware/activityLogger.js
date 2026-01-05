const pool = require('../config/database');

/**
 * Activity Logger Middleware
 * Logs important actions to the activity_logs table
 */
const logActivity = async (req, actionType, entityType, entityId, description, metadata = {}) => {
  try {
    // Don't log if user is not authenticated
    if (!req.user || !req.user.id) {
      return;
    }

    await pool.query(
      `INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        actionType,
        entityType,
        entityId || null,
        description,
        JSON.stringify(metadata)
      ]
    );
  } catch (error) {
    // Don't throw error - logging should not break the main functionality
    console.error('Error logging activity:', error);
  }
};

/**
 * Middleware factory to log activities
 */
const createActivityLogger = (actionType, entityType, getEntityId, getDescription, getMetadata) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after response
    res.json = function (data) {
      // Call original json method
      originalJson(data);

      // Log activity after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = getEntityId ? getEntityId(req, data) : (req.params.id || null);
        const description = getDescription ? getDescription(req, data) : `${actionType} ${entityType}`;
        const metadata = getMetadata ? getMetadata(req, data) : {};

        logActivity(req, actionType, entityType, entityId, description, metadata)
          .catch(err => console.error('Error in activity logger:', err));
      }
    };

    next();
  };
};

module.exports = {
  logActivity,
  createActivityLogger
};
