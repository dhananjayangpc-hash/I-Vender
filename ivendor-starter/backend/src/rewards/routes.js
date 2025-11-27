// Rewards & Loyalty System routes for I-Vender

const express = require('express');
const router = express.Router();
const { query, pool } = require('../db');
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
    const walletCheck = await query('SELECT id FROM rewards_wallet WHERE student_id = $1', [userId]);
    if (walletCheck.rowCount === 0) {
      throw new NotFoundError('Rewards wallet');
    }

    const walletId = walletCheck.rows[0].id;

    // Create transaction and update wallet (points_change positive for earn)
    await query(
      'INSERT INTO rewards_transactions (student_id, transaction_type, reason, points_change, reference_id, reference_type) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, 'earn', reason || null, points, relatedEntityId || null, relatedEntityType || null]
    );

    const result = await query(
      'UPDATE rewards_wallet SET total_points = total_points + $1, available_points = available_points + $1, lifetime_points = lifetime_points + $1, updated_at = now() WHERE id = $2 RETURNING total_points, available_points, lifetime_points',
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

    // Get reward details (adapted to schema)
    const rewardCheck = await query('SELECT id, points_required, status, reward_type, max_redemptions FROM rewards_catalog WHERE id = $1', [rewardId]);
    if (rewardCheck.rowCount === 0) {
      throw new NotFoundError('Reward');
    }
    const reward = rewardCheck.rows[0];

    if (reward.status !== 'active') {
      throw new ValidationError('This reward is no longer available');
    }

    // Check wallet balance
    const walletCheck = await query('SELECT id, available_points FROM rewards_wallet WHERE student_id = $1', [req.user.userId]);
    if (walletCheck.rowCount === 0) {
      throw new NotFoundError('Rewards wallet');
    }

    const wallet = walletCheck.rows[0];

    if (wallet.available_points < reward.points_required) {
      throw new ValidationError(`Insufficient points. You have ${wallet.available_points} points but need ${reward.points_required}`);
    }

    // Perform redemption inside a transaction to ensure consistency
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const redemptionResult = await client.query(
        'INSERT INTO reward_redemptions (student_id, reward_id, status, created_at) VALUES ($1, $2, $3, now()) RETURNING id, status, created_at',
        [req.user.userId, rewardId, 'pending']
      );

      await client.query(
        'INSERT INTO rewards_transactions (student_id, transaction_type, points_change, reason, reference_id, reference_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, now())',
        [req.user.userId, 'redeem', -reward.points_required, 'Reward redemption', rewardId, 'reward']
      );

      await client.query(
        'UPDATE rewards_wallet SET available_points = available_points - $1, updated_at = now() WHERE id = $2',
        [reward.points_required, wallet.id]
      );

      await client.query('COMMIT');
      res.status(201).json({
        message: 'Reward redeemed successfully',
        redemption: redemptionResult.rows[0],
      });
    } catch (errTx) {
      await client.query('ROLLBACK');
      throw errTx;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /rewards/wallet - Get user's rewards wallet
router.get('/wallet', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, student_id as user_id, total_points, available_points, lifetime_points, updated_at as last_updated FROM rewards_wallet WHERE student_id = $1',
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
      'SELECT id, transaction_type, points_change as points_amount, reason, reference_type as related_entity_type, created_at FROM rewards_transactions WHERE student_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.userId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query('SELECT COUNT(*) as count FROM rewards_transactions WHERE student_id = $1', [req.user.userId]);

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
    let sql = 'SELECT id, title, description, points_required, reward_type as category, max_redemptions as quantity_available FROM rewards_catalog WHERE status = \'active\'';
    const params = [];

    if (category) {
      params.push(category);
      sql += ` AND reward_type = $${params.length}`;
    }

    sql += ` ORDER BY points_required ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    const countResult = await query('SELECT COUNT(*) as count FROM rewards_catalog WHERE status = $1', ['active']);

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
        rr.id, rr.status, rr.created_at, rr.distributed_date,
        rc.title, rc.points_required
      FROM reward_redemptions rr
      LEFT JOIN rewards_catalog rc ON rr.reward_id = rc.id
      WHERE rr.student_id = $1
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
    const { title, description, pointsRequired, rewardType, maxRedemptions = -1 } = req.body;

    if (!title || !pointsRequired) {
      throw new ValidationError('Title and points required are required');
    }

    const result = await query(
      'INSERT INTO rewards_catalog (title, description, points_required, reward_type, max_redemptions, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, points_required',
      [title, description || null, pointsRequired, rewardType || null, maxRedemptions, 'active']
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
      `UPDATE reward_redemptions 
       SET status = $1, distributed_date = CASE WHEN $1 = 'fulfilled' THEN now() ELSE distributed_date END
       WHERE id = $2
       RETURNING id, status, distributed_date`,
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

// POST /rewards/convert - Convert points into canteen voucher or fee refund

router.post('/convert', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { target, points } = req.body; // target: 'canteen' | 'cash'

    if (!target || !points || points <= 0) {
      throw new ValidationError('Target and positive points are required');
    }

    // Check wallet
    const walletRes = await query('SELECT id, available_points FROM rewards_wallet WHERE student_id = $1', [req.user.userId]);
    if (walletRes.rowCount === 0) throw new NotFoundError('Rewards wallet');
    const wallet = walletRes.rows[0];

    if (wallet.available_points < points) {
      throw new ValidationError('Insufficient points');
    }

    // Perform conversion in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'INSERT INTO rewards_transactions (student_id, transaction_type, points_change, reason, reference_type, reference_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, now())',
        [req.user.userId, 'redeem', -points, `Convert to ${target}`, 'conversion', null]
      );

      await client.query('UPDATE rewards_wallet SET available_points = available_points - $1, updated_at = now() WHERE id = $2', [points, wallet.id]);

      const meta = { converted_points: points, target };
      const redemptionRes = await client.query(
        'INSERT INTO reward_redemptions (student_id, reward_id, status, metadata, created_at) VALUES ($1, $2, $3, $4, now()) RETURNING id, status, created_at',
        [req.user.userId, null, 'pending', JSON.stringify(meta)]
      );

      await client.query('COMMIT');

      const voucher = target === 'canteen' ? `CANTEEN-${Math.random().toString(36).slice(2,10).toUpperCase()}` : null;

      res.status(201).json({
        message: 'Conversion requested',
        redemption: redemptionRes.rows[0],
        voucher,
      });
    } catch (errTx) {
      await client.query('ROLLBACK');
      throw errTx;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /rewards/admin/conversions-pending - Admin: Get all pending conversions
router.get('/admin/conversions-pending', requireAuth, requireRole('mentor', 'admin'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT rr.id, rr.student_id, rr.status, rr.metadata, rr.created_at
      FROM reward_redemptions rr
      WHERE rr.status = $1 AND rr.reward_id IS NULL AND rr.metadata IS NOT NULL
      ORDER BY rr.created_at ASC
    `, ['pending']);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /rewards/admin/conversion-approve - Admin: Approve a conversion
router.post('/admin/conversion-approve', requireAuth, requireRole('mentor', 'admin'), async (req, res, next) => {
  try {
    const { redemption_id } = req.body;

    if (!redemption_id) {
      throw new ValidationError('Redemption ID is required');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE reward_redemptions SET status = $1, distributed_date = now() WHERE id = $2 RETURNING id, status, metadata, student_id',
        ['approved', redemption_id]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('Redemption');
      }

      await client.query('COMMIT');

      res.json({
        message: 'Conversion approved',
        redemption: result.rows[0],
      });
    } catch (errTx) {
      await client.query('ROLLBACK');
      throw errTx;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// POST /rewards/admin/conversion-reject - Admin: Reject a conversion and refund points
router.post('/admin/conversion-reject', requireAuth, requireRole('mentor', 'admin'), async (req, res, next) => {
  try {
    const { redemption_id, reason } = req.body;

    if (!redemption_id) {
      throw new ValidationError('Redemption ID is required');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get conversion details
      const redemptionRes = await client.query(
        'SELECT id, student_id, status, metadata FROM reward_redemptions WHERE id = $1',
        [redemption_id]
      );

      if (redemptionRes.rowCount === 0) {
        throw new NotFoundError('Redemption');
      }

      const redemption = redemptionRes.rows[0];
      const meta = redemption.metadata || {};
      const pointsToRefund = meta.converted_points;

      // Refund points if rejection
      if (pointsToRefund) {
        const walletRes = await client.query(
          'SELECT id FROM rewards_wallet WHERE student_id = $1',
          [redemption.student_id]
        );

        if (walletRes.rowCount > 0) {
          await client.query(
            'UPDATE rewards_wallet SET available_points = available_points + $1, updated_at = now() WHERE id = $2',
            [pointsToRefund, walletRes.rows[0].id]
          );

          await client.query(
            'INSERT INTO rewards_transactions (student_id, transaction_type, points_change, reason, reference_type, created_at) VALUES ($1, $2, $3, $4, $5, now())',
            [redemption.student_id, 'earn', pointsToRefund, `Conversion rejected: ${reason || 'No reason provided'}`, 'conversion_refund']
          );
        }
      }

      // Mark redemption as rejected
      const updateRes = await client.query(
        'UPDATE reward_redemptions SET status = $1, distributed_date = now() WHERE id = $2 RETURNING id, status',
        ['rejected', redemption_id]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Conversion rejected and points refunded',
        redemption: updateRes.rows[0],
      });
    } catch (errTx) {
      await client.query('ROLLBACK');
      throw errTx;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /rewards/admin/rewards-all - Admin: Get all rewards in catalog
router.get('/admin/rewards-all', requireAuth, requireRole('mentor', 'admin'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, title, description, points_required, reward_type, max_redemptions, status, is_active
      FROM rewards_catalog
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
