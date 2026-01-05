const pool = require('../config/database');
require('dotenv').config();

const addActivityLogsTable = async () => {
  try {
    console.log('Adding activity_logs table...');

    // Create activity_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        description TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
    `);

    console.log('✅ activity_logs table created successfully!');
    console.log('✅ Indexes created successfully!');
    console.log('Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

addActivityLogsTable();
