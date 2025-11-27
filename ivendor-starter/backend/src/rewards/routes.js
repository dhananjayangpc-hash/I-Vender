// Rewards & Loyalty System routes for I-Vender

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth, requireRole } = require('../utils/auth');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

// POST /rewards/earn - Award points to user (admin/system)
router.post('/earn', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { userId, points, reason, relatedEntityType, relatedEntityId } = req.body;

    if (!userId || !points) {
      throw new ValidationError('User ID and points are required');
    }

    if (points < 0) {
      throw new ValidationError('Points must be positive');
    }

    // Check if user exists and has a wallet
    const walletCheck = await query('SELECT id FROM rewards_wallet WHERE user_id = $1', [userId]);
    if (walletCheck.rowCount === 0) {
      throw new NotFoundError('Rewards wallet');
    }

    const walletId = walletCheck.rows[0].id;

    // Create transaction
    await query(
      'INSERT INTO rewards_transactions (user_id, wallet_id, transaction_type, points_amount, reason, related_entity_type, related_entity_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, walletId, 'earn', points, reason || null, relatedEntityType || null, relatedEntityId || null]
    );

    // Update wallet
    const result = await query(
      'UPDATE rewards_wallet SET total_points = total_points + $1, available_points = available_points + $1, lifetime_points = lifetime_points + $1, last_updated = now() WHERE id = $2 RETURNING total_points, available_points, lifetime_points',
      [points, walletId]
    );

    res.json({
      message: 'Points awarded successfully',
      wallet: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// POST /rewards/redeem - Redeem points for a reward
router.post('/redeem', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { rewardId } = req.body;

    if (!rewardId) {
      throw new ValidationError('Reward ID is required');
    }

    // Get reward details
    const rewardCheck = await query('SELECT id, points_cost, is_active FROM rewards_catalog WHERE id = $1', [rewardId]);
    if (rewardCheck.rowCount === 0) {
      throw new NotFoundError('Reward');
    }

    const reward = rewardCheck.rows[0];

    if (!reward.is_active) {
      throw new ValidationError('This reward is no longer available');
    }

    // Check wallet balance
    const walletCheck = await query('SELECT id, available_points FROM rewards_wallet WHERE user_id = $1', [req.user.userId]);
    if (walletCheck.rowCount === 0) {
      throw new NotFoundError('Rewards wallet');
    }

    const wallet = walletCheck.rows[0];

    if (wallet.available_points < reward.points_cost) {
      throw new ValidationError(`Insufficient points. You have ${wallet.available_points} points but need ${reward.points_cost}`);
    }

    // Create redemption
    const redemptionResult = await query(
      'INSERT INTO rewards_redemptions (user_id, reward_id, status) VALUES ($1, $2, $3) RETURNING id, status, created_at',
      [req.user.userId, rewardId, 'pending']
    );

    // Create deduction transaction
    await query(
      'INSERT INTO rewards_transactions (user_id, wallet_id, transaction_type, points_amount, reason, related_entity_type, related_entity_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.userId, wallet.id, 'redeem', -reward.points_cost, 'Reward redemption', 'reward', rewardId]
    );

    // Update wallet
    await query(
      'UPDATE rewards_wallet SET available_points = available_points - $1, last_updated = now() WHERE id = $2',
      [reward.points_cost, wallet.id]
    );

    res.status(201).json({
      message: 'Reward redeemed successfully',
      redemption: redemptionResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET /rewards/wallet - Get user's rewards wallet
router.get('/wallet', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, user_id, total_points, available_points, lifetime_points, last_updated FROM rewards_wallet WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Rewards wallet');
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /rewards/transactions - Get user's transaction history
router.get('/transactions', requireAuth, async (req, res, next) => {
  try {
    const { limit = 30, offset = 0 } = req.query;

    const result = await query(
      'SELECT id, transaction_type, points_amount, reason, related_entity_type, created_at FROM rewards_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.userId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query('SELECT COUNT(*) as count FROM rewards_transactions WHERE user_id = $1', [req.user.userId]);

    res.json({
      transactions: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    next(err);
  }
});

// GET /rewards/catalog - Get available rewards catalog
router.get('/catalog', requireAuth, async (req, res, next) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;

    let sql = 'SELECT id, title, description, points_cost, category, quantity_available FROM rewards_catalog WHERE is_active = true';
    const params = [];

    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    sql += ` ORDER BY points_cost ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    const countResult = await query('SELECT COUNT(*) as count FROM rewards_catalog WHERE is_active = true');

    res.json({
      rewards: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    next(err);
  }
});

// GET /rewards/redemptions - Get user's redemption history
router.get('/redemptions', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        rr.id, rr.status, rr.created_at, rr.fulfilled_at,
        rc.title, rc.points_cost
      FROM rewards_redemptions rr
      JOIN rewards_catalog rc ON rr.reward_id = rc.id
      WHERE rr.user_id = $1
      ORDER BY rr.created_at DESC
    `, [req.user.userId]);

    res.json({
      redemptions: result.rows,
      total: result.rowCount,
    });
  } catch (err) {
    next(err);
  }
});

// POST /rewards/admin/add-reward - Admin: Add new reward to catalog
router.post('/admin/add-reward', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { title, description, pointsCost, category, quantityAvailable = -1 } = req.body;

    if (!title || !pointsCost) {
      throw new ValidationError('Title and points cost are required');
    }

    const result = await query(
      'INSERT INTO rewards_catalog (title, description, points_cost, category, quantity_available) VALUES ($1, $2, $3, $4, $5) RETURNING id, title, points_cost',
      [title, description || null, pointsCost, category || null, quantityAvailable]
    );

    res.status(201).json({
      message: 'Reward added successfully',
      reward: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// PUT /rewards/admin/redemption/:redemptionId - Admin: Approve/fulfill redemption
router.put('/admin/redemption/:redemptionId', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { redemptionId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'fulfilled', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const result = await query(
      `UPDATE rewards_redemptions 
       SET status = $1, fulfilled_at = CASE WHEN $1 = 'fulfilled' THEN now() ELSE fulfilled_at END
       WHERE id = $2
       RETURNING id, status, fulfilled_at`,
      [status, redemptionId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Redemption');
    }

    res.json({
      message: 'Redemption updated successfully',
      redemption: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET /rewards/admin/analytics - Admin: Rewards analytics
router.get('/admin/analytics', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const totalPoints = await query('SELECT SUM(total_points) as total FROM rewards_wallet');
    const redemptionStats = await query(`
      SELECT 
        COUNT(*) as total_redemptions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END) as fulfilled
      FROM rewards_redemptions
    `);
    const topRewards = await query(`
      SELECT rc.id, rc.title, COUNT(rr.id) as redemption_count
      FROM rewards_catalog rc
      LEFT JOIN rewards_redemptions rr ON rc.id = rr.reward_id
      GROUP BY rc.id, rc.title
      ORDER BY redemption_count DESC
      LIMIT 10
    `);

    res.json({
      totalPointsAwarded: totalPoints.rows[0].total || 0,
      redemptionStats: redemptionStats.rows[0],
      topRewards: topRewards.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
