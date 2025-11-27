// Dashboard & Analytics routes for I-Vender

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth, requireRole } = require('../utils/auth');
const { NotFoundError } = require('../utils/errors');

// GET /dashboard/overview - Unified KPI dashboard
router.get('/overview', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    // Get date range for statistics
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Today's attendance
    const todayAttendance = await query(`
      SELECT 
        COUNT(*) as total_checkins,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance
      WHERE DATE(timestamp) = $1
    `, [today]);

    // Active projects
    const activeProjects = await query(`
      SELECT COUNT(*) as total FROM student_project_selections WHERE status IN ('selected', 'in_progress')
    `);

    // Completed projects
    const completedProjects = await query(`
      SELECT COUNT(*) as total FROM student_project_selections WHERE status = 'completed'
    `);

    // Mentor sessions
    const mentorSessions = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM mentor_sessions
    `);

    // Cleanliness metrics
    const cleanlinessMetrics = await query(`
      SELECT 
        COUNT(*) as total_reports,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
      FROM cleanliness_reports
      WHERE created_at > now() - interval '30 days'
    `);

    // Loyalty metrics
    const loyaltyMetrics = await query(`
      SELECT 
        AVG(total_points) as avg_points_per_user,
        MAX(total_points) as max_points,
        COUNT(*) as users_with_wallet
      FROM rewards_wallet
    `);

    // User stats
    const userStats = await query(`
      SELECT 
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students,
        SUM(CASE WHEN role = 'mentor' THEN 1 ELSE 0 END) as mentors,
        SUM(CASE WHEN role = 'faculty' THEN 1 ELSE 0 END) as faculty,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
        COUNT(*) as total_users
      FROM users
      WHERE is_active = true
    `);

    // Weekly trends (last 7 days)
    const weeklyAttendanceTrend = await query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as checkins,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
      FROM attendance
      WHERE timestamp > now() - interval '7 days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `);

    // Top locations by activity
    const topLocations = await query(`
      SELECT 
        location,
        COUNT(*) as activity_count
      FROM attendance
      WHERE timestamp > now() - interval '7 days'
      GROUP BY location
      ORDER BY activity_count DESC
      LIMIT 10
    `);

    res.json({
      timestamp: new Date().toISOString(),
      attendance: {
        today: todayAttendance.rows[0],
      },
      projects: {
        active: activeProjects.rows[0].total,
        completed: completedProjects.rows[0].total,
      },
      mentorSessions: mentorSessions.rows[0],
      cleanliness: cleanlinessMetrics.rows[0],
      loyalty: loyaltyMetrics.rows[0],
      users: userStats.rows[0],
      trends: {
        weeklyAttendance: weeklyAttendanceTrend.rows,
        topLocations: topLocations.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/student - Student personal dashboard
router.get('/student', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Today's attendance
    const todayAttendance = await query(`
      SELECT id, timestamp, method, status FROM attendance
      WHERE user_id = $1 AND DATE(timestamp) = CURRENT_DATE
      ORDER BY timestamp DESC
      LIMIT 1
    `, [userId]);

    // Active projects
    const activeProjects = await query(`
      SELECT 
        sp.id, sp.project_id, sp.status, sp.selected_at,
        p.title, p.difficulty, p.tags
      FROM student_project_selections sp
      JOIN projects p ON sp.project_id = p.id
      WHERE sp.student_id = $1 AND sp.status IN ('selected', 'in_progress')
      ORDER BY sp.selected_at DESC
      LIMIT 5
    `, [userId]);

    // Upcoming mentor sessions
    const upcomingSessions = await query(`
      SELECT 
        ms.id, ms.mentor_id, ms.scheduled_at, ms.title, ms.status,
        u.name as mentor_name
      FROM mentor_sessions ms
      JOIN mentors m ON ms.mentor_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE ms.student_id = $1 AND ms.scheduled_at > now()
      ORDER BY ms.scheduled_at ASC
      LIMIT 5
    `, [userId]);

    // Rewards wallet
    const wallet = await query(
      'SELECT total_points, available_points, lifetime_points FROM rewards_wallet WHERE user_id = $1',
      [userId]
    );

    // Recent reports
    const recentReports = await query(`
      SELECT id, location, description, status, priority, created_at
      FROM cleanliness_reports
      WHERE reporter_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    res.json({
      attendance: todayAttendance.rows[0] || null,
      activeProjects: activeProjects.rows,
      upcomingSessions: upcomingSessions.rows,
      wallet: wallet.rows[0] || null,
      recentReports: recentReports.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/mentor - Mentor dashboard
router.get('/mentor', requireAuth, requireRole('mentor'), async (req, res, next) => {
  try {
    // Find mentor ID from user ID
    const mentorCheck = await query('SELECT id, total_earnings, rating FROM mentors WHERE user_id = $1', [req.user.userId]);
    if (mentorCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Mentor profile not found' });
    }

    const mentorId = mentorCheck.rows[0].id;
    const mentor = mentorCheck.rows[0];

    // Upcoming sessions
    const upcomingSessions = await query(`
      SELECT 
        ms.id, ms.student_id, ms.title, ms.scheduled_at, ms.status,
        u.name as student_name, u.email as student_email
      FROM mentor_sessions ms
      JOIN users u ON ms.student_id = u.id
      WHERE ms.mentor_id = $1 AND ms.scheduled_at > now()
      ORDER BY ms.scheduled_at ASC
      LIMIT 10
    `, [mentorId]);

    // Session stats
    const sessionStats = await query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM mentor_sessions
      WHERE mentor_id = $1
    `, [mentorId]);

    res.json({
      mentor: {
        id: mentorId,
        totalEarnings: mentor.total_earnings,
        rating: mentor.rating,
      },
      upcomingSessions: upcomingSessions.rows,
      sessionStats: sessionStats.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/faculty - Faculty/Staff dashboard
router.get('/faculty', requireAuth, requireRole('faculty'), async (req, res, next) => {
  try {
    // Attendance today
    const todayAttendance = await query(`
      SELECT 
        COUNT(*) as total_checkins,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
      FROM attendance
      WHERE DATE(timestamp) = CURRENT_DATE
    `);

    // Open cleanliness issues
    const openCleanliness = await query(`
      SELECT id, location, priority, created_at, description
      FROM cleanliness_reports
      WHERE status IN ('open', 'in_progress')
      ORDER BY priority DESC, created_at ASC
      LIMIT 10
    `);

    // Weekly attendance trend
    const attendanceTrend = await query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as total
      FROM attendance
      WHERE timestamp > now() - interval '7 days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `);

    res.json({
      attendance: todayAttendance.rows[0],
      openCleanliness: openCleanliness.rows,
      attendanceTrend: attendanceTrend.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/stats/:metric - Get specific metric data
router.get('/stats/:metric', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { metric } = req.params;
    const { days = 7 } = req.query;

    let sql = '';
    let params = [];

    switch (metric) {
      case 'attendance':
        sql = `
          SELECT 
            DATE(timestamp) as date,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
          FROM attendance
          WHERE timestamp > now() - interval $1 || ' days'
          GROUP BY DATE(timestamp)
          ORDER BY date DESC
        `;
        params = [days];
        break;

      case 'projects':
        sql = `
          SELECT 
            status,
            COUNT(*) as count
          FROM student_project_selections
          GROUP BY status
        `;
        break;

      case 'cleanliness':
        sql = `
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as reports,
            SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
          FROM cleanliness_reports
          WHERE created_at > now() - interval $1 || ' days'
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `;
        params = [days];
        break;

      case 'rewards':
        sql = `
          SELECT 
            DATE(created_at) as date,
            SUM(CASE WHEN transaction_type = 'earn' THEN points_amount ELSE 0 END) as earned,
            SUM(CASE WHEN transaction_type = 'redeem' THEN -points_amount ELSE 0 END) as redeemed
          FROM rewards_transactions
          WHERE created_at > now() - interval $1 || ' days'
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `;
        params = [days];
        break;

      default:
        return res.status(400).json({ error: 'Invalid metric' });
    }

    const result = await query(sql, params);
    res.json({ metric, data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
