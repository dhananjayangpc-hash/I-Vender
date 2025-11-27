// Attendance routes for I-Vender

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth, requireRole } = require('../utils/auth');
const { validateAttendanceMethod } = require('../utils/validators');
const { ValidationError, NotFoundError } = require('../utils/errors');

// POST /attendance/checkin - RFID or manual check-in
router.post('/checkin', requireAuth, async (req, res, next) => {
  try {
    const { method = 'rfid', location, deviceId } = req.body;

    validateAttendanceMethod(method);

    if (!location) {
      throw new ValidationError('Location is required');
    }

    // Insert attendance record
    const result = await query(
      'INSERT INTO attendance (user_id, method, location, device_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, timestamp, method, status',
      [req.user.userId, method, location, deviceId || null, 'present']
    );

    // Award loyalty points for attendance
    await awardAttendancePoints(req.user.userId);

    res.status(201).json({
      message: 'Check-in successful',
      attendance: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// POST /attendance/face - Facial recognition check-in (stub)
router.post('/face', requireAuth, async (req, res, next) => {
  try {
    const { faceData, location } = req.body;

    if (!faceData || !location) {
      throw new ValidationError('Face data and location are required');
    }

    // Placeholder for facial recognition
    // In production, integrate with ML service
    const faceConfidence = Math.random() * 100;
    const isValidFace = faceConfidence > 75;

    if (!isValidFace) {
      return res.status(400).json({ error: 'Face recognition failed', confidence: faceConfidence });
    }

    // Insert attendance record
    const result = await query(
      'INSERT INTO attendance (user_id, method, location, status) VALUES ($1, $2, $3, $4) RETURNING id, timestamp, method, status',
      [req.user.userId, 'face', location, 'present']
    );

    // Award loyalty points
    await awardAttendancePoints(req.user.userId);

    res.status(201).json({
      message: 'Face recognition check-in successful',
      attendance: result.rows[0],
      faceConfidence,
    });
  } catch (err) {
    next(err);
  }
});

// GET /attendance/student/:userId - Get student's attendance records
router.get('/student/:userId', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Students can only view their own records; others need admin role
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { limit = 30, offset = 0 } = req.query;
    const result = await query(
      'SELECT id, user_id, timestamp, method, status, location FROM attendance WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
      [userId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query('SELECT COUNT(*) as count FROM attendance WHERE user_id = $1', [userId]);

    res.json({
      records: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    next(err);
  }
});

// GET /attendance/admin - Admin dashboard for attendance statistics
router.get('/admin', requireAuth, requireRole('admin', 'faculty'), async (req, res, next) => {
  try {
    // Overall attendance stats
    const overallStats = await query(`
      SELECT 
        COUNT(*) as total_checkins,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count
      FROM attendance 
      WHERE DATE(timestamp) = CURRENT_DATE
    `);

    // Top locations
    const topLocations = await query(`
      SELECT location, COUNT(*) as checkins
      FROM attendance
      WHERE DATE(timestamp) = CURRENT_DATE
      GROUP BY location
      ORDER BY checkins DESC
      LIMIT 10
    `);

    // Method breakdown
    const methodBreakdown = await query(`
      SELECT method, COUNT(*) as count
      FROM attendance
      WHERE DATE(timestamp) = CURRENT_DATE
      GROUP BY method
    `);

    res.json({
      date: new Date().toISOString().split('T')[0],
      overallStats: overallStats.rows[0],
      topLocations: topLocations.rows,
      methodBreakdown: methodBreakdown.rows,
    });
  } catch (err) {
    next(err);
  }
});

// Helper function to award attendance points
async function awardAttendancePoints(userId) {
  try {
    // Award 10 points for daily attendance
    const wallet = await query('SELECT id FROM rewards_wallet WHERE user_id = $1', [userId]);
    if (wallet.rowCount > 0) {
      const walletId = wallet.rows[0].id;
      await query(
        'INSERT INTO rewards_transactions (user_id, wallet_id, transaction_type, points_amount, reason, related_entity_type) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, walletId, 'earn', 10, 'Daily attendance', 'attendance']
      );
      await query(
        'UPDATE rewards_wallet SET total_points = total_points + 10, available_points = available_points + 10, lifetime_points = lifetime_points + 10 WHERE id = $1',
        [walletId]
      );
    }
  } catch (err) {
    console.error('Error awarding attendance points:', err);
  }
}

module.exports = router;
