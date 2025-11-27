// Validation utilities for I-Vender

const { ValidationError } = require('./errors');

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

function validatePassword(password) {
  if (password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }
}

function validateUserRole(role) {
  const validRoles = ['student', 'mentor', 'faculty', 'admin'];
  if (!validRoles.includes(role)) {
    throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }
}

function validateAttendanceMethod(method) {
  const validMethods = ['rfid', 'face', 'manual'];
  if (!validMethods.includes(method)) {
    throw new ValidationError(`Invalid attendance method. Must be one of: ${validMethods.join(', ')}`);
  }
}

function validateProjectDifficulty(difficulty) {
  const validDifficulties = ['beginner', 'intermediate', 'advanced'];
  if (!validDifficulties.includes(difficulty)) {
    throw new ValidationError(`Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`);
  }
}

function validateReportPriority(priority) {
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (!validPriorities.includes(priority)) {
    throw new ValidationError(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
  }
}

function validateReportStatus(status) {
  const validStatuses = ['open', 'in_progress', 'resolved', 'dismissed'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }
}

function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

module.exports = {
  validateEmail,
  validatePassword,
  validateUserRole,
  validateAttendanceMethod,
  validateProjectDifficulty,
  validateReportPriority,
  validateReportStatus,
  isValidUUID,
};
