# RESTful APIs - Comprehensive Learning Project

Building RESTful / REST(Representational State Transfer) API's from scratch with Node.js Express, demonstrating large-scale architecture patterns, middleware concepts, and API gateway functionality.

## 🚀 What You'll Learn

This project provides hands-on experience with:

### **REST API Fundamentals**
- ✅ RESTful design principles and best practices
- ✅ HTTP methods (GET, POST, PUT, PATCH, DELETE) usage
- ✅ Status codes and error handling
- ✅ Request/response patterns
- ✅ Resource-based URL design

### **Middleware Architecture**
- ✅ **Authentication Middleware** - JWT-based security
- ✅ **Rate Limiting Middleware** - Request throttling and abuse prevention
- ✅ **Logging Middleware** - Request/response tracking and monitoring
- ✅ **Validation Middleware** - Input sanitization and schema validation
- ✅ **Error Handling Middleware** - Centralized error management
- ✅ **Security Middleware** - CORS, Helmet, and security headers

### **API Gateway Concepts**
- ✅ **Request Routing** - Dynamic service discovery and routing
- ✅ **Load Balancing** - Service distribution and failover
- ✅ **Health Monitoring** - Service health checks and circuit breakers
- ✅ **Service Proxy** - Request forwarding and response transformation
- ✅ **Centralized Configuration** - Gateway-level security and rate limiting

### **Microservices Architecture**
- ✅ **Service Separation** - User, Product, and Order services
- ✅ **Inter-service Communication** - HTTP-based service calls
- ✅ **Service Discovery** - Dynamic service registration and discovery
- ✅ **Fault Tolerance** - Circuit breakers and graceful degradation

## 📁 Project Structure

```
RESTful_APIs/
├── src/
│   ├── server.js                 # Main REST API server
│   ├── middleware/               # Middleware implementations
│   │   ├── auth.js              # JWT authentication
│   │   ├── rateLimit.js         # Rate limiting
│   │   ├── logging.js           # Request/response logging
│   │   ├── validation.js        # Input validation
│   │   └── errorHandler.js      # Error handling
│   ├── routes/                  # API route handlers
│   │   ├── users.js             # User management
│   │   ├── products.js          # Product catalog
│   │   └── orders.js            # Order processing
│   ├── api-gateway/             # API Gateway implementation
│   │   └── gateway.js           # Gateway server
│   └── microservices/           # Sample microservices
│       ├── user-service.js      # User microservice
│       ├── product-service.js   # Product microservice
│       └── order-service.js     # Order microservice
├── docs/                        # Documentation
├── tests/                       # Test files
├── logs/                        # Application logs
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/AshutoshRudraksh/RESTful_APIs.git
   cd RESTful_APIs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the services**

   **Option 1: Start all services at once**
   ```bash
   npm run dev:full
   ```

   **Option 2: Start services individually**
   ```bash
   # Terminal 1: Start microservices
   npm run services

   # Terminal 2: Start API Gateway
   npm run gateway

   # Terminal 3: Start main REST API
   npm run dev
   ```

## 🌐 Service Endpoints

### Main REST API Server (Port 3000)
- **Base URL**: `http://localhost:3000`
- **Health Check**: `GET /health`
- **API Documentation**: `GET /`

#### User API
- `GET /api/users` - Get all users (with pagination)
- `POST /api/users` - Create a new user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (full update)
- `PATCH /api/users/:id` - Update user (partial update)
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/login` - User authentication
- `POST /api/users/register` - User registration

#### Product API
- `GET /api/products` - Get all products (with filters)
- `POST /api/products` - Create a new product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/meta/categories` - Get product categories
- `GET /api/products/search/:term` - Search products

#### Order API (Protected - Requires Authentication)
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create a new order
- `GET /api/orders/:id` - Get order by ID
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/orders/:id/tracking` - Get order tracking

### API Gateway (Port 3001)
- **Base URL**: `http://localhost:3001`
- **Health Check**: `GET /health`
- **Service Status**: `GET /services`
- **Gateway Info**: `GET /`

Routes all `/api/*` requests to appropriate microservices with:
- Load balancing and failover
- Health monitoring and circuit breaking
- Request/response transformation
- Centralized rate limiting

### Microservices
- **User Service**: `http://localhost:3002`
- **Product Service**: `http://localhost:3003`
- **Order Service**: `http://localhost:3004`

Each service provides:
- Health check endpoint: `GET /health`
- Service info: `GET /`
- RESTful API endpoints: `GET /api/{resource}`

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Register a new user**:
   ```bash
   POST /api/users/register
   {
     "username": "john_doe",
     "email": "john@example.com",
     "password": "SecurePassword123"
   }
   ```

2. **Login to get token**:
   ```bash
   POST /api/users/login
   {
     "username": "john_doe",
     "password": "SecurePassword123"
   }
   ```

3. **Use token in requests**:
   ```bash
   Authorization: Bearer <your-jwt-token>
   ```

## 🧪 Testing the APIs

### Using cURL

**Get all users:**
```bash
curl http://localhost:3000/api/users
```

**Create a user:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123","firstName":"Test","lastName":"User"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_user","password":"password123"}'
```

**Create an order (with authentication):**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"items":[{"productId":"1","quantity":2,"price":999.99}],"shippingAddress":{"street":"123 Main St","city":"NYC","state":"NY","zipCode":"10001","country":"USA"}}'
```

### Testing API Gateway

**Through Gateway (port 3001):**
```bash
curl http://localhost:3001/api/users
curl http://localhost:3001/api/products
curl http://localhost:3001/health
```

### Using Postman

Import the following collection to test all endpoints:
- Set base URL as `http://localhost:3000` for direct API
- Set base URL as `http://localhost:3001` for gateway API
- Use environment variables for tokens

## 📊 Middleware Demonstrations

### 1. Authentication Middleware
- JWT token validation
- User context injection
- Protected route handling

### 2. Rate Limiting Middleware
- IP-based request throttling
- Different limits for different endpoints
- Graceful error responses

### 3. Logging Middleware
- Request/response logging
- Performance monitoring
- Error tracking
- File-based log storage

### 4. Validation Middleware
- Input schema validation using Joi
- Request sanitization
- Error formatting

### 5. Error Handling Middleware
- Centralized error processing
- Custom error classes
- Environment-specific error responses
- Error logging integration

## 🌟 API Gateway Features

### Service Discovery
The gateway automatically discovers and routes to available services:
- Health monitoring of registered services
- Automatic failover on service unavailability
- Circuit breaker pattern implementation

### Load Balancing
- Round-robin service selection
- Health-based routing decisions
- Request distribution optimization

### Request Transformation
- Header injection for service identification
- Request/response logging
- Error standardization

### Security
- Gateway-level rate limiting
- CORS handling
- Security headers injection

## 📈 Monitoring & Health Checks

### Health Check Endpoints
- **Main API**: `GET /health`
- **Gateway**: `GET /health` (includes service status)
- **Each Service**: `GET /health`

### Service Monitoring
- Automatic health checks every 30 seconds
- Service status tracking
- Response time monitoring
- Circuit breaker state management

### Logging
- Request/response logging to files
- Error logging with stack traces
- Performance monitoring
- Gateway routing logs

## 🚀 Scaling Considerations

This project demonstrates several patterns for large-scale APIs:

1. **Microservices Architecture**: Service separation and independence
2. **API Gateway Pattern**: Centralized routing and cross-cutting concerns
3. **Circuit Breaker Pattern**: Fault tolerance and graceful degradation
4. **Rate Limiting**: Resource protection and abuse prevention
5. **Health Monitoring**: Proactive service management
6. **Structured Logging**: Observability and debugging
7. **Middleware Pipeline**: Reusable request processing logic

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: SQL injection and XSS prevention
- **Rate Limiting**: DDoS protection and resource management
- **CORS Configuration**: Cross-origin request control
- **Security Headers**: Helmet.js integration
- **Error Handling**: Information disclosure prevention

## 📚 Learning Resources

- [REST API Design Best Practices](https://restfulapi.net/)
- [Express.js Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)
- [JWT Authentication](https://jwt.io/introduction/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Ashutosh Rudraksh**
- GitHub: [@AshutoshRudraksh](https://github.com/AshutoshRudraksh)

---

*This project serves as a comprehensive learning resource for REST API development, middleware implementation, and API gateway concepts using Node.js and Express.*
