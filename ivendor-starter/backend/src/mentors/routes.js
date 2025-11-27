// Mentors (Alumni Mentorship) routes for I-Vender

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth, requireRole } = require('../utils/auth');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

// POST /mentors/register - Register as a mentor (alumni/faculty)
router.post('/register', requireAuth, requireRole('mentor', 'admin'), async (req, res, next) => {
  try {
    const { skills, hourlyRate, bio } = req.body;

    if (!skills || !hourlyRate) {
      throw new ValidationError('Skills and hourly rate are required');
    }

    // Check if already registered as mentor
    const existing = await query('SELECT id FROM mentors WHERE user_id = $1', [req.user.userId]);
    if (existing.rowCount > 0) {
      throw new ConflictError('You are already registered as a mentor');
    }

    const skillArray = Array.isArray(skills) ? skills : skills.split(',');

    const result = await query(
      'INSERT INTO mentors (user_id, skills, hourly_rate, bio, is_available) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, skills, hourly_rate, bio',
      [req.user.userId, skillArray, parseFloat(hourlyRate), bio || '', true]
    );

    res.status(201).json({
      message: 'Mentor profile created successfully',
      mentor: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET /mentors - List available mentors with filtering
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { skills, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT m.id, m.user_id, u.name, m.skills, m.hourly_rate, m.rating, m.bio
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      WHERE m.is_available = true
    `;
    const params = [];

    if (skills) {
      const skillArray = skills.split(',');
      params.push(skillArray);
      sql += ` AND m.skills && $${params.length}`;
    }

    sql += ` ORDER BY m.rating DESC, m.user_id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    const countResult = await query('SELECT COUNT(*) as count FROM mentors WHERE is_available = true');

    res.json({
      mentors: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    next(err);
  }
});

// GET /mentors/:mentorId - Get mentor profile
router.get('/:mentorId', requireAuth, async (req, res, next) => {
  try {
    const { mentorId } = req.params;

    const result = await query(`
      SELECT m.id, m.user_id, u.name, u.email, m.skills, m.hourly_rate, m.rating, m.bio, m.total_earnings, m.commission_percent
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `, [mentorId]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Mentor');
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /mentors/book - Book a mentor session
router.post('/book', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { mentorId, title, description, scheduledAt, durationMinutes = 60 } = req.body;

    if (!mentorId || !scheduledAt) {
      throw new ValidationError('Mentor ID and scheduled time are required');
    }

    // Check if mentor exists
    const mentorCheck = await query('SELECT id FROM mentors WHERE id = $1', [mentorId]);
    if (mentorCheck.rowCount === 0) {
      throw new NotFoundError('Mentor');
    }

    // Create session
    const result = await query(
      'INSERT INTO mentor_sessions (mentor_id, student_id, title, description, scheduled_at, duration_minutes, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, status, scheduled_at',
      [mentorId, req.user.userId, title || 'Mentorship Session', description || '', new Date(scheduledAt), durationMinutes, 'pending']
    );

    res.status(201).json({
      message: 'Session booked successfully',
      session: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET /mentors/sessions - Get mentor's sessions (mentor view)
router.get('/sessions', requireAuth, requireRole('mentor'), async (req, res, next) => {
  try {
    // Find mentor ID from user ID
    const mentorCheck = await query('SELECT id FROM mentors WHERE user_id = $1', [req.user.userId]);
    if (mentorCheck.rowCount === 0) {
      throw new NotFoundError('Mentor profile');
    }

    const mentorId = mentorCheck.rows[0].id;
    const { status, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT ms.id, ms.student_id, u.name as student_name, ms.title, ms.scheduled_at, ms.status, ms.duration_minutes
      FROM mentor_sessions ms
      JOIN users u ON ms.student_id = u.id
      WHERE ms.mentor_id = $1
    `;
    const params = [mentorId];

    if (status) {
      params.push(status);
      sql += ` AND ms.status = $${params.length}`;
    }

    sql += ` ORDER BY ms.scheduled_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    res.json({
      sessions: result.rows,
      total: result.rowCount,
    });
  } catch (err) {
    next(err);
  }
});

// GET /mentors/student/:studentId/sessions - Get student's booked sessions
router.get('/student/:studentId/sessions', requireAuth, async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Students can only view their own sessions
    if (req.user.userId !== studentId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await query(`
      SELECT ms.id, ms.mentor_id, u.name as mentor_name, ms.title, ms.scheduled_at, ms.status, ms.duration_minutes
      FROM mentor_sessions ms
      JOIN mentors m ON ms.mentor_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE ms.student_id = $1
      ORDER BY ms.scheduled_at DESC
    `, [studentId]);

    res.json({
      sessions: result.rows,
      total: result.rowCount,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /mentors/sessions/:sessionId - Update session status
router.put('/sessions/:sessionId', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'scheduled', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Get session details
    const sessionCheck = await query(
      'SELECT mentor_id, student_id, status as current_status FROM mentor_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionCheck.rowCount === 0) {
      throw new NotFoundError('Session');
    }

    const session = sessionCheck.rows[0];

    // Only mentor or student can update
    if (req.user.userId !== session.student_id) {
      const mentorCheck = await query('SELECT id FROM mentors WHERE id = $1 AND user_id = $2', [session.mentor_id, req.user.userId]);
      if (mentorCheck.rowCount === 0 && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const result = await query(
      'UPDATE mentor_sessions SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, status, updated_at',
      [status, sessionId]
    );

    // Award points if session completed
    if (status === 'completed' && session.current_status !== 'completed') {
      await awardSessionPoints(session.student_id);
    }

    res.json({
      message: 'Session updated successfully',
      session: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET /mentors/:mentorId/earnings - Get mentor earnings (mentor view)
router.get('/:mentorId/earnings', requireAuth, async (req, res, next) => {
  try {
    const { mentorId } = req.params;

    // Check if user is the mentor
    const mentorCheck = await query('SELECT user_id, total_earnings, commission_percent FROM mentors WHERE id = $1', [mentorId]);
    if (mentorCheck.rowCount === 0) {
      throw new NotFoundError('Mentor');
    }

    if (req.user.userId !== mentorCheck.rows[0].user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const mentor = mentorCheck.rows[0];

    // Get session earnings
    const sessionsResult = await query(`
      SELECT COUNT(*) as completed_sessions, COALESCE(SUM(amount), 0) as total_amount
      FROM mentor_sessions
      WHERE mentor_id = $1 AND status = 'completed'
    `, [mentorId]);

    const sessions = sessionsResult.rows[0];

    res.json({
      mentorId,
      totalEarnings: mentor.total_earnings,
      commissionPercent: mentor.commission_percent,
      completedSessions: parseInt(sessions.completed_sessions),
      totalSessionRevenue: sessions.total_amount,
    });
  } catch (err) {
    next(err);
  }
});

// Helper: Award points for mentor session
async function awardSessionPoints(studentId) {
  try {
    const wallet = await query('SELECT id FROM rewards_wallet WHERE user_id = $1', [studentId]);
    if (wallet.rowCount > 0) {
      const walletId = wallet.rows[0].id;
      await query(
        'INSERT INTO rewards_transactions (user_id, wallet_id, transaction_type, points_amount, reason, related_entity_type) VALUES ($1, $2, $3, $4, $5, $6)',
        [studentId, walletId, 'earn', 50, 'Completed mentor session', 'session']
      );
      await query(
        'UPDATE rewards_wallet SET total_points = total_points + 50, available_points = available_points + 50, lifetime_points = lifetime_points + 50 WHERE id = $1',
        [walletId]
      );
    }
  } catch (err) {
    console.error('Error awarding session points:', err);
  }
}

module.exports = router;
