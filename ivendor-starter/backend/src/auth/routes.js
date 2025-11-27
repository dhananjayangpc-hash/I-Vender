// Authentication routes for I-Vender

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { generateToken, hashPassword, comparePassword, requireAuth } = require('../utils/auth');
const { validateEmail, validatePassword, validateUserRole, isValidUUID } = require('../utils/validators');
const { ValidationError, ConflictError, AuthenticationError, NotFoundError } = require('../utils/errors');

// POST /auth/register - User registration
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      throw new ValidationError('Missing required fields: email, password, name, role');
    }

    validateEmail(email);
    validatePassword(password);
    validateUserRole(role);

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rowCount > 0) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create user
    const result = await query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, passwordHash, name, role]
    );

    const user = result.rows[0];

    // Create rewards wallet for new user
    if (role === 'student') {
      await query('INSERT INTO rewards_wallet (user_id, total_points, available_points, lifetime_points) VALUES ($1, 0, 0, 0)', [user.id]);
    }

    // Log action
    await query(
      'INSERT INTO audit_logs (user_id, user_role, action, resource_type, resource_id, after_state) VALUES ($1, $2, $3, $4, $5, $6)',
      [user.id, 'system', 'user.register', 'user', user.id, JSON.stringify(user)]
    );

    res.status(201).json({ message: 'User registered successfully', user });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login - User login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Missing required fields: email, password');
    }

    // Find user
    const result = await query('SELECT id, email, name, role, password_hash FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      throw new AuthenticationError('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    if (!comparePassword(password, user.password_hash)) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Log action
    await query(
      'INSERT INTO audit_logs (user_id, user_role, action, resource_type, resource_id) VALUES ($1, $2, $3, $4, $5)',
      [user.id, user.role, 'user.login', 'user', user.id]
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me - Get current user
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT id, email, name, role, profile FROM users WHERE id = $1', [req.user.userId]);
    if (result.rowCount === 0) {
      throw new NotFoundError('User');
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout - User logout (optional, mainly for frontend)
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await query(
      'INSERT INTO audit_logs (user_id, user_role, action, resource_type, resource_id) VALUES ($1, $2, $3, $4, $5)',
      [req.user.userId, req.user.role, 'user.logout', 'user', req.user.userId]
    );
    res.json({ message: 'Logout successful' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
