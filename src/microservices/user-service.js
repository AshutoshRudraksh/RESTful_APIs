const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

/**
 * User Microservice
 * Demonstrates a microservice that can be routed through the API Gateway
 */

class UserService {
    constructor() {
        this.app = express();
        this.port = process.env.USER_SERVICE_PORT || 3002;
        this.serviceName = 'User Service';
        this.version = '1.0.0';
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(express.json());
        
        // Service middleware
        this.app.use((req, res, next) => {
            req.service = {
                name: this.serviceName,
                version: this.version,
                port: this.port,
                timestamp: new Date().toISOString()
            };
            
            console.log(`👤 [${this.serviceName}] ${req.method} ${req.path} - Gateway: ${req.headers['x-forwarded-by'] || 'direct'}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: this.serviceName,
                version: this.version,
                port: this.port,
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'connected', // Mock
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage()
                }
            });
        });

        // Service info endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: this.serviceName,
                version: this.version,
                description: 'Handles user management operations',
                endpoints: [
                    'GET /health - Health check',
                    'GET /api/users - Get all users',
                    'POST /api/users - Create user',
                    'GET /api/users/:id - Get user by ID',
                    'PUT /api/users/:id - Update user',
                    'DELETE /api/users/:id - Delete user'
                ],
                gateway: {
                    requestId: req.headers['x-gateway-request-id'],
                    timestamp: req.headers['x-gateway-timestamp'],
                    version: req.headers['x-gateway-version']
                },
                timestamp: new Date().toISOString()
            });
        });

        // Mock user data
        const users = [
            { id: 1, name: 'John Doe', email: 'john@example.com', service: this.serviceName },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', service: this.serviceName },
            { id: 3, name: 'Mike Johnson', email: 'mike@example.com', service: this.serviceName }
        ];

        // Users API routes
        this.app.get('/api/users', (req, res) => {
            res.json({
                success: true,
                data: users,
                service: req.service,
                gateway: {
                    requestId: req.headers['x-gateway-request-id'],
                    forwardedBy: req.headers['x-forwarded-by']
                },
                timestamp: new Date().toISOString()
            });
        });

        this.app.get('/api/users/:id', (req, res) => {
            const user = users.find(u => u.id === parseInt(req.params.id));
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    service: req.service,
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                data: user,
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        this.app.post('/api/users', (req, res) => {
            const newUser = {
                id: users.length + 1,
                name: req.body.name,
                email: req.body.email,
                service: this.serviceName
            };
            
            users.push(newUser);

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: newUser,
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        // Simulate service-specific operations
        this.app.get('/api/users/:id/profile', (req, res) => {
            const user = users.find(u => u.id === parseInt(req.params.id));
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    service: req.service
                });
            }

            res.json({
                success: true,
                data: {
                    ...user,
                    profileDetails: {
                        joinDate: '2023-01-01',
                        lastLogin: new Date().toISOString(),
                        preferences: { theme: 'dark', notifications: true }
                    }
                },
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        // Error simulation endpoint for testing
        this.app.get('/api/users/simulate-error', (req, res) => {
            const errorType = req.query.type || 'server';
            
            switch (errorType) {
                case 'timeout':
                    // Simulate timeout
                    setTimeout(() => {
                        res.status(200).json({ message: 'This should timeout' });
                    }, 35000);
                    break;
                case 'server':
                    res.status(500).json({
                        success: false,
                        error: 'Simulated server error',
                        service: req.service,
                        timestamp: new Date().toISOString()
                    });
                    break;
                case 'not-found':
                    res.status(404).json({
                        success: false,
                        error: 'Simulated not found error',
                        service: req.service,
                        timestamp: new Date().toISOString()
                    });
                    break;
                default:
                    res.status(400).json({
                        success: false,
                        error: 'Invalid error type',
                        service: req.service,
                        timestamp: new Date().toISOString()
                    });
            }
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`👤 ${this.serviceName} running on port ${this.port}`);
            console.log(`   Health: http://localhost:${this.port}/health`);
            console.log(`   Users API: http://localhost:${this.port}/api/users`);
        });
    }
}

// Start the service
if (require.main === module) {
    const service = new UserService();
    service.start();
}

module.exports = UserService;