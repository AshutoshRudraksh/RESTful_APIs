const Joi = require('joi');

/**
 * Validation Middleware
 * Demonstrates input validation middleware using Joi
 */

/**
 * Generic validation middleware factory
 */
const validateSchema = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false, // Return all validation errors
            allowUnknown: false, // Don't allow unknown fields
            stripUnknown: true // Remove unknown fields
        });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context.value
            }));

            console.log(`❌ Validation failed for ${req.method} ${req.path}:`, validationErrors);

            return res.status(400).json({
                success: false,
                error: {
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: validationErrors,
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl
                },
                suggestions: [
                    'Check required fields',
                    'Verify data types',
                    'Review field constraints',
                    'Check API documentation for field requirements'
                ]
            });
        }

        // Replace request property with validated and sanitized value
        req[property] = value;
        console.log(`✅ Validation passed for ${req.method} ${req.path}`);
        next();
    };
};

/**
 * Common validation schemas
 */
const schemas = {
    // User validation schemas
    user: {
        create: Joi.object({
            username: Joi.string()
                .alphanum()
                .min(3)
                .max(30)
                .required()
                .messages({
                    'string.alphanum': 'Username must contain only alphanumeric characters',
                    'string.min': 'Username must be at least 3 characters long',
                    'string.max': 'Username cannot exceed 30 characters',
                    'any.required': 'Username is required'
                }),
            email: Joi.string()
                .email()
                .required()
                .messages({
                    'string.email': 'Please provide a valid email address',
                    'any.required': 'Email is required'
                }),
            password: Joi.string()
                .min(6)
                .max(128)
                .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
                .required()
                .messages({
                    'string.min': 'Password must be at least 6 characters long',
                    'string.max': 'Password cannot exceed 128 characters',
                    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
                    'any.required': 'Password is required'
                }),
            firstName: Joi.string()
                .min(1)
                .max(50)
                .required()
                .messages({
                    'string.min': 'First name is required',
                    'string.max': 'First name cannot exceed 50 characters',
                    'any.required': 'First name is required'
                }),
            lastName: Joi.string()
                .min(1)
                .max(50)
                .required()
                .messages({
                    'string.min': 'Last name is required',
                    'string.max': 'Last name cannot exceed 50 characters',
                    'any.required': 'Last name is required'
                }),
            age: Joi.number()
                .integer()
                .min(18)
                .max(120)
                .optional()
                .messages({
                    'number.integer': 'Age must be a whole number',
                    'number.min': 'Age must be at least 18',
                    'number.max': 'Age cannot exceed 120'
                }),
            phone: Joi.string()
                .pattern(new RegExp('^\\+?[1-9]\\d{1,14}$'))
                .optional()
                .messages({
                    'string.pattern.base': 'Please provide a valid phone number'
                })
        }),
        
        update: Joi.object({
            username: Joi.string().alphanum().min(3).max(30).optional(),
            email: Joi.string().email().optional(),
            firstName: Joi.string().min(1).max(50).optional(),
            lastName: Joi.string().min(1).max(50).optional(),
            age: Joi.number().integer().min(18).max(120).optional(),
            phone: Joi.string().pattern(new RegExp('^\\+?[1-9]\\d{1,14}$')).optional()
        }).min(1) // At least one field must be provided for update
    },

    // Product validation schemas
    product: {
        create: Joi.object({
            name: Joi.string()
                .min(1)
                .max(100)
                .required()
                .messages({
                    'any.required': 'Product name is required',
                    'string.max': 'Product name cannot exceed 100 characters'
                }),
            description: Joi.string()
                .max(1000)
                .optional()
                .messages({
                    'string.max': 'Description cannot exceed 1000 characters'
                }),
            price: Joi.number()
                .positive()
                .precision(2)
                .required()
                .messages({
                    'number.positive': 'Price must be a positive number',
                    'any.required': 'Price is required'
                }),
            category: Joi.string()
                .valid('electronics', 'clothing', 'books', 'home', 'sports', 'other')
                .required()
                .messages({
                    'any.only': 'Category must be one of: electronics, clothing, books, home, sports, other',
                    'any.required': 'Category is required'
                }),
            stock: Joi.number()
                .integer()
                .min(0)
                .required()
                .messages({
                    'number.integer': 'Stock must be a whole number',
                    'number.min': 'Stock cannot be negative',
                    'any.required': 'Stock is required'
                }),
            sku: Joi.string()
                .alphanum()
                .min(3)
                .max(20)
                .required()
                .messages({
                    'string.alphanum': 'SKU must contain only alphanumeric characters',
                    'string.min': 'SKU must be at least 3 characters',
                    'string.max': 'SKU cannot exceed 20 characters',
                    'any.required': 'SKU is required'
                })
        }),
        
        update: Joi.object({
            name: Joi.string().min(1).max(100).optional(),
            description: Joi.string().max(1000).optional(),
            price: Joi.number().positive().precision(2).optional(),
            category: Joi.string().valid('electronics', 'clothing', 'books', 'home', 'sports', 'other').optional(),
            stock: Joi.number().integer().min(0).optional(),
            sku: Joi.string().alphanum().min(3).max(20).optional()
        }).min(1)
    },

    // Order validation schemas
    order: {
        create: Joi.object({
            items: Joi.array()
                .items(
                    Joi.object({
                        productId: Joi.string().required(),
                        quantity: Joi.number().integer().min(1).required(),
                        price: Joi.number().positive().precision(2).required()
                    })
                )
                .min(1)
                .required()
                .messages({
                    'array.min': 'Order must contain at least one item',
                    'any.required': 'Items are required'
                }),
            shippingAddress: Joi.object({
                street: Joi.string().min(1).max(200).required(),
                city: Joi.string().min(1).max(100).required(),
                state: Joi.string().min(1).max(100).required(),
                zipCode: Joi.string().min(5).max(10).required(),
                country: Joi.string().min(2).max(100).required()
            }).required(),
            notes: Joi.string().max(500).optional()
        })
    },

    // Query parameter validation
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sort: Joi.string().valid('asc', 'desc').default('asc'),
        sortBy: Joi.string().optional()
    }),

    // Login validation
    auth: {
        login: Joi.object({
            username: Joi.string().required(),
            password: Joi.string().required()
        }),
        
        register: Joi.object({
            username: Joi.string().alphanum().min(3).max(30).required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(6).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)')).required()
        })
    }
};

/**
 * Pre-built validation middleware for common use cases
 */
const validationMiddleware = {
    // Body validation
    validateUserCreate: validateSchema(schemas.user.create),
    validateUserUpdate: validateSchema(schemas.user.update),
    validateProductCreate: validateSchema(schemas.product.create),
    validateProductUpdate: validateSchema(schemas.product.update),
    validateOrderCreate: validateSchema(schemas.order.create),
    validateLogin: validateSchema(schemas.auth.login),
    validateRegister: validateSchema(schemas.auth.register),
    
    // Query parameter validation
    validatePagination: validateSchema(schemas.pagination, 'query'),
    
    // Custom validation middleware
    validateId: (paramName = 'id') => {
        return validateSchema(
            Joi.object({
                [paramName]: Joi.string().uuid().required()
            }),
            'params'
        );
    },

    // Multiple field validation
    validateFields: (fields) => {
        const schema = Joi.object(fields);
        return validateSchema(schema);
    }
};

/**
 * Sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
    // Recursively sanitize object
    const sanitize = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            if (typeof obj === 'string') {
                // Basic XSS protection - remove script tags and javascript: URLs
                return obj
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .trim();
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }

        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitize(obj[key]);
            }
        }
        return sanitized;
    };

    // Sanitize request body
    if (req.body) {
        req.body = sanitize(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
        req.query = sanitize(req.query);
    }

    console.log(`🧹 Input sanitized for ${req.method} ${req.path}`);
    next();
};

module.exports = {
    validateSchema,
    schemas,
    validationMiddleware,
    sanitizeInput
};