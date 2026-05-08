const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// 100 req per 15 min in production, looser in dev so testing is not blocked
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 2000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// stricter for login/signup to slow down brute force attempts
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 500 : 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
});

const heavyOperationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 200 : 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests for this operation, please try again later.' },
});

module.exports = { apiLimiter, authLimiter, heavyOperationLimiter };
