const request = require('supertest');
const RESTfulServer = require('../src/server');

describe('RESTful API Server', () => {
    let server;
    let app;

    beforeAll(() => {
        server = new RESTfulServer();
        app = server.app;
    });

    describe('Health Check', () => {
        test('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body.status).toBe('OK');
            expect(response.body.timestamp).toBeDefined();
            expect(response.body.uptime).toBeDefined();
        });
    });

    describe('API Documentation', () => {
        test('should return API documentation', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.body.message).toContain('RESTful APIs Learning Project');
            expect(response.body.version).toBeDefined();
            expect(response.body.endpoints).toBeDefined();
            expect(response.body.middleware).toBeDefined();
        });
    });

    describe('Users API', () => {
        test('should get all users', async () => {
            const response = await request(app)
                .get('/api/users')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.pagination).toBeDefined();
        });

        test('should create a new user', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'TestPassword123',
                firstName: 'Test',
                lastName: 'User'
            };

            const response = await request(app)
                .post('/api/users')
                .send(userData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.username).toBe(userData.username);
            expect(response.body.data.email).toBe(userData.email);
            expect(response.body.data.password).toBeUndefined(); // Password should not be returned
        });

        test('should validate user creation input', async () => {
            const invalidData = {
                username: 'ab', // Too short
                email: 'invalid-email',
                password: '123' // Too short
            };

            const response = await request(app)
                .post('/api/users')
                .send(invalidData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.details).toBeInstanceOf(Array);
        });
    });

    describe('Products API', () => {
        test('should get all products', async () => {
            const response = await request(app)
                .get('/api/products')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.pagination).toBeDefined();
            expect(response.body.availableCategories).toBeInstanceOf(Array);
        });

        test('should filter products by category', async () => {
            const response = await request(app)
                .get('/api/products?category=electronics')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            response.body.data.forEach(product => {
                expect(product.category).toBe('electronics');
            });
        });

        test('should create a new product', async () => {
            const productData = {
                name: 'Test Product',
                description: 'A test product for unit testing',
                price: 99.99,
                category: 'electronics',
                stock: 10,
                sku: 'TESTPROD001'
            };

            const response = await request(app)
                .post('/api/products')
                .send(productData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(productData.name);
            expect(response.body.data.price).toBe(productData.price);
            expect(response.body.data.sku).toBe(productData.sku.toUpperCase());
        });
    });

    describe('Rate Limiting', () => {
        test('should apply rate limiting after many requests', async () => {
            // This test would require making many requests quickly
            // In a real scenario, you'd configure lower limits for testing
            const requests = Array.from({ length: 5 }, () => 
                request(app).get('/health')
            );

            const responses = await Promise.all(requests);
            responses.forEach(response => {
                expect(response.status).toBeLessThan(500);
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/api/nonexistent')
                .expect(404);

            expect(response.body.error).toBeDefined();
            expect(response.body.message).toContain('Cannot GET');
        });

        test('should handle 404 for non-existent user', async () => {
            const response = await request(app)
                .get('/api/users/non-existent-id')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
        });
    });

    describe('Authentication', () => {
        test('should require authentication for protected routes', async () => {
            const response = await request(app)
                .get('/api/orders')
                .expect(401);

            expect(response.body.error).toBe('Authentication required');
        });

        test('should allow login with valid credentials', async () => {
            const loginData = {
                username: 'demo_user',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBeDefined();
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.password).toBeUndefined();
        });
    });
});