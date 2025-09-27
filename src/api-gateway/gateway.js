const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');

/**
 * API Gateway
 * Demonstrates how API gateways work in microservices architecture
 */

class APIGateway {
    constructor() {
        this.app = express();
        this.port = process.env.GATEWAY_PORT || 3001;
        this.services = new Map();
        this.healthChecks = new Map();
        
        this.setupMiddleware();
        this.registerServices();
        this.setupRoutes();
        this.startHealthMonitoring();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            }
        }));

        // CORS middleware
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Gateway rate limiting
        const gatewayLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // limit each IP to 1000 requests per windowMs through gateway
            message: {
                error: 'Gateway rate limit exceeded',
                message: 'Too many requests through API Gateway. Please try again later.',
                gateway: 'api-gateway-v1'
            },
            standardHeaders: true,
            legacyHeaders: false
        });

        this.app.use(gatewayLimiter);

        // Request logging middleware
        this.app.use((req, res, next) => {
            const start = Date.now();
            console.log(`🌐 [Gateway] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
            
            res.on('finish', () => {
                const duration = Date.now() - start;
                console.log(`🌐 [Gateway] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
            });
            
            next();
        });

        // Service discovery middleware
        this.app.use('/api/*', (req, res, next) => {
            req.requestId = require('uuid').v4();
            req.gateway = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                requestId: req.requestId
            };
            next();
        });
    }

    registerServices() {
        // Register microservices
        this.services.set('user-service', {
            name: 'User Service',
            url: 'http://localhost:3002',
            health: 'http://localhost:3002/health',
            routes: ['/api/users', '/api/auth'],
            status: 'unknown',
            lastHealthCheck: null,
            responseTime: null
        });

        this.services.set('product-service', {
            name: 'Product Service',
            url: 'http://localhost:3003',
            health: 'http://localhost:3003/health',
            routes: ['/api/products'],
            status: 'unknown',
            lastHealthCheck: null,
            responseTime: null
        });

        this.services.set('order-service', {
            name: 'Order Service',
            url: 'http://localhost:3004',
            health: 'http://localhost:3004/health',
            routes: ['/api/orders'],
            status: 'unknown',
            lastHealthCheck: null,
            responseTime: null
        });

        console.log(`🔧 Registered ${this.services.size} services with API Gateway`);
    }

    setupRoutes() {
        // Gateway health endpoint
        this.app.get('/health', (req, res) => {
            const services = {};
            for (const [key, service] of this.services.entries()) {
                services[key] = {
                    name: service.name,
                    status: service.status,
                    lastHealthCheck: service.lastHealthCheck,
                    responseTime: service.responseTime
                };
            }

            const overallHealth = Array.from(this.services.values()).every(s => s.status === 'healthy');

            res.status(overallHealth ? 200 : 503).json({
                status: overallHealth ? 'healthy' : 'degraded',
                gateway: {
                    version: '1.0.0',
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString()
                },
                services,
                totalServices: this.services.size,
                healthyServices: Array.from(this.services.values()).filter(s => s.status === 'healthy').length
            });
        });

        // Gateway information endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: 'API Gateway - Microservices Router',
                version: '1.0.0',
                features: [
                    'Service Discovery',
                    'Load Balancing',
                    'Health Monitoring',
                    'Request Routing',
                    'Rate Limiting',
                    'Circuit Breaker',
                    'Request/Response Transformation'
                ],
                services: Array.from(this.services.entries()).map(([key, service]) => ({
                    id: key,
                    name: service.name,
                    routes: service.routes,
                    status: service.status
                })),
                endpoints: {
                    health: '/health',
                    services: '/services',
                    users: '/api/users/*',
                    products: '/api/products/*',
                    orders: '/api/orders/*'
                },
                timestamp: new Date().toISOString()
            });
        });

        // Service status endpoint
        this.app.get('/services', (req, res) => {
            const servicesStatus = {};
            for (const [key, service] of this.services.entries()) {
                servicesStatus[key] = {
                    name: service.name,
                    url: service.url,
                    status: service.status,
                    routes: service.routes,
                    lastHealthCheck: service.lastHealthCheck,
                    responseTime: service.responseTime,
                    healthy: service.status === 'healthy'
                };
            }

            res.json({
                success: true,
                data: servicesStatus,
                summary: {
                    total: this.services.size,
                    healthy: Array.from(this.services.values()).filter(s => s.status === 'healthy').length,
                    unhealthy: Array.from(this.services.values()).filter(s => s.status === 'unhealthy').length,
                    unknown: Array.from(this.services.values()).filter(s => s.status === 'unknown').length
                },
                timestamp: new Date().toISOString()
            });
        });

        // Setup proxy routes for each service
        this.setupServiceProxies();

        // Fallback route
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Route not found',
                message: `Gateway cannot route ${req.method} ${req.originalUrl}`,
                availableServices: Array.from(this.services.keys()),
                suggestions: [
                    'Check if the target service is running',
                    'Verify the route path is correct',
                    'Check service registration in gateway'
                ],
                gateway: {
                    requestId: req.requestId,
                    timestamp: new Date().toISOString()
                }
            });
        });
    }

    setupServiceProxies() {
        // User Service Proxy
        this.app.use('/api/users', this.createServiceProxy('user-service', {
            pathRewrite: {
                '^/api/users': '/api/users'
            }
        }));

        // Product Service Proxy
        this.app.use('/api/products', this.createServiceProxy('product-service', {
            pathRewrite: {
                '^/api/products': '/api/products'
            }
        }));

        // Order Service Proxy
        this.app.use('/api/orders', this.createServiceProxy('order-service', {
            pathRewrite: {
                '^/api/orders': '/api/orders'
            }
        }));

        console.log('🔗 Service proxy routes configured');
    }

    createServiceProxy(serviceKey, options = {}) {
        const service = this.services.get(serviceKey);
        
        if (!service) {
            throw new Error(`Service ${serviceKey} not found`);
        }

        return createProxyMiddleware({
            target: service.url,
            changeOrigin: true,
            timeout: 30000,
            proxyTimeout: 30000,
            ...options,
            
            onError: (err, req, res) => {
                console.error(`❌ [Gateway] Proxy error for ${serviceKey}:`, err.message);
                
                // Circuit breaker logic - mark service as unhealthy
                service.status = 'unhealthy';
                service.lastHealthCheck = new Date().toISOString();
                
                res.status(503).json({
                    error: 'Service unavailable',
                    message: `${service.name} is currently unavailable`,
                    service: serviceKey,
                    gateway: {
                        requestId: req.requestId,
                        timestamp: new Date().toISOString(),
                        retryAfter: 30
                    },
                    suggestions: [
                        'Try again in a few moments',
                        'Check service status at /services',
                        'Contact support if problem persists'
                    ]
                });
            },
            
            onProxyReq: (proxyReq, req, res) => {
                // Add gateway headers
                proxyReq.setHeader('X-Gateway-Request-ID', req.requestId);
                proxyReq.setHeader('X-Gateway-Timestamp', req.gateway.timestamp);
                proxyReq.setHeader('X-Gateway-Version', req.gateway.version);
                proxyReq.setHeader('X-Forwarded-By', 'api-gateway');
                
                console.log(`🔄 [Gateway] Proxying to ${serviceKey}: ${req.method} ${req.originalUrl}`);
            },
            
            onProxyRes: (proxyRes, req, res) => {
                // Add response headers
                proxyRes.headers['X-Gateway-Service'] = serviceKey;
                proxyRes.headers['X-Gateway-Request-ID'] = req.requestId;
                
                // Mark service as healthy on successful response
                if (proxyRes.statusCode < 500) {
                    service.status = 'healthy';
                    service.lastHealthCheck = new Date().toISOString();
                }
            }
        });
    }

    async checkServiceHealth(serviceKey) {
        const service = this.services.get(serviceKey);
        if (!service) return;

        try {
            const start = Date.now();
            const response = await axios.get(service.health, {
                timeout: 5000,
                validateStatus: (status) => status < 500
            });
            
            const responseTime = Date.now() - start;
            
            service.status = response.status === 200 ? 'healthy' : 'unhealthy';
            service.lastHealthCheck = new Date().toISOString();
            service.responseTime = `${responseTime}ms`;
            
            if (service.status === 'healthy') {
                console.log(`✅ [Health] ${service.name} is healthy (${responseTime}ms)`);
            } else {
                console.log(`⚠️  [Health] ${service.name} returned status ${response.status}`);
            }
            
        } catch (error) {
            service.status = 'unhealthy';
            service.lastHealthCheck = new Date().toISOString();
            service.responseTime = 'timeout';
            
            console.log(`❌ [Health] ${service.name} health check failed: ${error.message}`);
        }
    }

    startHealthMonitoring() {
        // Initial health checks
        for (const serviceKey of this.services.keys()) {
            this.checkServiceHealth(serviceKey);
        }

        // Periodic health checks every 30 seconds
        setInterval(() => {
            console.log('🔍 [Health] Running health checks...');
            for (const serviceKey of this.services.keys()) {
                this.checkServiceHealth(serviceKey);
            }
        }, 30000);

        console.log('❤️  Health monitoring started');
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🌐 API Gateway running on port ${this.port}`);
            console.log(`📖 Gateway Info: http://localhost:${this.port}`);
            console.log(`❤️  Health Check: http://localhost:${this.port}/health`);
            console.log(`🔧 Services Status: http://localhost:${this.port}/services`);
            console.log('📡 Registered Routes:');
            console.log('   /api/users/* -> User Service (port 3002)');
            console.log('   /api/products/* -> Product Service (port 3003)');
            console.log('   /api/orders/* -> Order Service (port 3004)');
        });
    }
}

// Start the API Gateway
if (require.main === module) {
    const gateway = new APIGateway();
    gateway.start();
}

module.exports = APIGateway;