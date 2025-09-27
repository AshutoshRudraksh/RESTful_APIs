const fs = require('fs');
const path = require('path');

/**
 * Logging Middleware
 * Demonstrates custom logging middleware for request/response tracking
 */

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const accessLogPath = path.join(logsDir, 'access.log');
const errorLogPath = path.join(logsDir, 'error.log');

/**
 * Format log entry
 */
const formatLogEntry = (req, res, responseTime, error = null) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown',
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentLength: res.get('Content-Length') || 0,
        referer: req.get('Referer') || 'N/A',
        user: req.user ? req.user.username : 'anonymous',
        requestId: req.requestId || 'N/A'
    };

    if (error) {
        logEntry.error = {
            message: error.message,
            stack: error.stack,
            code: error.code || 'UNKNOWN'
        };
    }

    return JSON.stringify(logEntry) + '\n';
};

/**
 * Write to log file
 */
const writeToLog = (logPath, data) => {
    fs.appendFile(logPath, data, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
};

/**
 * Main logging middleware
 */
const loggingMiddleware = (req, res, next) => {
    // Generate unique request ID
    req.requestId = require('uuid').v4();
    
    // Record start time
    const startTime = Date.now();
    
    // Log request details
    console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip} - Request ID: ${req.requestId}`);
    
    // Store original json and end methods
    const originalJson = res.json;
    const originalEnd = res.end;
    
    // Override res.json to log response data
    res.json = function(body) {
        const responseTime = Date.now() - startTime;
        
        // Log response
        console.log(`📤 [${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Time: ${responseTime}ms - Request ID: ${req.requestId}`);
        
        // Write to access log
        const logEntry = formatLogEntry(req, res, responseTime);
        writeToLog(accessLogPath, logEntry);
        
        // Call original json method
        return originalJson.call(this, body);
    };
    
    // Override res.end for non-JSON responses
    res.end = function(chunk, encoding) {
        const responseTime = Date.now() - startTime;
        
        // Only log if not already logged by res.json
        if (!res.headersSent || res.statusCode >= 400) {
            console.log(`📤 [${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Time: ${responseTime}ms - Request ID: ${req.requestId}`);
            
            // Write to access log
            const logEntry = formatLogEntry(req, res, responseTime);
            writeToLog(accessLogPath, logEntry);
        }
        
        return originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

/**
 * Error logging middleware
 */
const errorLoggingMiddleware = (error, req, res, next) => {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    // Log error to console
    console.error(`❌ [${new Date().toISOString()}] Error in ${req.method} ${req.originalUrl}:`, error.message);
    console.error(`Stack: ${error.stack}`);
    
    // Write to error log
    const errorEntry = formatLogEntry(req, res, responseTime, error);
    writeToLog(errorLogPath, errorEntry);
    
    next(error);
};

/**
 * Request timing middleware
 */
const timingMiddleware = (req, res, next) => {
    req.startTime = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        res.set('X-Response-Time', `${duration}ms`);
        
        // Log slow requests
        if (duration > 1000) {
            console.warn(`🐌 Slow request detected: ${req.method} ${req.originalUrl} took ${duration}ms`);
        }
    });
    
    next();
};

/**
 * Get log statistics
 */
const getLogStats = () => {
    const stats = {
        accessLog: {
            exists: fs.existsSync(accessLogPath),
            size: 0,
            lastModified: null
        },
        errorLog: {
            exists: fs.existsSync(errorLogPath),
            size: 0,
            lastModified: null
        }
    };
    
    try {
        if (stats.accessLog.exists) {
            const accessStats = fs.statSync(accessLogPath);
            stats.accessLog.size = accessStats.size;
            stats.accessLog.lastModified = accessStats.mtime.toISOString();
        }
        
        if (stats.errorLog.exists) {
            const errorStats = fs.statSync(errorLogPath);
            stats.errorLog.size = errorStats.size;
            stats.errorLog.lastModified = errorStats.mtime.toISOString();
        }
    } catch (error) {
        console.error('Error getting log stats:', error);
    }
    
    return stats;
};

module.exports = {
    loggingMiddleware,
    errorLoggingMiddleware,
    timingMiddleware,
    getLogStats
};