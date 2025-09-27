const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

/**
 * Order Microservice
 * Demonstrates a microservice focused on order management
 */

class OrderService {
    constructor() {
        this.app = express();
        this.port = process.env.ORDER_SERVICE_PORT || 3004;
        this.serviceName = 'Order Service';
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
            
            console.log(`🛒 [${this.serviceName}] ${req.method} ${req.path} - Gateway: ${req.headers['x-forwarded-by'] || 'direct'}`);
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
                    paymentGateway: 'connected',
                    inventoryService: 'connected',
                    shippingService: 'connected',
                    memory: process.memoryUsage()
                }
            });
        });

        // Service info endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: this.serviceName,
                version: this.version,
                description: 'Handles order processing and fulfillment',
                endpoints: [
                    'GET /health - Health check',
                    'GET /api/orders - Get all orders',
                    'POST /api/orders - Create order',
                    'GET /api/orders/:id - Get order by ID',
                    'PATCH /api/orders/:id/status - Update order status',
                    'GET /api/orders/:id/tracking - Get tracking info',
                    'GET /api/orders/stats - Get order statistics'
                ],
                gateway: {
                    requestId: req.headers['x-gateway-request-id'],
                    timestamp: req.headers['x-gateway-timestamp'],
                    version: req.headers['x-gateway-version']
                },
                timestamp: new Date().toISOString()
            });
        });

        // Mock order data
        const orders = [
            {
                id: 'ORD-001',
                userId: 1,
                status: 'shipped',
                items: [
                    { productId: 1, name: 'Wireless Headphones', quantity: 1, price: 199.99 },
                    { productId: 2, name: 'Smart Watch', quantity: 1, price: 299.99 }
                ],
                totalAmount: 499.98,
                shippingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'USA'
                },
                trackingNumber: 'TRK123456789',
                createdAt: '2023-12-01T10:00:00Z',
                service: this.serviceName
            },
            {
                id: 'ORD-002',
                userId: 2,
                status: 'processing',
                items: [
                    { productId: 3, name: 'Running Shoes', quantity: 2, price: 129.99 }
                ],
                totalAmount: 259.98,
                shippingAddress: {
                    street: '456 Oak Ave',
                    city: 'Los Angeles',
                    state: 'CA',
                    zipCode: '90210',
                    country: 'USA'
                },
                createdAt: '2023-12-02T14:30:00Z',
                service: this.serviceName
            },
            {
                id: 'ORD-003',
                userId: 1,
                status: 'delivered',
                items: [
                    { productId: 4, name: 'Coffee Maker', quantity: 1, price: 89.99 }
                ],
                totalAmount: 89.99,
                shippingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'USA'
                },
                trackingNumber: 'TRK987654321',
                deliveredAt: '2023-11-28T16:45:00Z',
                createdAt: '2023-11-25T09:15:00Z',
                service: this.serviceName
            }
        ];

        // Orders API routes
        this.app.get('/api/orders', (req, res) => {
            const { userId, status, limit = 10, offset = 0 } = req.query;
            let filteredOrders = [...orders];

            // Apply filters
            if (userId) {
                filteredOrders = filteredOrders.filter(o => o.userId === parseInt(userId));
            }

            if (status) {
                filteredOrders = filteredOrders.filter(o => 
                    o.status.toLowerCase() === status.toLowerCase()
                );
            }

            // Sort by creation date (newest first)
            filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Apply pagination
            const paginatedOrders = filteredOrders.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

            res.json({
                success: true,
                data: paginatedOrders,
                pagination: {
                    total: filteredOrders.length,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + parseInt(limit) < filteredOrders.length
                },
                service: req.service,
                gateway: {
                    requestId: req.headers['x-gateway-request-id'],
                    forwardedBy: req.headers['x-forwarded-by']
                },
                timestamp: new Date().toISOString()
            });
        });

        this.app.get('/api/orders/:id', (req, res) => {
            const order = orders.find(o => o.id === req.params.id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found',
                    service: req.service,
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                data: {
                    ...order,
                    estimatedDelivery: order.status === 'shipped' ? 
                        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() : null,
                    canCancel: ['pending', 'processing'].includes(order.status)
                },
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        this.app.post('/api/orders', (req, res) => {
            const { userId, items, shippingAddress } = req.body;
            
            if (!userId || !items || !items.length || !shippingAddress) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: userId, items, shippingAddress',
                    service: req.service
                });
            }

            const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            const newOrder = {
                id: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
                userId: parseInt(userId),
                status: 'pending',
                items: items.map(item => ({
                    productId: item.productId,
                    name: item.name || `Product ${item.productId}`,
                    quantity: item.quantity,
                    price: item.price
                })),
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                shippingAddress,
                createdAt: new Date().toISOString(),
                service: this.serviceName
            };
            
            orders.push(newOrder);

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: newOrder,
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        // Update order status
        this.app.patch('/api/orders/:id/status', (req, res) => {
            const { status } = req.body;
            const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
                    service: req.service
                });
            }

            const orderIndex = orders.findIndex(o => o.id === req.params.id);
            if (orderIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found',
                    service: req.service
                });
            }

            const oldStatus = orders[orderIndex].status;
            orders[orderIndex].status = status;
            orders[orderIndex].updatedAt = new Date().toISOString();

            // Add tracking number when shipped
            if (status === 'shipped' && !orders[orderIndex].trackingNumber) {
                orders[orderIndex].trackingNumber = `TRK${Date.now()}`;
            }

            // Add delivery timestamp when delivered
            if (status === 'delivered') {
                orders[orderIndex].deliveredAt = new Date().toISOString();
            }

            res.json({
                success: true,
                message: `Order status updated from ${oldStatus} to ${status}`,
                data: orders[orderIndex],
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        // Get order tracking
        this.app.get('/api/orders/:id/tracking', (req, res) => {
            const order = orders.find(o => o.id === req.params.id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found',
                    service: req.service
                });
            }

            const timeline = [
                { status: 'Order Placed', timestamp: order.createdAt, completed: true },
                { status: 'Processing', timestamp: order.processingAt || null, completed: ['processing', 'shipped', 'delivered'].includes(order.status) },
                { status: 'Shipped', timestamp: order.shippedAt || null, completed: ['shipped', 'delivered'].includes(order.status) },
                { status: 'Delivered', timestamp: order.deliveredAt || null, completed: order.status === 'delivered' }
            ];

            res.json({
                success: true,
                data: {
                    orderId: order.id,
                    status: order.status,
                    trackingNumber: order.trackingNumber || null,
                    timeline: timeline,
                    estimatedDelivery: order.status === 'shipped' ? 
                        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() : null
                },
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        // Order statistics
        this.app.get('/api/orders/stats', (req, res) => {
            const stats = {
                totalOrders: orders.length,
                totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
                averageOrderValue: orders.length > 0 ? 
                    orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length : 0,
                statusBreakdown: {
                    pending: orders.filter(o => o.status === 'pending').length,
                    processing: orders.filter(o => o.status === 'processing').length,
                    shipped: orders.filter(o => o.status === 'shipped').length,
                    delivered: orders.filter(o => o.status === 'delivered').length,
                    cancelled: orders.filter(o => o.status === 'cancelled').length
                },
                topProducts: this.getTopProducts(orders)
            };

            res.json({
                success: true,
                data: stats,
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        // Error simulation endpoint
        this.app.get('/api/orders/simulate-error', (req, res) => {
            const errorType = req.query.type || 'server';
            
            switch (errorType) {
                case 'timeout':
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
                case 'payment':
                    res.status(402).json({
                        success: false,
                        error: 'Payment processing failed',
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

    getTopProducts(orders) {
        const productCount = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!productCount[item.productId]) {
                    productCount[item.productId] = {
                        productId: item.productId,
                        name: item.name,
                        totalQuantity: 0,
                        totalRevenue: 0
                    };
                }
                productCount[item.productId].totalQuantity += item.quantity;
                productCount[item.productId].totalRevenue += item.price * item.quantity;
            });
        });

        return Object.values(productCount)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, 5);
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🛒 ${this.serviceName} running on port ${this.port}`);
            console.log(`   Health: http://localhost:${this.port}/health`);
            console.log(`   Orders API: http://localhost:${this.port}/api/orders`);
        });
    }
}

// Start the service
if (require.main === module) {
    const service = new OrderService();
    service.start();
}

module.exports = OrderService;