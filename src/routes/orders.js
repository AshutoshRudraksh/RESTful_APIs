const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Import middleware
const { validationMiddleware } = require('../middleware/validation');
const { asyncErrorHandler, NotFoundError, ValidationError } = require('../middleware/errorHandler');

// Import data from other modules
const { products } = require('./products');

// In-memory order storage (in production, use a database)
let orders = [
    {
        id: uuidv4(),
        userId: 'demo-user-id',
        status: 'pending',
        items: [
            {
                productId: products[0]?.id || 'demo-product-id',
                quantity: 2,
                price: 999.99,
                productName: 'iPhone 13 Pro'
            }
        ],
        totalAmount: 1999.98,
        shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
        },
        notes: 'Please handle with care',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

/**
 * GET /api/orders
 * Get all orders for the authenticated user
 */
router.get('/', 
    validationMiddleware.validatePagination,
    asyncErrorHandler(async (req, res) => {
        const { page = 1, limit = 10, status } = req.query;
        const userId = req.user.userId;
        
        // Filter orders by user and status
        let userOrders = orders.filter(order => order.userId === userId);
        
        if (status) {
            userOrders = userOrders.filter(order => 
                order.status.toLowerCase() === status.toLowerCase()
            );
        }
        
        // Sort by creation date (newest first)
        userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedOrders = userOrders.slice(startIndex, endIndex);
        
        // Calculate total amount for all user orders
        const totalOrderValue = userOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        // Order statistics
        const orderStats = {
            pending: userOrders.filter(o => o.status === 'pending').length,
            processing: userOrders.filter(o => o.status === 'processing').length,
            shipped: userOrders.filter(o => o.status === 'shipped').length,
            delivered: userOrders.filter(o => o.status === 'delivered').length,
            cancelled: userOrders.filter(o => o.status === 'cancelled').length
        };
        
        console.log(`📋 Retrieved ${paginatedOrders.length} orders for user: ${req.user.username}`);
        res.json({
            success: true,
            data: paginatedOrders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(userOrders.length / limit),
                totalItems: userOrders.length,
                itemsPerPage: parseInt(limit),
                hasNextPage: endIndex < userOrders.length,
                hasPrevPage: page > 1
            },
            statistics: {
                totalOrderValue,
                orderStats,
                averageOrderValue: userOrders.length > 0 ? totalOrderValue / userOrders.length : 0
            },
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * GET /api/orders/:id
 * Get a specific order by ID (only if it belongs to the user)
 */
router.get('/:id', 
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;
        
        const order = orders.find(o => o.id === id && o.userId === userId);
        if (!order) {
            throw new NotFoundError('Order');
        }
        
        // Enrich order with current product information
        const enrichedOrder = {
            ...order,
            items: order.items.map(item => {
                const currentProduct = products.find(p => p.id === item.productId);
                return {
                    ...item,
                    currentProduct: currentProduct ? {
                        name: currentProduct.name,
                        currentPrice: currentProduct.price,
                        inStock: currentProduct.stock > 0,
                        category: currentProduct.category
                    } : null
                };
            })
        };
        
        console.log(`📦 Retrieved order: ${id} for user: ${req.user.username}`);
        res.json({
            success: true,
            data: enrichedOrder,
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * POST /api/orders
 * Create a new order
 */
router.post('/', 
    validationMiddleware.validateOrderCreate,
    asyncErrorHandler(async (req, res) => {
        const { items, shippingAddress, notes } = req.body;
        const userId = req.user.userId;
        
        // Validate and process items
        const processedItems = [];
        let totalAmount = 0;
        
        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            
            if (!product) {
                throw new ValidationError(`Product with ID ${item.productId} not found`);
            }
            
            if (product.stock < item.quantity) {
                throw new ValidationError(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
            }
            
            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;
            
            processedItems.push({
                productId: item.productId,
                productName: product.name,
                quantity: item.quantity,
                price: product.price,
                itemTotal
            });
            
            // Update product stock (in a real app, this would be handled in a transaction)
            const productIndex = products.findIndex(p => p.id === item.productId);
            products[productIndex].stock -= item.quantity;
        }
        
        // Create new order
        const newOrder = {
            id: uuidv4(),
            userId,
            status: 'pending',
            items: processedItems,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            shippingAddress,
            notes: notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tracking: {
                orderPlaced: new Date().toISOString(),
                estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
            }
        };
        
        orders.push(newOrder);
        
        console.log(`✨ Created new order: ${newOrder.id} for user: ${req.user.username} (Total: $${totalAmount.toFixed(2)})`);
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: newOrder,
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * PATCH /api/orders/:id/status
 * Update order status
 */
router.patch('/:id/status', 
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.userId;
        
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        
        if (!status || !validStatuses.includes(status)) {
            throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
        }
        
        const orderIndex = orders.findIndex(o => o.id === id && o.userId === userId);
        if (orderIndex === -1) {
            throw new NotFoundError('Order');
        }
        
        const oldStatus = orders[orderIndex].status;
        
        // Business logic for status transitions
        if (oldStatus === 'delivered' && status !== 'delivered') {
            throw new ValidationError('Cannot change status of delivered order');
        }
        
        if (oldStatus === 'cancelled' && status !== 'cancelled') {
            throw new ValidationError('Cannot change status of cancelled order');
        }
        
        // Update order status
        orders[orderIndex].status = status;
        orders[orderIndex].updatedAt = new Date().toISOString();
        
        // Update tracking information
        if (!orders[orderIndex].tracking) {
            orders[orderIndex].tracking = {};
        }
        
        switch (status) {
            case 'processing':
                orders[orderIndex].tracking.processingStarted = new Date().toISOString();
                break;
            case 'shipped':
                orders[orderIndex].tracking.shipped = new Date().toISOString();
                orders[orderIndex].tracking.trackingNumber = `TRK${Date.now()}`;
                break;
            case 'delivered':
                orders[orderIndex].tracking.delivered = new Date().toISOString();
                break;
            case 'cancelled':
                orders[orderIndex].tracking.cancelled = new Date().toISOString();
                // Restore product stock
                for (const item of orders[orderIndex].items) {
                    const productIndex = products.findIndex(p => p.id === item.productId);
                    if (productIndex !== -1) {
                        products[productIndex].stock += item.quantity;
                    }
                }
                break;
        }
        
        console.log(`📋 Updated order ${id} status: ${oldStatus} -> ${status}`);
        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            data: orders[orderIndex],
            statusChange: {
                from: oldStatus,
                to: status,
                changedAt: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * DELETE /api/orders/:id
 * Cancel an order (only if status is 'pending')
 */
router.delete('/:id', 
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;
        
        const orderIndex = orders.findIndex(o => o.id === id && o.userId === userId);
        if (orderIndex === -1) {
            throw new NotFoundError('Order');
        }
        
        const order = orders[orderIndex];
        
        if (order.status !== 'pending') {
            throw new ValidationError(`Cannot cancel order with status: ${order.status}. Only pending orders can be cancelled.`);
        }
        
        // Restore product stock
        for (const item of order.items) {
            const productIndex = products.findIndex(p => p.id === item.productId);
            if (productIndex !== -1) {
                products[productIndex].stock += item.quantity;
            }
        }
        
        // Remove order
        orders.splice(orderIndex, 1);
        
        console.log(`🗑️  Cancelled and deleted order: ${id}`);
        res.json({
            success: true,
            message: 'Order cancelled successfully',
            data: {
                id: order.id,
                totalAmount: order.totalAmount,
                cancelledAt: new Date().toISOString(),
                stockRestored: order.items.map(item => ({
                    productId: item.productId,
                    quantityRestored: item.quantity
                }))
            },
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * GET /api/orders/:id/tracking
 * Get order tracking information
 */
router.get('/:id/tracking', 
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;
        
        const order = orders.find(o => o.id === id && o.userId === userId);
        if (!order) {
            throw new NotFoundError('Order');
        }
        
        const trackingInfo = {
            orderId: order.id,
            status: order.status,
            tracking: order.tracking || {},
            timeline: [],
            estimatedDelivery: order.tracking?.estimatedDelivery
        };
        
        // Build timeline
        if (order.tracking?.orderPlaced) {
            trackingInfo.timeline.push({
                status: 'Order Placed',
                timestamp: order.tracking.orderPlaced,
                description: 'Your order has been placed and is being prepared'
            });
        }
        
        if (order.tracking?.processingStarted) {
            trackingInfo.timeline.push({
                status: 'Processing',
                timestamp: order.tracking.processingStarted,
                description: 'Your order is being processed and prepared for shipment'
            });
        }
        
        if (order.tracking?.shipped) {
            trackingInfo.timeline.push({
                status: 'Shipped',
                timestamp: order.tracking.shipped,
                description: `Your order has been shipped${order.tracking.trackingNumber ? ` (Tracking: ${order.tracking.trackingNumber})` : ''}`
            });
        }
        
        if (order.tracking?.delivered) {
            trackingInfo.timeline.push({
                status: 'Delivered',
                timestamp: order.tracking.delivered,
                description: 'Your order has been delivered'
            });
        }
        
        if (order.tracking?.cancelled) {
            trackingInfo.timeline.push({
                status: 'Cancelled',
                timestamp: order.tracking.cancelled,
                description: 'Your order has been cancelled'
            });
        }
        
        console.log(`📍 Retrieved tracking info for order: ${id}`);
        res.json({
            success: true,
            data: trackingInfo,
            timestamp: new Date().toISOString()
        });
    })
);

// Export orders array for testing/demo purposes
module.exports = { router, orders };