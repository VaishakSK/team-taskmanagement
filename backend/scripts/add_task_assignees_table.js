const pool = require('../config/database');
require('dotenv').config();

const addTaskAssigneesTable = async () => {
  try {
    console.log('Adding task_assignees table...');

    // Create task_assignees table (many-to-many relationship for multiple assignees)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_assignees (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, user_id)
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);
    `);

    console.log('✅ task_assignees table created successfully!');
    console.log('✅ Indexes created successfully!');
    
    // Migrate existing assigned_to data to task_assignees
    console.log('Migrating existing task assignments...');
    const existingTasks = await pool.query(`
      SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL
    `);

    let migrated = 0;
    for (const task of existingTasks.rows) {
      try {
        await pool.query(`
          INSERT INTO task_assignees (task_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT (task_id, user_id) DO NOTHING
        `, [task.id, task.assigned_to]);
        migrated++;
      } catch (err) {
        console.error(`Error migrating task ${task.id}:`, err.message);
      }
    }

    console.log(`✅ Migrated ${migrated} existing task assignments to task_assignees table`);
    console.log('Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

addTaskAssigneesTable();
