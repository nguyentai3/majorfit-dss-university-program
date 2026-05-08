const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { env } = require('./config/env');
const { attachAuthSession } = require('./middlewares/attachAuthSession');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { healthRouter } = require('./routes/health');
const { homepageRouter } = require('./routes/homepage');
const { authRouter } = require('./routes/auth');
const { profileRouter } = require('./routes/profile');
const { savedProgramsRouter } = require('./routes/savedPrograms');
const { adminRouter } = require('./routes/admin');
const { onetRouter } = require('./routes/onet');
const { riasecRouter } = require('./modules/riasec/routes');
const { programsRouter } = require('./modules/programs/routes');
const { matchingRouter } = require('./modules/matching/routes');
const { apiLimiter, heavyOperationLimiter } = require('./middlewares/rateLimiter');

function isAllowedLocalDevOrigin(origin) {
    try {
        const parsed = new URL(origin);
        const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
        return isLocalHost && ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

function createApp() {
    const app = express();
    app.disable('x-powered-by');
    app.use(cookieParser());
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cors({
        credentials: true,
        origin(origin, callback) {
            if (!origin) {
                callback(null, true);
                return;
            }
            if (env.frontendOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            if (env.nodeEnv !== 'production' && isAllowedLocalDevOrigin(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error(`CORS blocked origin: ${origin}`));
        },
    }));
    app.use(attachAuthSession);
    app.use('/api', apiLimiter);
    app.use('/api', healthRouter);
    app.use('/api', homepageRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api/riasec', riasecRouter);
    app.use('/api/matching', heavyOperationLimiter, matchingRouter);
    app.use('/api/programs', programsRouter);
    app.use('/api/profile', profileRouter);
    app.use('/api/saved-programs', savedProgramsRouter);
    app.use('/api/onet', onetRouter);
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
