const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Import middleware
const { validationMiddleware } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimit');
const { generateToken } = require('../middleware/auth');
const { asyncErrorHandler, ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

// In-memory user storage (in production, use a database)
let users = [
    {
        id: uuidv4(),
        username: 'demo_user',
        email: 'demo@example.com',
        password: '$2a$10$8K1p/a9ihb.dKp5Z5.X5..S8XvvCz/sP8kVPm/D2qG7Q6M8.L2u7e', // 'password123'
        firstName: 'Demo',
        lastName: 'User',
        age: 25,
        phone: '+1234567890',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

/**
 * GET /api/users
 * Get all users (with pagination and filtering)
 */
router.get('/', 
    validationMiddleware.validatePagination,
    asyncErrorHandler(async (req, res) => {
        const { page = 1, limit = 10, sortBy = 'username', sort = 'asc' } = req.query;
        
        // Calculate pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        
        // Filter and sort users
        let filteredUsers = [...users];
        
        // Remove password from response
        filteredUsers = filteredUsers.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
        
        // Sort users
        filteredUsers.sort((a, b) => {
            const aValue = a[sortBy] || '';
            const bValue = b[sortBy] || '';
            
            if (sort === 'desc') {
                return bValue.localeCompare(aValue);
            }
            return aValue.localeCompare(bValue);
        });
        
        // Apply pagination
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
        
        // Prepare response
        const response = {
            success: true,
            data: paginatedUsers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(filteredUsers.length / limit),
                totalItems: filteredUsers.length,
                itemsPerPage: parseInt(limit),
                hasNextPage: endIndex < filteredUsers.length,
                hasPrevPage: page > 1
            },
            timestamp: new Date().toISOString()
        };
        
        console.log(`📋 Retrieved ${paginatedUsers.length} users (page ${page})`);
        res.json(response);
    })
);

/**
 * GET /api/users/:id
 * Get a specific user by ID
 */
router.get('/:id', 
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        
        const user = users.find(u => u.id === id);
        if (!user) {
            throw new NotFoundError('User');
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        
        console.log(`👤 Retrieved user: ${user.username}`);
        res.json({
            success: true,
            data: userWithoutPassword,
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * POST /api/users
 * Create a new user
 */
router.post('/', 
    validationMiddleware.validateUserCreate,
    asyncErrorHandler(async (req, res) => {
        const { username, email, password, firstName, lastName, age, phone } = req.body;
        
        // Check if user already exists
        const existingUser = users.find(u => 
            u.username === username || u.email === email
        );
        
        if (existingUser) {
            if (existingUser.username === username) {
                throw new ConflictError('Username already exists');
            }
            if (existingUser.email === email) {
                throw new ConflictError('Email already exists');
            }
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = {
            id: uuidv4(),
            username,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            age,
            phone,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        users.push(newUser);
        
        // Remove password from response
        const { password: _, ...userResponse } = newUser;
        
        console.log(`✨ Created new user: ${username}`);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: userResponse,
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * PUT /api/users/:id
 * Update a user (full update)
 */
router.put('/:id', 
    validationMiddleware.validateUserUpdate,
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex === -1) {
            throw new NotFoundError('User');
        }
        
        // Check for conflicts with other users
        const existingUser = users.find((u, index) => 
            index !== userIndex && 
            (u.username === updates.username || u.email === updates.email)
        );
        
        if (existingUser) {
            if (existingUser.username === updates.username) {
                throw new ConflictError('Username already exists');
            }
            if (existingUser.email === updates.email) {
                throw new ConflictError('Email already exists');
            }
        }
        
        // Update user
        users[userIndex] = {
            ...users[userIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // Remove password from response
        const { password, ...userResponse } = users[userIndex];
        
        console.log(`📝 Updated user: ${users[userIndex].username}`);
        res.json({
            success: true,
            message: 'User updated successfully',
            data: userResponse,
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * PATCH /api/users/:id
 * Partial update of a user
 */
router.patch('/:id', 
    validationMiddleware.validateUserUpdate,
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex === -1) {
            throw new NotFoundError('User');
        }
        
        // Check for conflicts with other users
        const existingUser = users.find((u, index) => 
            index !== userIndex && 
            (u.username === updates.username || u.email === updates.email)
        );
        
        if (existingUser) {
            if (existingUser.username === updates.username) {
                throw new ConflictError('Username already exists');
            }
            if (existingUser.email === updates.email) {
                throw new ConflictError('Email already exists');
            }
        }
        
        // Partial update
        users[userIndex] = {
            ...users[userIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // Remove password from response
        const { password, ...userResponse } = users[userIndex];
        
        console.log(`🔧 Partially updated user: ${users[userIndex].username}`);
        res.json({
            success: true,
            message: 'User updated successfully',
            data: userResponse,
            changes: Object.keys(updates),
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * DELETE /api/users/:id
 * Delete a user
 */
router.delete('/:id', 
    asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex === -1) {
            throw new NotFoundError('User');
        }
        
        const deletedUser = users.splice(userIndex, 1)[0];
        
        console.log(`🗑️  Deleted user: ${deletedUser.username}`);
        res.json({
            success: true,
            message: 'User deleted successfully',
            data: {
                id: deletedUser.id,
                username: deletedUser.username,
                deletedAt: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * POST /api/users/login
 * User login endpoint
 */
router.post('/login', 
    authLimiter,
    validationMiddleware.validateLogin,
    asyncErrorHandler(async (req, res) => {
        const { username, password } = req.body;
        
        // Find user
        const user = users.find(u => u.username === username);
        if (!user) {
            throw new ValidationError('Invalid username or password');
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new ValidationError('Invalid username or password');
        }
        
        // Generate token
        const token = generateToken({
            id: user.id,
            username: user.username,
            email: user.email
        });
        
        // Remove password from response
        const { password: _, ...userResponse } = user;
        
        console.log(`🔐 User logged in: ${username}`);
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userResponse,
                token,
                expiresIn: '24h'
            },
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * POST /api/users/register
 * User registration endpoint
 */
router.post('/register', 
    authLimiter,
    validationMiddleware.validateRegister,
    asyncErrorHandler(async (req, res) => {
        const { username, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = users.find(u => 
            u.username === username || u.email === email
        );
        
        if (existingUser) {
            if (existingUser.username === username) {
                throw new ConflictError('Username already exists');
            }
            if (existingUser.email === email) {
                throw new ConflictError('Email already exists');
            }
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = {
            id: uuidv4(),
            username,
            email,
            password: hashedPassword,
            firstName: '',
            lastName: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        users.push(newUser);
        
        // Generate token
        const token = generateToken({
            id: newUser.id,
            username: newUser.username,
            email: newUser.email
        });
        
        // Remove password from response
        const { password: _, ...userResponse } = newUser;
        
        console.log(`📝 User registered: ${username}`);
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: userResponse,
                token,
                expiresIn: '24h'
            },
            timestamp: new Date().toISOString()
        });
    })
);

// Export users array for testing/demo purposes
module.exports = { router, users };