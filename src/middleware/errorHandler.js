/**
 * Error Handling Middleware
 * Demonstrates centralized error handling in Express applications
 */

/**
 * Custom Error Classes
 */
class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409, 'CONFLICT_ERROR');
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}

/**
 * Error response formatter
 */
const formatErrorResponse = (error, req) => {
    const response = {
        success: false,
        error: {
            message: error.message,
            code: error.code || 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            method: req.method,
            requestId: req.requestId || 'N/A'
        }
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.error.stack = error.stack;
    }

    // Add validation details if available
    if (error.details) {
        response.error.details = error.details;
    }

    // Add suggestions for common errors
    if (error.statusCode === 404) {
        response.suggestions = [
            'Check the URL spelling',
            'Verify the resource exists',
            'Check API documentation for correct endpoints'
        ];
    }

    if (error.statusCode === 401) {
        response.suggestions = [
            'Ensure you are logged in',
            'Check if your token is valid and not expired',
            'Include Authorization header with Bearer token'
        ];
    }

    if (error.statusCode === 403) {
        response.suggestions = [
            'Check if you have required permissions',
            'Contact administrator for access',
            'Verify your user role and privileges'
        ];
    }

    return response;
};

/**
 * Main error handling middleware
 */
const errorHandlerMiddleware = (error, req, res, next) => {
    // Default to 500 server error
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';

    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
    } else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
    } else if (error.code === 11000) {
        // MongoDB duplicate key error
        statusCode = 409;
        message = 'Resource already exists';
    } else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    } else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    } else if (error.code === 'LIMIT_FILE_SIZE') {
        statusCode = 413;
        message = 'File too large';
    }

    // Create error object with computed values
    const errorObj = {
        ...error,
        statusCode,
        message
    };

    // Log the error
    console.error(`❌ Error occurred:`, {
        message: errorObj.message,
        statusCode: errorObj.statusCode,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId,
        stack: error.stack
    });

    // Format and send error response
    const response = formatErrorResponse(errorObj, req);
    res.status(statusCode).json(response);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
const asyncErrorHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 handler middleware
 */
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
};

/**
 * Development error handler
 */
const developmentErrorHandler = (error, req, res, next) => {
    console.error('💥 Development Error:', error);
    
    res.status(error.statusCode || 500).json({
        success: false,
        error: {
            message: error.message,
            code: error.code || 'DEVELOPMENT_ERROR',
            stack: error.stack,
            details: error.details || null,
            path: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString()
        }
    });
};

/**
 * Production error handler
 */
const productionErrorHandler = (error, req, res, next) => {
    // Don't leak error details in production
    if (error.isOperational) {
        const response = formatErrorResponse(error, req);
        res.status(error.statusCode).json(response);
    } else {
        // Log the error but don't expose details
        console.error('💥 Production Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                message: 'Something went wrong',
                code: 'INTERNAL_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
};

/**
 * Get appropriate error handler based on environment
 */
const getErrorHandler = () => {
    return process.env.NODE_ENV === 'production' 
        ? productionErrorHandler 
        : developmentErrorHandler;
};

module.exports = {
    // Error classes
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    
    // Middleware
    errorHandlerMiddleware,
    asyncErrorHandler,
    notFoundHandler,
    developmentErrorHandler,
    productionErrorHandler,
    getErrorHandler,
    
    // Utilities
    formatErrorResponse
};