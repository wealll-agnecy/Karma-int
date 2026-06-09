const cache = new Map();

/**
 * Middleware to cache API responses in memory.
 * Best used for high-read, low-write public endpoints like event listings.
 * 
 * @param {number} durationInSeconds - How long the response should be cached
 */
const cacheMiddleware = (durationInSeconds) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Use the original URL as the cache key
        const key = `__express__${req.originalUrl || req.url}`;
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            const now = Date.now();
            // Check if cache has expired
            if (now < cachedResponse.expiry) {
                console.log(`⚡ [CACHE HIT]: ${key}`);
                return res.json(cachedResponse.data);
            } else {
                // Remove expired cache
                cache.delete(key);
            }
        }

        console.log(`⏳ [CACHE MISS]: ${key}`);

        // Overwrite res.json to intercept the response and cache it
        const originalJson = res.json;
        res.json = function (body) {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(key, {
                    data: body,
                    expiry: Date.now() + durationInSeconds * 1000,
                });
            }
            return originalJson.call(this, body);
        };

        next();
    };
};

/**
 * Utility to manually invalidate cache by prefix (e.g., when an event is updated)
 */
const invalidateCache = (prefix) => {
    const keyPrefix = `__express__${prefix}`;
    for (const key of cache.keys()) {
        if (key.startsWith(keyPrefix)) {
            cache.delete(key);
            console.log(`🧹 [CACHE INVALIDATED]: ${key}`);
        }
    }
};

module.exports = { cacheMiddleware, invalidateCache };
