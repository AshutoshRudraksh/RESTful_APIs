# API Documentation

## Overview

This project demonstrates a comprehensive RESTful API built with Node.js and Express, showcasing middleware patterns, API gateway functionality, and microservices architecture.

## Table of Contents

1. [Authentication](#authentication)
2. [User API](#user-api)
3. [Product API](#product-api)
4. [Order API](#order-api)
5. [API Gateway](#api-gateway)
6. [Error Responses](#error-responses)
7. [Rate Limiting](#rate-limiting)

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Protected endpoints require a valid JWT token in the Authorization header.

### Getting a Token

**Register a new user:**
```http
POST /api/users/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Login:**
```http
POST /api/users/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

### Using the Token

Include the token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## User API

### Get All Users
```http
GET /api/users?page=1&limit=10&sortBy=username&sort=asc
```

**Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sortBy` (optional): Field to sort by (default: username)
- `sort` (optional): Sort direction - asc/desc (default: asc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "demo_user",
      "email": "demo@example.com",
      "firstName": "Demo",
      "lastName": "User",
      "age": 25,
      "phone": "+1234567890",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### Get User by ID
```http
GET /api/users/{id}
```

### Create User
```http
POST /api/users
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "age": 30,
  "phone": "+1234567890"
}
```

**Validation Rules:**
- `username`: 3-30 alphanumeric characters (required)
- `email`: Valid email address (required)
- `password`: Min 6 chars, must contain uppercase, lowercase, and number (required)
- `firstName`: 1-50 characters (required)
- `lastName`: 1-50 characters (required)
- `age`: 18-120 (optional)
- `phone`: Valid phone number format (optional)

### Update User
```http
PUT /api/users/{id}
Content-Type: application/json

{
  "firstName": "John Updated",
  "lastName": "Doe Updated"
}
```

### Partial Update User
```http
PATCH /api/users/{id}
Content-Type: application/json

{
  "firstName": "John Partial"
}
```

### Delete User
```http
DELETE /api/users/{id}
```

## Product API

### Get All Products
```http
GET /api/products?page=1&limit=10&category=electronics&minPrice=100&maxPrice=500&search=phone
```

**Parameters:**
- `page`, `limit`: Pagination
- `category`: Filter by category
- `minPrice`, `maxPrice`: Price range filter
- `search`: Search in name, description, or SKU
- `sortBy`, `sort`: Sorting options

### Get Product by ID
```http
GET /api/products/{id}
```

### Create Product
```http
POST /api/products
Content-Type: application/json

{
  "name": "iPhone 14 Pro",
  "description": "Latest iPhone with advanced features",
  "price": 999.99,
  "category": "electronics",
  "stock": 50,
  "sku": "IPHONE14PRO"
}
```

**Categories:** electronics, clothing, books, home, sports, other

### Search Products
```http
GET /api/products/search/{searchTerm}
```

### Get Categories
```http
GET /api/products/meta/categories
```

## Order API

**Note:** All order endpoints require authentication.

### Get User Orders
```http
GET /api/orders?status=pending&page=1&limit=10
Authorization: Bearer {token}
```

### Get Order by ID
```http
GET /api/orders/{id}
Authorization: Bearer {token}
```

### Create Order
```http
POST /api/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "price": 999.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "notes": "Handle with care"
}
```

### Update Order Status
```http
PATCH /api/orders/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "shipped"
}
```

**Valid Statuses:** pending, processing, shipped, delivered, cancelled

### Get Order Tracking
```http
GET /api/orders/{id}/tracking
Authorization: Bearer {token}
```

### Cancel Order
```http
DELETE /api/orders/{id}
Authorization: Bearer {token}
```

**Note:** Only pending orders can be cancelled.

## API Gateway

The API Gateway is available at `http://localhost:3001` and provides:

- Service discovery and routing
- Health monitoring
- Load balancing
- Circuit breaker pattern
- Centralized rate limiting

### Gateway Endpoints

**Gateway Health:**
```http
GET /health
```

**Service Status:**
```http
GET /services
```

**API Routing:**
All `/api/*` requests are automatically routed to the appropriate microservice:
- `/api/users/*` → User Service (port 3002)
- `/api/products/*` → Product Service (port 3003)  
- `/api/orders/*` → Order Service (port 3004)

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "timestamp": "2023-01-01T00:00:00.000Z",
    "path": "/api/endpoint",
    "method": "POST"
  },
  "suggestions": [
    "Helpful suggestion 1",
    "Helpful suggestion 2"
  ]
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Input validation failed
- `AUTHENTICATION_ERROR` (401): Authentication required or failed
- `AUTHORIZATION_ERROR` (403): Access denied
- `NOT_FOUND` (404): Resource not found
- `CONFLICT_ERROR` (409): Resource already exists
- `RATE_LIMIT_ERROR` (429): Rate limit exceeded
- `INTERNAL_ERROR` (500): Server error

## Rate Limiting

The API implements multiple rate limiting strategies:

### General API Limits
- 100 requests per 15 minutes per IP
- Headers included: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

### Authentication Endpoints
- 5 requests per 15 minutes per IP
- Applied to login/register endpoints

### API-Specific Limits  
- 200 requests per 10 minutes for `/api/*` endpoints

### Gateway Limits
- 1000 requests per 15 minutes per IP through the gateway

When rate limits are exceeded, a `429 Too Many Requests` response is returned with retry information.

## Status Codes

- `200 OK`: Successful GET, PUT, PATCH
- `201 Created`: Successful POST  
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Response Headers

Common response headers:

- `Content-Type: application/json`
- `X-Response-Time`: Request processing time
- `X-Rate-Limit-*`: Rate limiting information
- `X-Gateway-*`: Gateway routing information (when using gateway)