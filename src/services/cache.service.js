const { getRedisClient } = require('../config/redis');

/**
 * Cache Service
 * Centralized wrapper for Redis caching.
 * Designed to fail silently if Redis is unavailable (fallback to DB).
 */

class CacheService {
    constructor() {
        this.client = getRedisClient();
    }

    /**
     * Get a value from the cache
     * @param {string} key 
     * @returns {any} parsed JSON or null
     */
    async get(key) {
        if (!this.client || this.client.status !== 'ready') return null;
        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn(`Cache GET error for key ${key}:`, error.message);
            return null;
        }
    }

    /**
     * Set a value in the cache with a TTL
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttlSeconds Default 1 hour to save memory on free plan
     */
    async set(key, value, ttlSeconds = 3600) {
        if (!this.client || this.client.status !== 'ready') return;
        try {
            const stringValue = JSON.stringify(value);
            // Optimization for free plan: Prevent caching giant objects (> 100KB)
            if (stringValue.length > 100000) {
                console.warn(`Skipping cache for ${key}: Payload too large (${stringValue.length} bytes)`);
                return;
            }
            await this.client.set(key, stringValue, 'EX', ttlSeconds);
        } catch (error) {
            console.warn(`Cache SET error for key ${key}:`, error.message);
        }
    }

    /**
     * Delete a specific key from the cache
     * @param {string} key 
     */
    async delete(key) {
        if (!this.client || this.client.status !== 'ready') return;
        try {
            await this.client.del(key);
        } catch (error) {
            console.warn(`Cache DEL error for key ${key}:`, error.message);
        }
    }

    /**
     * Delete all keys matching a pattern
     * Careful: KEYS is blocking, but okay for small datasets
     * @param {string} pattern 
     */
    async deletePattern(pattern) {
        if (!this.client || this.client.status !== 'ready') return;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
        } catch (error) {
            console.warn(`Cache DELETE PATTERN error for ${pattern}:`, error.message);
        }
    }
}

module.exports = new CacheService();
