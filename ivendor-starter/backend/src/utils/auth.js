// Authentication utilities for I-Vender (JWT mock for MVP)

const crypto = require('crypto');
const { AuthenticationError, AuthorizationError } = require('./errors');

// Mock JWT-like token generation (replace with real JWT library in production)
function generateToken(userId, role) {
  const payload = {
    userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
  };
  const token = Buffer.from(JSON.stringify(payload)).toString('base64');
  return token;
}

// Mock token verification (replace with real JWT library in production)
function verifyToken(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new AuthenticationError('Token expired');
    }
    return decoded;
  } catch (err) {
    throw new AuthenticationError('Invalid token');
  }
}

// Hash password (use bcrypt in production)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Compare password (use bcrypt in production)
function comparePassword(password, hash) {
  return hashPassword(password) === hash;
}

// Middleware to check authentication
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

// Middleware to check role-based access
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  requireAuth,
  requireRole,
};
