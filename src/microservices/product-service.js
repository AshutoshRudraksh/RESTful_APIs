const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

/**
 * Product Microservice
 * Demonstrates a microservice focused on product management
 */

class ProductService {
    constructor() {
        this.app = express();
        this.port = process.env.PRODUCT_SERVICE_PORT || 3003;
        this.serviceName = 'Product Service';
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
            
            console.log(`📦 [${this.serviceName}] ${req.method} ${req.path} - Gateway: ${req.headers['x-forwarded-by'] || 'direct'}`);
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
                    inventory: 'synced',
                    cache: 'active',
                    memory: process.memoryUsage()
                }
            });
        });

        // Service info endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: this.serviceName,
                version: this.version,
                description: 'Handles product catalog and inventory management',
                endpoints: [
                    'GET /health - Health check',
                    'GET /api/products - Get all products',
                    'POST /api/products - Create product',
                    'GET /api/products/:id - Get product by ID',
                    'PUT /api/products/:id - Update product',
                    'DELETE /api/products/:id - Delete product',
                    'GET /api/products/categories - Get categories',
                    'GET /api/products/search/:term - Search products'
                ],
                gateway: {
                    requestId: req.headers['x-gateway-request-id'],
                    timestamp: req.headers['x-gateway-timestamp'],
                    version: req.headers['x-gateway-version']
                },
                timestamp: new Date().toISOString()
            });
        });

        // Mock product data
        const products = [
            {
                id: 1,
                name: 'Wireless Headphones',
                price: 199.99,
                category: 'electronics',
                stock: 50,
                description: 'High-quality wireless headphones with noise cancellation',
                service: this.serviceName
            },
            {
                id: 2,
                name: 'Smart Watch',
                price: 299.99,
                category: 'electronics',
                stock: 25,
                description: 'Advanced smartwatch with health monitoring',
                service: this.serviceName
            },
            {
                id: 3,
                name: 'Running Shoes',
                price: 129.99,
                category: 'sports',
                stock: 75,
                description: 'Lightweight running shoes for athletes',
                service: this.serviceName
            },
            {
                id: 4,
                name: 'Coffee Maker',
                price: 89.99,
                category: 'home',
                stock: 30,
                description: 'Programmable coffee maker with thermal carafe',
                service: this.serviceName
            }
        ];

        // Products API routes
        this.app.get('/api/products', (req, res) => {
            const { category, minPrice, maxPrice, limit = 10 } = req.query;
            let filteredProducts = [...products];

            // Apply filters
            if (category) {
                filteredProducts = filteredProducts.filter(p => 
                    p.category.toLowerCase() === category.toLowerCase()
                );
            }

            if (minPrice) {
                filteredProducts = filteredProducts.filter(p => 
                    p.price >= parseFloat(minPrice)
                );
            }

            if (maxPrice) {
                filteredProducts = filteredProducts.filter(p => 
                    p.price <= parseFloat(maxPrice)
                );
            }

            // Apply limit
            filteredProducts = filteredProducts.slice(0, parseInt(limit));

            res.json({
                success: true,
                data: filteredProducts,
                total: filteredProducts.length,
                service: req.service,
                gateway: {
                    requestId: req.headers['x-gateway-request-id'],
                    forwardedBy: req.headers['x-forwarded-by']
                },
                timestamp: new Date().toISOString()
            });
        });

        this.app.get('/api/products/:id', (req, res) => {
            const product = products.find(p => p.id === parseInt(req.params.id));
            if (!product) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found',
                    service: req.service,
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                data: {
                    ...product,
                    relatedProducts: products
                        .filter(p => p.category === product.category && p.id !== product.id)
                        .slice(0, 3)
                },
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        this.app.post('/api/products', (req, res) => {
            const newProduct = {
                id: products.length + 1,
                name: req.body.name,
                price: parseFloat(req.body.price),
                category: req.body.category,
                stock: parseInt(req.body.stock),
                description: req.body.description,
                service: this.serviceName
            };
            
            products.push(newProduct);

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: newProduct,
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        // Get product categories
        this.app.get('/api/products/meta/categories', (req, res) => {
            const categories = [...new Set(products.map(p => p.category))];
            const categoryStats = categories.map(category => {
                const categoryProducts = products.filter(p => p.category === category);
                return {
                    name: category,
                    count: categoryProducts.length,
                    averagePrice: categoryProducts.reduce((sum, p) => sum + p.price, 0) / categoryProducts.length,
                    totalStock: categoryProducts.reduce((sum, p) => sum + p.stock, 0)
                };
            });

            res.json({
                success: true,
                data: categoryStats,
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        // Search products
        this.app.get('/api/products/search/:term', (req, res) => {
            const searchTerm = req.params.term.toLowerCase();
            const searchResults = products.filter(p =>
                p.name.toLowerCase().includes(searchTerm) ||
                p.description.toLowerCase().includes(searchTerm) ||
                p.category.toLowerCase().includes(searchTerm)
            );

            res.json({
                success: true,
                data: searchResults,
                searchTerm: req.params.term,
                totalResults: searchResults.length,
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        // Inventory update endpoint
        this.app.patch('/api/products/:id/inventory', (req, res) => {
            const productIndex = products.findIndex(p => p.id === parseInt(req.params.id));
            if (productIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found',
                    service: req.service
                });
            }

            const { stock, operation = 'set' } = req.body;

            switch (operation) {
                case 'set':
                    products[productIndex].stock = parseInt(stock);
                    break;
                case 'add':
                    products[productIndex].stock += parseInt(stock);
                    break;
                case 'subtract':
                    products[productIndex].stock = Math.max(0, products[productIndex].stock - parseInt(stock));
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid operation. Use: set, add, or subtract',
                        service: req.service
                    });
            }

            res.json({
                success: true,
                message: 'Inventory updated successfully',
                data: products[productIndex],
                operation: operation,
                service: req.service,
                timestamp: new Date().toISOString()
            });
        });

        // Error simulation endpoint
        this.app.get('/api/products/simulate-error', (req, res) => {
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
                case 'out-of-stock':
                    res.status(409).json({
                        success: false,
                        error: 'Product out of stock',
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
            console.log(`📦 ${this.serviceName} running on port ${this.port}`);
            console.log(`   Health: http://localhost:${this.port}/health`);
            console.log(`   Products API: http://localhost:${this.port}/api/products`);
        });
    }
}

// Start the service
if (require.main === module) {
    const service = new ProductService();
    service.start();
}

module.exports = ProductService;