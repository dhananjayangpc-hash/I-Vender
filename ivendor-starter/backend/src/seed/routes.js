// I-Vender Phase-4 Seed API Routes
// Endpoints for seed data management

const express = require('express');
const router = express.Router();
const SeedEngine = require('./seed-populate');

// Initialize seed engine
const seedEngine = new SeedEngine();

// POST /api/v1/seed/populate - Populate database with test data
router.post('/populate', async (req, res) => {
  try {
    const stats = await seedEngine.populate();
    res.json({
      success: true,
      message: 'Database populated successfully',
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Seed population error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/v1/seed/reset - Reset database and repopulate
router.delete('/reset', async (req, res) => {
  try {
    await seedEngine.resetDatabase();
    const stats = await seedEngine.populate();
    res.json({
      success: true,
      message: 'Database reset and repopulated successfully',
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Seed reset error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/v1/seed/status - Get status of seeded data
router.get('/status', async (req, res) => {
  try {
    const status = await seedEngine.getStatus();
    res.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Seed status error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
