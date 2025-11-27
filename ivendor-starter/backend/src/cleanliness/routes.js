// Cleanliness Monitoring routes for I-Vender

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth, requireRole } = require('../utils/auth');
const { validateReportPriority, validateReportStatus } = require('../utils/validators');
const { ValidationError, NotFoundError } = require('../utils/errors');

// POST /cleanliness/report - Submit a cleanliness issue report
router.post('/report', requireAuth, async (req, res, next) => {
  try {
    const { location, description, photoUrl, priority = 'medium', issueType = 'general_dirt' } = req.body;

    if (!location || !description) {
      throw new ValidationError('Location and description are required');
    }

    validateReportPriority(priority);

    const result = await query(
      'INSERT INTO cleanliness_reports (reporter_id, location, description, photo_url, priority, issue_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, status, created_at',
      [req.user.userId, location, description, photoUrl || null, priority, issueType, 'open']
    );

    // Award points for reporting cleanliness issue
    await awardCleanlinessPoints(req.user.userId);

    res.status(201).json({
      message: 'Report submitted successfully',
      report: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET /cleanliness/status - Get cleanliness status for locations
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const { location, status = 'open', limit = 50 } = req.query;

    let sql = `
      SELECT 
        cr.id, cr.location, cr.description, cr.priority, cr.issue_type, cr.status, 
        cr.created_at, u.name as reporter_name
      FROM cleanliness_reports cr
      LEFT JOIN users u ON cr.reporter_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (location) {
      params.push(location);
      sql += ` AND cr.location = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND cr.status = $${params.length}`;
    }

    sql += ` ORDER BY cr.priority DESC, cr.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);

    res.json({
      reports: result.rows,
      total: result.rowCount,
    });
  } catch (err) {
    next(err);
  }
});

// GET /cleanliness/locations - Get list of locations with their status summary
router.get('/locations', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        location,
        COUNT(*) as total_reports,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
        MAX(created_at) as last_report_at
      FROM cleanliness_reports
      WHERE created_at > now() - interval '30 days'
      GROUP BY location
      ORDER BY open_count DESC, location
    `);

    res.json({
      locations: result.rows,
      total: result.rowCount,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /cleanliness/resolve/:reportId - Resolve a cleanliness issue (admin/faculty)
router.put('/resolve/:reportId', requireAuth, requireRole('admin', 'faculty'), async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { status, resolutionNotes } = req.body;

    if (!status) {
      throw new ValidationError('Status is required');
    }

    validateReportStatus(status);

    // Check if report exists
    const reportCheck = await query('SELECT id FROM cleanliness_reports WHERE id = $1', [reportId]);
    if (reportCheck.rowCount === 0) {
      throw new NotFoundError('Report');
    }

    const updatedAt = status === 'resolved' ? 'now()' : 'cleanliness_reports.updated_at';
    const resolvedBy = status === 'resolved' ? req.user.userId : null;

    const result = await query(
      `UPDATE cleanliness_reports 
       SET status = $1, resolution_notes = $2, resolved_by = $3, resolved_at = CASE WHEN $1 = 'resolved' THEN now() ELSE resolved_at END, updated_at = now()
       WHERE id = $4
       RETURNING id, status, resolved_at, resolution_notes`,
      [status, resolutionNotes || null, resolvedBy, reportId]
    );

    res.json({
      message: 'Report updated successfully',
      report: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// PUT /cleanliness/assign/:reportId - Assign report to staff (admin)
router.put('/assign/:reportId', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { staffUserId } = req.body;

    if (!staffUserId) {
      throw new ValidationError('Staff user ID is required');
    }

    // Check if report exists
    const reportCheck = await query('SELECT id FROM cleanliness_reports WHERE id = $1', [reportId]);
    if (reportCheck.rowCount === 0) {
      throw new NotFoundError('Report');
    }

    const result = await query(
      'UPDATE cleanliness_reports SET assigned_to = $1, status = \'in_progress\', updated_at = now() WHERE id = $2 RETURNING id, assigned_to, status',
      [staffUserId, reportId]
    );

    res.json({
      message: 'Report assigned successfully',
      report: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET /cleanliness/analytics - Dashboard analytics for admin
router.get('/analytics', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    // Overall stats
    const overallStats = await query(`
      SELECT 
        COUNT(*) as total_reports,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_resolution_hours
      FROM cleanliness_reports
      WHERE resolved_at IS NOT NULL
    `);

    // Issue type breakdown
    const issueBreakdown = await query(`
      SELECT issue_type, COUNT(*) as count
      FROM cleanliness_reports
      GROUP BY issue_type
      ORDER BY count DESC
    `);

    // Priority breakdown
    const priorityBreakdown = await query(`
      SELECT priority, COUNT(*) as count
      FROM cleanliness_reports
      WHERE status IN ('open', 'in_progress')
      GROUP BY priority
      ORDER BY CASE WHEN priority = 'critical' THEN 0 WHEN priority = 'high' THEN 1 WHEN priority = 'medium' THEN 2 ELSE 3 END
    `);

    res.json({
      overallStats: overallStats.rows[0],
      issueBreakdown: issueBreakdown.rows,
      priorityBreakdown: priorityBreakdown.rows,
    });
  } catch (err) {
    next(err);
  }
});

// Helper: Award points for cleanliness reporting
async function awardCleanlinessPoints(userId) {
  try {
    const wallet = await query('SELECT id FROM rewards_wallet WHERE user_id = $1', [userId]);
    if (wallet.rowCount > 0) {
      const walletId = wallet.rows[0].id;
      await query(
        'INSERT INTO rewards_transactions (user_id, wallet_id, transaction_type, points_amount, reason, related_entity_type) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, walletId, 'earn', 20, 'Reported cleanliness issue', 'cleanliness']
      );
      await query(
        'UPDATE rewards_wallet SET total_points = total_points + 20, available_points = available_points + 20, lifetime_points = lifetime_points + 20 WHERE id = $1',
        [walletId]
      );
    }
  } catch (err) {
    console.error('Error awarding cleanliness points:', err);
  }
}

module.exports = router;
