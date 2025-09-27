const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware
 * Demonstrates how to implement rate limiting to prevent abuse
 */

// General rate limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit of 100 requests per 15 minutes.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        console.log(`🚫 Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000),
            limit: req.rateLimit.limit,
            current: req.rateLimit.current,
            remaining: req.rateLimit.remaining
        });
    }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
    message: {
        error: 'Authentication rate limit exceeded',
        message: 'Too many authentication attempts. Please try again in 15 minutes.'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
        console.log(`🔒 Auth rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Authentication rate limit exceeded',
            message: 'Too many failed authentication attempts. Please try again in 15 minutes.',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
    }
});

// API-specific rate limiter
const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 200, // limit each IP to 200 API requests per windowMs
    message: {
        error: 'API rate limit exceeded',
        message: 'You have exceeded the API rate limit of 200 requests per 10 minutes.'
    },
    handler: (req, res) => {
        console.log(`📡 API rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            error: 'API rate limit exceeded',
            message: 'Too many API requests from this IP, please try again later.',
            endpoint: req.path,
            method: req.method,
            retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
    }
});

// Create custom rate limiter factory
const createRateLimiter = (options) => {
    const defaultOptions = {
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Rate limit exceeded'
    };

    return rateLimit({
        ...defaultOptions,
        ...options,
        handler: (req, res) => {
            console.log(`⚠️  Custom rate limit exceeded for IP: ${req.ip}, Endpoint: ${req.path}`);
            res.status(429).json({
                error: 'Rate limit exceeded',
                message: options.message || defaultOptions.message,
                details: {
                    limit: req.rateLimit.limit,
                    current: req.rateLimit.current,
                    remaining: req.rateLimit.remaining,
                    resetTime: new Date(req.rateLimit.resetTime).toISOString()
                }
            });
        }
    });
};

module.exports = {
    generalLimiter,
    authLimiter,
    apiLimiter,
    createRateLimiter
};