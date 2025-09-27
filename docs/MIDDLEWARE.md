# Middleware Guide

## Overview

This project demonstrates various middleware patterns commonly used in Express.js applications. Middleware functions are functions that have access to the request object (req), the response object (res), and the next middleware function in the application's request-response cycle.

## Table of Contents

1. [Authentication Middleware](#authentication-middleware)
2. [Rate Limiting Middleware](#rate-limiting-middleware)
3. [Logging Middleware](#logging-middleware)
4. [Validation Middleware](#validation-middleware)
5. [Error Handling Middleware](#error-handling-middleware)
6. [Security Middleware](#security-middleware)

## Authentication Middleware

**Location:** `src/middleware/auth.js`

### Purpose
- Validates JWT tokens
- Protects routes from unauthorized access
- Injects user context into requests

### Features
- JWT token verification
- Token expiration handling
- User context injection
- Optional authentication mode
- Token generation utilities

### Usage Examples

**Protecting a route:**
```javascript
const { authMiddleware } = require('./middleware/auth');

router.get('/protected', authMiddleware, (req, res) => {
    // req.user contains decoded token data
    res.json({ user: req.user });
});
```

**Optional authentication:**
```javascript
const { optionalAuthMiddleware } = require('./middleware/auth');

router.get('/public', optionalAuthMiddleware, (req, res) => {
    // req.user exists if token was provided
    const isAuthenticated = !!req.user;
    res.json({ authenticated: isAuthenticated });
});
```

### Error Responses
- Missing token: 401 Unauthorized
- Invalid token: 401 Unauthorized  
- Expired token: 401 Unauthorized

## Rate Limiting Middleware

**Location:** `src/middleware/rateLimit.js`

### Purpose
- Prevents API abuse
- Controls request frequency
- Implements different limits for different endpoints

### Features
- IP-based rate limiting
- Configurable time windows
- Different limits per endpoint type
- Custom error responses
- Rate limit headers

### Rate Limiters

**General Limiter:**
- 100 requests per 15 minutes
- Applied to all routes

**Auth Limiter:**
- 5 requests per 15 minutes
- Applied to login/register endpoints
- Skips successful requests

**API Limiter:**
- 200 requests per 10 minutes
- Applied to `/api/*` routes

### Usage Examples

```javascript
const { generalLimiter, authLimiter } = require('./middleware/rateLimit');

// Apply general rate limiting
app.use(generalLimiter);

// Apply strict limiting to auth endpoints
app.use('/api/auth', authLimiter);
```

### Custom Rate Limiter

```javascript
const { createRateLimiter } = require('./middleware/rateLimit');

const customLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Custom rate limit exceeded'
});
```

## Logging Middleware

**Location:** `src/middleware/logging.js`

### Purpose
- Tracks request/response patterns
- Monitors performance
- Provides audit trails
- Helps with debugging

### Features
- Request/response logging
- Performance timing
- File-based log storage
- Error logging
- Unique request IDs
- Structured log format

### Log Files
- `logs/access.log`: Request/response logs
- `logs/error.log`: Error logs

### Log Format
```json
{
  "timestamp": "2023-01-01T00:00:00.000Z",
  "method": "GET",
  "url": "/api/users",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "statusCode": 200,
  "responseTime": "45ms",
  "contentLength": "1234",
  "user": "john_doe",
  "requestId": "uuid-string"
}
```

### Usage Example

```javascript
const { loggingMiddleware, timingMiddleware } = require('./middleware/logging');

// Add logging to all requests
app.use(loggingMiddleware);

// Add timing middleware for performance monitoring
app.use(timingMiddleware);
```

### Getting Log Statistics

```javascript
const { getLogStats } = require('./middleware/logging');

const stats = getLogStats();
console.log('Log statistics:', stats);
```

## Validation Middleware

**Location:** `src/middleware/validation.js`

### Purpose
- Validates input data
- Sanitizes user input
- Prevents injection attacks
- Ensures data integrity

### Features
- Schema-based validation using Joi
- Input sanitization
- Comprehensive error messages
- Custom validation rules
- Request transformation

### Pre-built Validators

**User validation:**
```javascript
const { validationMiddleware } = require('./middleware/validation');

router.post('/users', validationMiddleware.validateUserCreate, handler);
router.put('/users/:id', validationMiddleware.validateUserUpdate, handler);
```

**Product validation:**
```javascript
router.post('/products', validationMiddleware.validateProductCreate, handler);
```

**Query parameter validation:**
```javascript
router.get('/users', validationMiddleware.validatePagination, handler);
```

### Custom Validation

```javascript
const { validateSchema } = require('./middleware/validation');
const Joi = require('joi');

const customSchema = Joi.object({
    name: Joi.string().min(3).required(),
    age: Joi.number().min(18).max(100)
});

const customValidator = validateSchema(customSchema);
router.post('/custom', customValidator, handler);
```

### Input Sanitization

```javascript
const { sanitizeInput } = require('./middleware/validation');

// Automatically sanitizes request body and query parameters
app.use(sanitizeInput);
```

### Validation Error Response
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "username",
        "message": "Username must be at least 3 characters long",
        "value": "ab"
      }
    ]
  },
  "suggestions": [
    "Check required fields",
    "Verify data types",
    "Review field constraints"
  ]
}
```

## Error Handling Middleware

**Location:** `src/middleware/errorHandler.js`

### Purpose
- Centralizes error processing
- Provides consistent error responses
- Handles different error types
- Prevents information leakage

### Features
- Custom error classes
- Environment-specific handling
- Error response formatting
- Stack trace management (dev only)
- Error suggestions

### Custom Error Classes

```javascript
const { 
    ValidationError, 
    AuthenticationError, 
    NotFoundError 
} = require('./middleware/errorHandler');

// Throw custom errors
throw new ValidationError('Invalid input data');
throw new AuthenticationError('Invalid credentials');
throw new NotFoundError('User');
```

### Async Error Handling

```javascript
const { asyncErrorHandler } = require('./middleware/errorHandler');

// Automatically catches async errors
router.get('/users', asyncErrorHandler(async (req, res) => {
    const users = await getUsersFromDB();
    res.json(users);
}));
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "message": "User not found",
    "code": "NOT_FOUND",
    "timestamp": "2023-01-01T00:00:00.000Z",
    "path": "/api/users/123",
    "method": "GET",
    "requestId": "uuid"
  },
  "suggestions": [
    "Check the URL spelling",
    "Verify the resource exists"
  ]
}
```

### Usage

```javascript
const { 
    errorHandlerMiddleware, 
    notFoundHandler 
} = require('./middleware/errorHandler');

// 404 handler for unmatched routes
app.use('*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandlerMiddleware);
```

## Security Middleware

The project uses several security middleware packages:

### Helmet.js
Provides security headers:
```javascript
app.use(helmet());
```

**Headers added:**
- Content Security Policy
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- And more...

### CORS
Handles cross-origin requests:
```javascript
app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true
}));
```

### Body Parser Limits
Prevents large payload attacks:
```javascript
app.use(express.json({ limit: '10mb' }));
```

## Middleware Chain Example

Here's how middleware is typically chained in this application:

```javascript
// 1. Security middleware
app.use(helmet());
app.use(cors());

// 2. Logging middleware
app.use(loggingMiddleware);

// 3. Body parsing
app.use(express.json());

// 4. Rate limiting
app.use(generalLimiter);

// 5. Input sanitization
app.use(sanitizeInput);

// 6. Route-specific middleware
router.post('/users', 
    authLimiter,                    // Rate limiting
    validationMiddleware.validateUser, // Validation
    asyncErrorHandler(createUser)   // Route handler
);

// 7. Error handling (last)
app.use(errorHandlerMiddleware);
```

## Best Practices

1. **Order Matters**: Middleware executes in the order it's defined
2. **Early Validation**: Validate inputs as early as possible
3. **Error Boundaries**: Use async error handlers for async routes
4. **Logging**: Log important events and errors
5. **Security**: Always sanitize inputs and set security headers
6. **Performance**: Monitor response times and optimize slow middleware
7. **Testing**: Test middleware independently and as part of the chain

## Custom Middleware Development

Creating custom middleware:

```javascript
const customMiddleware = (req, res, next) => {
    // Pre-processing
    req.customData = 'some value';
    
    // Store start time
    const start = Date.now();
    
    // Override res.json to add post-processing
    const originalJson = res.json;
    res.json = function(body) {
        // Post-processing
        const duration = Date.now() - start;
        console.log(`Request took ${duration}ms`);
        
        // Call original method
        return originalJson.call(this, body);
    };
    
    // Continue to next middleware
    next();
};

// Use custom middleware
app.use(customMiddleware);
```

This guide demonstrates how middleware can be used to implement cross-cutting concerns in a modular and reusable way.