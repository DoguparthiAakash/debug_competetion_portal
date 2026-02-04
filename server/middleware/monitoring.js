/**
 * monitoring.js
 * ─────────────
 * Middleware for monitoring requests, tracking performance, and logging.
 */

const activeConnections = new Set();
const requestMetrics = {
    total: 0,
    byEndpoint: {},
    slowRequests: []
};

// Track active connections
function trackConnection(req, res, next) {
    const connectionId = `${req.ip}-${Date.now()}-${Math.random()}`;
    activeConnections.add(connectionId);

    res.on('finish', () => {
        activeConnections.delete(connectionId);
    });

    next();
}

// Log all requests with timing
function requestLogger(req, res, next) {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function (data) {
        const duration = Date.now() - startTime;

        // Track metrics
        requestMetrics.total++;
        const endpoint = `${req.method} ${req.path}`;
        requestMetrics.byEndpoint[endpoint] = (requestMetrics.byEndpoint[endpoint] || 0) + 1;

        // Log slow requests (> 2 seconds)
        if (duration > 2000) {
            const slowRequest = {
                endpoint,
                duration,
                timestamp: new Date().toISOString(),
                ip: req.ip
            };
            requestMetrics.slowRequests.push(slowRequest);

            // Keep only last 50 slow requests
            if (requestMetrics.slowRequests.length > 50) {
                requestMetrics.slowRequests.shift();
            }

            console.warn(`⚠️  Slow request: ${endpoint} took ${duration}ms`);
        }

        // Log request
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.ip}`);

        originalSend.call(this, data);
    };

    next();
}

// Get monitoring stats
function getStats() {
    return {
        activeConnections: activeConnections.size,
        totalRequests: requestMetrics.total,
        requestsByEndpoint: requestMetrics.byEndpoint,
        recentSlowRequests: requestMetrics.slowRequests.slice(-10),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    };
}

module.exports = {
    trackConnection,
    requestLogger,
    getStats
};
