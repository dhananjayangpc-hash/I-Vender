// I-Vendor Platform: Express Backend Server
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ivendor'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Seed endpoint
app.post('/api/v1/seed', async (req, res) => {
  try {
    const SeedEngine = require('./seed-populate');
    const seedEngine = new SeedEngine(pool);
    await seedEngine.populate();
    res.json({ message: 'Database seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ideas API
app.get('/api/v1/ideas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ideas WHERE status = $1 LIMIT 50', ['active']);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/ideas/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ideas WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] || { error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/ideas/select', async (req, res) => {
  try {
    const { user_id, idea_id, budget } = req.body;
    const result = await pool.query(
      'INSERT INTO project_instances (user_id, idea_id, status, budget_allocated) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, idea_id, 'active', budget]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mentors API
app.get('/api/v1/mentors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM mentors LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/mentors/book', async (req, res) => {
  try {
    const { user_id, mentor_id, session_date } = req.body;
    const result = await pool.query(
      'INSERT INTO mentor_sessions (user_id, mentor_id, session_date, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, mentor_id, session_date, 'scheduled']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vendors & Materials API
app.get('/api/v1/vendors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM material_vendors LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/materials', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materials WHERE status = $1 LIMIT 50', ['available']);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/vendors/order', async (req, res) => {
  try {
    const { user_id, vendor_id, items, total } = req.body;
    const result = await pool.query(
      'INSERT INTO material_orders (user_id, material_vendor_id, total_amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, vendor_id, total, 'pending']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attendance API
app.post('/api/v1/attendance/checkin', async (req, res) => {
  try {
    const { user_id, mode } = req.body;
    const result = await pool.query(
      'INSERT INTO attendance_logs (user_id, attendance_mode, status) VALUES ($1, $2, $3) RETURNING *',
      [user_id, mode || 'manual', 'verified']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cleanliness API
app.post('/api/v1/cleanliness/report', async (req, res) => {
  try {
    const { user_id, issue_type, location } = req.body;
    const result = await pool.query(
      'INSERT INTO cleanliness_reports (user_id, issue_type, location, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, issue_type, location, 'reported']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RBVM API
app.post('/api/v1/rbvm/return', async (req, res) => {
  try {
    const { user_id, machine_code, bottles_count } = req.body;
    const result = await pool.query(
      'INSERT INTO rbvm_transactions (user_id, bottles_count, points_earned) VALUES ($1, $2, $3) RETURNING *',
      [user_id, bottles_count, bottles_count * 5]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rewards API
app.get('/api/v1/rewards/wallet/:user_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rewards_wallet WHERE user_id = $1', [req.params.user_id]);
    res.json(result.rows[0] || { error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/rewards/catalog', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rewards_catalog LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Dashboard
app.get('/api/v1/admin/dashboard', async (req, res) => {
  try {
    const ideas = await pool.query('SELECT COUNT(*) FROM ideas');
    const users = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['student']);
    res.json({
      total_ideas: ideas.rows[0].count,
      total_students: users.rows[0].count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ I-Vendor API on port ${PORT}`);
});

module.exports = app;
