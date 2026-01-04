const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

describe('Tasks Routes', () => {
  let adminToken;
  let employeeToken;
  let adminUser;
  let employeeUser;

  beforeAll(async () => {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await pool.query(
      `INSERT INTO users (email, password, name, role, email_verified)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      ['admin-test@example.com', adminPassword, 'Admin Test', 'admin']
    );
    adminUser = adminResult.rows[0];

    // Create employee user
    const empPassword = await bcrypt.hash('emp123', 10);
    const empResult = await pool.query(
      `INSERT INTO users (email, password, name, role, email_verified)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      ['emp-test@example.com', empPassword, 'Employee Test', 'employee']
    );
    employeeUser = empResult.rows[0];

    // Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin-test@example.com', password: 'admin123' });
    adminToken = adminLogin.body.token;

    const empLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'emp-test@example.com', password: 'emp123' });
    employeeToken = empLogin.body.token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM tasks WHERE created_by = $1', [adminUser.id]);
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [
      'admin-test@example.com',
      'emp-test@example.com',
    ]);
    await pool.end();
  });

  describe('POST /api/tasks', () => {
    it('should create a task as admin', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Task',
          description: 'Test Description',
          assigned_to: employeeUser.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.task).toHaveProperty('id');
      expect(response.body.task.title).toBe('Test Task');
    });

    it('should fail without authentication', async () => {
      const response = await request(app).post('/api/tasks').send({
        title: 'Test Task',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/tasks', () => {
    it('should get tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tasks');
      expect(Array.isArray(response.body.tasks)).toBe(true);
    });
  });
});
