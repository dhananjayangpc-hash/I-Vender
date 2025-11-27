require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { initDb } = require('./db');
const { requireAuth } = require('./utils/auth');

// Import route modules
const authRoutes = require('./auth/routes');
const attendanceRoutes = require('./attendance/routes');
const projectsRoutes = require('./projects/routes');
const mentorsRoutes = require('./mentors/routes');
const cleanlinessRoutes = require('./cleanliness/routes');
const rewardsRoutes = require('./rewards/routes');
const dashboardRoutes = require('./dashboard/routes');
const seedRoutes = require('./seed/routes');

const app = express();
app.use(bodyParser.json());

// CORS and middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const API_PREFIX = '/api/v1';

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'I-Vender Campus Platform' }));

// ============== SEED DATA ROUTES (Phase-4) ==============
app.use(`${API_PREFIX}/seed`, seedRoutes);

// ============== I-VENDER MODULE ROUTES ==============

// Authentication Routes
app.use(`${API_PREFIX}/auth`, authRoutes);

// Smart Attendance Routes
app.use(`${API_PREFIX}/attendance`, requireAuth, attendanceRoutes);

// AI Project Vending Routes
app.use(`${API_PREFIX}/projects`, projectsRoutes);

// Alumni Mentorship Routes
app.use(`${API_PREFIX}/mentors`, mentorsRoutes);

// Cleanliness Monitoring Routes
app.use(`${API_PREFIX}/cleanliness`, cleanlinessRoutes);

// Loyalty & Rewards Routes
app.use(`${API_PREFIX}/rewards`, rewardsRoutes);

// Dashboard & Analytics Routes
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

// ============== ERROR HANDLING ==============

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(err.status || 400).json({ error: err.message, details: err.details });
  }

  if (err.name === 'AuthenticationError' || err.name === 'AuthorizationError') {
    return res.status(err.status || 401).json({ error: err.message });
  }

  if (err.name === 'NotFoundError') {
    return res.status(err.status || 404).json({ error: err.message });
  }

  if (err.name === 'ConflictError') {
    return res.status(err.status || 409).json({ error: err.message });
  }

  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ============== SERVER START ==============

const PORT = process.env.PORT || 4000;
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║    I-VENDER PHASE-4 BACKEND SERVER                 ║
║  Enterprise Partnership & Project Management       ║
╚══════════════════════════════════════════════════════╝

🚀 Backend Server Running on Port ${PORT}

📚 Available Modules:
  ✓ Smart Attendance (RFID/Face Recognition)
  ✓ AI Project Vending (Personalized Recommendations)
  ✓ Alumni Mentorship Marketplace
  ✓ Cleanliness Monitoring System
  ✓ Loyalty & Rewards System
  ✓ Unified Campus Dashboard
  ✓ Seed Data Management

🔗 API Prefix: ${API_PREFIX}
🏥 Health Check: GET /health

      `);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize DB', err);
    process.exit(1);
  });
