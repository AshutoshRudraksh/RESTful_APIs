const axios = require('axios');
const APIGateway = require('../src/api-gateway/gateway');

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios;

describe('API Gateway', () => {
    let gateway;

    beforeEach(() => {
        jest.clearAllMocks();
        gateway = new APIGateway();
    });

    describe('Service Registration', () => {
        test('should register services correctly', () => {
            expect(gateway.services.size).toBe(3);
            expect(gateway.services.has('user-service')).toBe(true);
            expect(gateway.services.has('product-service')).toBe(true);
            expect(gateway.services.has('order-service')).toBe(true);
        });

        test('should have correct service configurations', () => {
            const userService = gateway.services.get('user-service');
            expect(userService.name).toBe('User Service');
            expect(userService.url).toBe('http://localhost:3002');
            expect(userService.routes).toContain('/api/users');
        });
    });

    describe('Health Monitoring', () => {
        test('should mark service as healthy on successful health check', async () => {
            mockedAxios.get.mockResolvedValue({
                status: 200,
                data: { status: 'healthy' }
            });

            await gateway.checkServiceHealth('user-service');

            const service = gateway.services.get('user-service');
            expect(service.status).toBe('healthy');
            expect(service.lastHealthCheck).toBeDefined();
            expect(service.responseTime).toMatch(/\d+ms/);
        });

        test('should mark service as unhealthy on failed health check', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

            await gateway.checkServiceHealth('user-service');

            const service = gateway.services.get('user-service');
            expect(service.status).toBe('unhealthy');
            expect(service.responseTime).toBe('timeout');
        });

        test('should mark service as unhealthy on error response', async () => {
            mockedAxios.get.mockResolvedValue({
                status: 500,
                data: { error: 'Internal server error' }
            });

            await gateway.checkServiceHealth('user-service');

            const service = gateway.services.get('user-service');
            expect(service.status).toBe('unhealthy');
        });
    });

    describe('Service Discovery', () => {
        test('should create proxy for registered services', () => {
            expect(() => {
                gateway.createServiceProxy('user-service');
            }).not.toThrow();
        });

        test('should throw error for unregistered service', () => {
            expect(() => {
                gateway.createServiceProxy('non-existent-service');
            }).toThrow('Service non-existent-service not found');
        });
    });
});