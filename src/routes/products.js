const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Import middleware
const { validationMiddleware } = require('../middleware/validation');
const { optionalAuthMiddleware } = require('../middleware/auth');
const { asyncErrorHandler, NotFoundError, ConflictError } = require('../middleware/errorHandler');

// In-memory product storage (in production, use a database)
let products = [
    {
        id: uuidv4(),
        name: 'iPhone 13 Pro',
        description: 'Latest Apple smartphone with advanced camera system',
        price: 999.99,
        category: 'electronics',
        stock: 25,
        sku: 'IPHONE13PRO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'MacBook Air M2',
        description: 'Lightweight laptop with Apple M2 chip',
        price: 1199.99,
        category: 'electronics',
        stock: 15,
        sku: 'MACBOOKAIRM2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: uuidv4(),
        name: 'Nike Air Max 270',
        description: 'Comfortable running shoes with air cushioning',
        price: 150.00,
        category: 'sports',
        stock: 50,
        sku: 'NIKEAIRMAX270',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

/**
 * GET /api/products
 * Get all products with pagination, filtering, and sorting
 */
router.get('/', 
    validationMiddleware.validatePagination,
    optionalAuthMiddleware, // Optional auth for personalized responses
    asyncErrorHandler(async (req, res) => {
        const { 
            page = 1, 
            limit = 10, 
            sortBy = 'name', 
            sort = 'asc',
            category,
            minPrice,
            maxPrice,
            search
        } = req.query;
        
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
        
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                p.description.toLowerCase().includes(searchTerm) ||
                p.sku.toLowerCase().includes(searchTerm)
            );
        }
        
        // Sort products
        filteredProducts.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            
            // Handle different data types
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (sort === 'desc') {
                return aValue < bValue ? 1 : (aValue > bValue ? -1 : 0);
            }
            return aValue > bValue ? 1 : (aValue < bValue ? -1 : 0);
        });
        
        // Calculate pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
        
        // Prepare response
        const response = {
            success: true,
            data: paginatedProducts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(filteredProducts.length / limit),
                totalItems: filteredProducts.length,
                itemsPerPage: parseInt(limit),
                hasNextPage: endIndex < filteredProducts.length,
                hasPrevPage: page > 1
            },
            filters: {
                category,
                minPrice: minPrice ? parseFloat(minPrice) : null,
                maxPrice: maxPrice ? parseFloat(maxPrice) : null,
                search
            },
            availableCategories: [...new Set(products.map(p => p.category))],
            authenticated: !!req.user,
            timestamp: new Date().toISOString()
        };
        
        console.log(`📦 Retrieved ${paginatedProducts.length} products (page ${page})`);
        res.json(response);
    })
);

/**
 * GET /api/products/:id
 * Get a specific product by ID
 */
router.get('/:id', 
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        
        const product = products.find(p => p.id === id);
        if (!product) {
            throw new NotFoundError('Product');
        }
        
        console.log(`📱 Retrieved product: ${product.name}`);
        res.json({
            success: true,
            data: product,
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * POST /api/products
 * Create a new product
 */
router.post('/', 
    validationMiddleware.validateProductCreate,
    asyncErrorHandler(async (req, res) => {
        const { name, description, price, category, stock, sku } = req.body;
        
        // Check if SKU already exists
        const existingProduct = products.find(p => 
            p.sku.toLowerCase() === sku.toLowerCase()
        );
        
        if (existingProduct) {
            throw new ConflictError('SKU already exists');
        }
        
        // Create new product
        const newProduct = {
            id: uuidv4(),
            name,
            description,
            price: parseFloat(price),
            category: category.toLowerCase(),
            stock: parseInt(stock),
            sku: sku.toUpperCase(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        products.push(newProduct);
        
        console.log(`✨ Created new product: ${name} (${sku})`);
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: newProduct,
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * PUT /api/products/:id
 * Update a product (full update)
 */
router.put('/:id', 
    validationMiddleware.validateProductUpdate,
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        
        const productIndex = products.findIndex(p => p.id === id);
        if (productIndex === -1) {
            throw new NotFoundError('Product');
        }
        
        // Check for SKU conflicts with other products
        if (updates.sku) {
            const existingProduct = products.find((p, index) => 
                index !== productIndex && 
                p.sku.toLowerCase() === updates.sku.toLowerCase()
            );
            
            if (existingProduct) {
                throw new ConflictError('SKU already exists');
            }
        }
        
        // Update product
        products[productIndex] = {
            ...products[productIndex],
            ...updates,
            price: updates.price ? parseFloat(updates.price) : products[productIndex].price,
            stock: updates.stock ? parseInt(updates.stock) : products[productIndex].stock,
            category: updates.category ? updates.category.toLowerCase() : products[productIndex].category,
            sku: updates.sku ? updates.sku.toUpperCase() : products[productIndex].sku,
            updatedAt: new Date().toISOString()
        };
        
        console.log(`📝 Updated product: ${products[productIndex].name}`);
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: products[productIndex],
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * PATCH /api/products/:id
 * Partial update of a product
 */
router.patch('/:id', 
    validationMiddleware.validateProductUpdate,
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        
        const productIndex = products.findIndex(p => p.id === id);
        if (productIndex === -1) {
            throw new NotFoundError('Product');
        }
        
        // Check for SKU conflicts with other products
        if (updates.sku) {
            const existingProduct = products.find((p, index) => 
                index !== productIndex && 
                p.sku.toLowerCase() === updates.sku.toLowerCase()
            );
            
            if (existingProduct) {
                throw new ConflictError('SKU already exists');
            }
        }
        
        // Process updates with proper type conversion
        const processedUpdates = { ...updates };
        if (processedUpdates.price) processedUpdates.price = parseFloat(processedUpdates.price);
        if (processedUpdates.stock) processedUpdates.stock = parseInt(processedUpdates.stock);
        if (processedUpdates.category) processedUpdates.category = processedUpdates.category.toLowerCase();
        if (processedUpdates.sku) processedUpdates.sku = processedUpdates.sku.toUpperCase();
        
        // Partial update
        products[productIndex] = {
            ...products[productIndex],
            ...processedUpdates,
            updatedAt: new Date().toISOString()
        };
        
        console.log(`🔧 Partially updated product: ${products[productIndex].name}`);
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: products[productIndex],
            changes: Object.keys(updates),
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * DELETE /api/products/:id
 * Delete a product
 */
router.delete('/:id', 
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        
        const productIndex = products.findIndex(p => p.id === id);
        if (productIndex === -1) {
            throw new NotFoundError('Product');
        }
        
        const deletedProduct = products.splice(productIndex, 1)[0];
        
        console.log(`🗑️  Deleted product: ${deletedProduct.name}`);
        res.json({
            success: true,
            message: 'Product deleted successfully',
            data: {
                id: deletedProduct.id,
                name: deletedProduct.name,
                sku: deletedProduct.sku,
                deletedAt: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * GET /api/products/categories
 * Get all available product categories
 */
router.get('/meta/categories', 
    asyncErrorHandler(async (req, res) => {
        const categories = [...new Set(products.map(p => p.category))];
        const categoryStats = categories.map(category => ({
            name: category,
            count: products.filter(p => p.category === category).length,
            averagePrice: products
                .filter(p => p.category === category)
                .reduce((sum, p) => sum + p.price, 0) / 
                products.filter(p => p.category === category).length
        }));
        
        res.json({
            success: true,
            data: {
                categories: categoryStats,
                totalCategories: categories.length,
                totalProducts: products.length
            },
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * GET /api/products/search/:term
 * Search products by name, description, or SKU
 */
router.get('/search/:term', 
    validationMiddleware.validatePagination,
    asyncErrorHandler(async (req, res) => {
        const { term } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const searchTerm = term.toLowerCase();
        const searchResults = products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm) ||
            p.sku.toLowerCase().includes(searchTerm) ||
            p.category.toLowerCase().includes(searchTerm)
        );
        
        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedResults = searchResults.slice(startIndex, endIndex);
        
        console.log(`🔍 Search for '${term}' returned ${searchResults.length} results`);
        res.json({
            success: true,
            data: paginatedResults,
            searchTerm: term,
            totalResults: searchResults.length,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(searchResults.length / limit),
                totalItems: searchResults.length,
                itemsPerPage: parseInt(limit)
            },
            timestamp: new Date().toISOString()
        });
    })
);

// Export products array for testing/demo purposes
module.exports = { router, products };