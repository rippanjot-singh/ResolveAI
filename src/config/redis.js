const Redis = require('ioredis');
const config = require('./config');

let redisClient = null;

const connectRedis = () => {
    try {
        if (!config.REDIS_HOST) {
            console.warn("Redis host not provided, caching will be disabled.");
            return null;
        }

        redisClient = new Redis({
            host: config.REDIS_HOST,
            port: config.REDIS_PORT,
            password: config.REDIS_PASSWORD,
            // Optimization for free plans: fail fast and don't buffer too much
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        redisClient.on('connect', () => {
            console.log("Redis connected successfully");
        });

        redisClient.on('error', (err) => {
            console.error("Redis connection error:", err.message);
        });

        return redisClient;
    } catch (error) {
        console.error("Failed to initialize Redis:", error.message);
        return null;
    }
};

const getRedisClient = () => {
    if (!redisClient) {
        return connectRedis();
    }
    return redisClient;
};

module.exports = { connectRedis, getRedisClient };
