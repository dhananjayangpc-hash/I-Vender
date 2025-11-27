// Custom error classes for I-Vender

class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    this.status = 401;
  }
}

class AuthorizationError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
    this.status = 403;
  }
}

class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

class ConflictError extends Error {
  constructor(message = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

module.exports = {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
};
