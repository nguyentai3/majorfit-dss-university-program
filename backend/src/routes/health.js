const express = require('express');
const { prisma } = require('../db/prisma');
const healthRouter = express.Router();

healthRouter.get('/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ ok: true, service: 'majorfit-backend', db: 'mysql', timestamp: new Date().toISOString() });
    }
    catch (error) {
        console.error('Health check DB error:', error);
        res.status(500).json({ ok: false, error: 'Database unavailable' });
    }
});

module.exports = { healthRouter };
