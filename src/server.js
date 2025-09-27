const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import middleware
const authMiddleware = require('./middleware/auth');
const rateLimitMiddleware = require('./middleware/rateLimit');
const loggingMiddleware = require('./middleware/logging');
const errorHandlerMiddleware = require('./middleware/errorHandler');
const validationMiddleware = require('./middleware/validation');

// Import routes
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

class RESTfulServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        
        // CORS middleware
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));

        // Logging middleware
        this.app.use(morgan('combined'));
        this.app.use(loggingMiddleware);

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Rate limiting middleware
        this.app.use(rateLimitMiddleware);

        // Custom middleware demonstration
        this.app.use((req, res, next) => {
            req.timestamp = new Date().toISOString();
            console.log(`[${req.timestamp}] ${req.method} ${req.path} - Custom Middleware Demo`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                timestamp: req.timestamp,
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development'
            });
        });

        // API documentation endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: 'Welcome to RESTful APIs Learning Project',
                version: '1.0.0',
                endpoints: {
                    health: '/health',
                    users: '/api/users',
                    products: '/api/products',
                    orders: '/api/orders'
                },
                middleware: {
                    authentication: 'JWT-based authentication',
                    rateLimit: 'Request rate limiting',
                    logging: 'Request/response logging',
                    validation: 'Input validation',
                    errorHandling: 'Centralized error handling'
                },
                features: {
                    apiGateway: 'Available on port 3001',
                    microservices: 'User, Product, and Order services',
                    middleware: 'Custom middleware implementations',
                    restfulDesign: 'RESTful API design patterns'
                }
            });
        });

        // API routes with middleware
        this.app.use('/api/users', userRoutes);
        this.app.use('/api/products', productRoutes);
        this.app.use('/api/orders', authMiddleware, orderRoutes); // Protected routes

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Route not found',
                message: `Cannot ${req.method} ${req.originalUrl}`,
                availableEndpoints: [
                    'GET /',
                    'GET /health',
                    'GET /api/users',
                    'POST /api/users',
                    'GET /api/products',
                    'POST /api/products',
                    'GET /api/orders',
                    'POST /api/orders'
                ]
            });
        });
    }

    setupErrorHandling() {
        this.app.use(errorHandlerMiddleware);
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 RESTful API Server running on port ${this.port}`);
            console.log(`📖 API Documentation: http://localhost:${this.port}`);
            console.log(`❤️  Health Check: http://localhost:${this.port}/health`);
            console.log('🔧 Available Endpoints:');
            console.log('   GET  / - API Documentation');
            console.log('   GET  /health - Health Check');
            console.log('   GET  /api/users - Get all users');
            console.log('   POST /api/users - Create user');
            console.log('   GET  /api/products - Get all products');
            console.log('   POST /api/products - Create product');
            console.log('   GET  /api/orders - Get orders (protected)');
            console.log('   POST /api/orders - Create order (protected)');
        });
    }
}

// Start the server
if (require.main === module) {
    const server = new RESTfulServer();
    server.start();
}

module.exports = RESTfulServer;