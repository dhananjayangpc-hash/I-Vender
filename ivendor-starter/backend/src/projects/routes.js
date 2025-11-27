// Projects (AI Project Vending) routes for I-Vender

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth, requireRole } = require('../utils/auth');
const { validateProjectDifficulty } = require('../utils/validators');
const { ValidationError, NotFoundError } = require('../utils/errors');

// POST /projects/recommend - Get AI project recommendations
router.post('/recommend', requireAuth, async (req, res, next) => {
  try {
    const { discipline, skills, interests } = req.body;

    if (!discipline || !skills || !interests) {
      throw new ValidationError('Missing required fields: discipline, skills, interests');
    }

    // Mock AI recommendation engine
    // In production, this would call an ML model
    const recommendations = await getProjectRecommendations(discipline, skills, interests);

    res.json({
      message: 'Recommendations generated',
      recommendations,
      count: recommendations.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /projects/:projectId - Get project details
router.get('/:projectId', requireAuth, async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const result = await query(
      'SELECT id, title, description, tags, difficulty, resources FROM projects WHERE id = $1 AND is_active = true',
      [projectId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Project');
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /projects/select - Student selects a project
router.post('/select', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    // Check if project exists
    const projectCheck = await query('SELECT id FROM projects WHERE id = $1 AND is_active = true', [projectId]);
    if (projectCheck.rowCount === 0) {
      throw new NotFoundError('Project');
    }

    // Check if already selected
    const alreadySelected = await query(
      'SELECT id FROM student_project_selections WHERE student_id = $1 AND project_id = $2',
      [req.user.userId, projectId]
    );

    if (alreadySelected.rowCount > 0) {
      throw new ValidationError('You have already selected this project');
    }

    // Create selection
    const result = await query(
      'INSERT INTO student_project_selections (student_id, project_id, status) VALUES ($1, $2, $3) RETURNING id, status, selected_at',
      [req.user.userId, projectId, 'selected']
    );

    // Award points for project selection
    await awardProjectPoints(req.user.userId, 'selected');

    res.status(201).json({
      message: 'Project selected successfully',
      selection: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET /projects - List all active projects (with optional filtering)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { difficulty, tags, limit = 20, offset = 0 } = req.query;

    let sql = 'SELECT id, title, description, tags, difficulty FROM projects WHERE is_active = true';
    const params = [];

    if (difficulty) {
      validateProjectDifficulty(difficulty);
      params.push(difficulty);
      sql += ` AND difficulty = $${params.length}`;
    }

    if (tags) {
      const tagArray = tags.split(',');
      params.push(tagArray);
      sql += ` AND tags && $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    const countResult = await query('SELECT COUNT(*) as count FROM projects WHERE is_active = true');

    res.json({
      projects: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    next(err);
  }
});

// GET /projects/student/my-selections - Get student's project selections
router.get('/student/my-selections', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        sp.id,
        sp.project_id,
        sp.status,
        sp.selected_at,
        sp.completed_at,
        p.title,
        p.description,
        p.difficulty,
        p.tags
      FROM student_project_selections sp
      JOIN projects p ON sp.project_id = p.id
      WHERE sp.student_id = $1
      ORDER BY sp.selected_at DESC
    `, [req.user.userId]);

    res.json({
      selections: result.rows,
      total: result.rowCount,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /projects/student/update-status/:selectionId - Update project selection status
router.put('/student/update-status/:selectionId', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { selectionId } = req.params;
    const { status } = req.body;

    const validStatuses = ['selected', 'in_progress', 'completed', 'abandoned'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Check ownership
    const check = await query(
      'SELECT id FROM student_project_selections WHERE id = $1 AND student_id = $2',
      [selectionId, req.user.userId]
    );

    if (check.rowCount === 0) {
      throw new NotFoundError('Project selection');
    }

    const result = await query(
      'UPDATE student_project_selections SET status = $1, completed_at = CASE WHEN $1 = \'completed\' THEN now() ELSE completed_at END WHERE id = $2 RETURNING status, completed_at',
      [status, selectionId]
    );

    // Award points for project completion
    if (status === 'completed') {
      await awardProjectPoints(req.user.userId, 'completed');
    }

    res.json({
      message: 'Project status updated',
      selection: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// Helper: Mock AI recommendation engine
async function getProjectRecommendations(discipline, skills, interests) {
  // This is a mock implementation
  // In production, call an ML model with the user's profile
  const allProjects = await query('SELECT id, title, description, tags, difficulty FROM projects WHERE is_active = true LIMIT 100');

  // Simple filtering based on tags
  const skillArray = Array.isArray(skills) ? skills : skills.split(',');
  const interestArray = Array.isArray(interests) ? interests : interests.split(',');

  const scored = allProjects.rows.map(project => {
    let score = 0;
    const projectTags = project.tags || [];

    // Score based on skill match
    skillArray.forEach(skill => {
      if (projectTags.includes(skill.toLowerCase())) score += 2;
    });

    // Score based on interest match
    interestArray.forEach(interest => {
      if (projectTags.includes(interest.toLowerCase())) score += 1;
    });

    return { ...project, score };
  });

  // Return top 5 recommendations
  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}

// Helper: Award points for project activities
async function awardProjectPoints(userId, activity) {
  try {
    const pointsMap = { selected: 25, completed: 100 };
    const points = pointsMap[activity] || 0;

    const wallet = await query('SELECT id FROM rewards_wallet WHERE user_id = $1', [userId]);
    if (wallet.rowCount > 0) {
      const walletId = wallet.rows[0].id;
      await query(
        'INSERT INTO rewards_transactions (user_id, wallet_id, transaction_type, points_amount, reason, related_entity_type) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, walletId, 'earn', points, `Project ${activity}`, 'project']
      );
      await query(
        'UPDATE rewards_wallet SET total_points = total_points + $1, available_points = available_points + $1, lifetime_points = lifetime_points + $1 WHERE id = $2',
        [points, walletId]
      );
    }
  } catch (err) {
    console.error('Error awarding project points:', err);
  }
}

module.exports = router;
