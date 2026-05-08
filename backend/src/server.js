const { env } = require('./config/env');
const { createApp } = require('./app');
const { prisma } = require('./db/prisma');

const app = createApp();

async function bootstrap() {
    try {
        await prisma.$queryRawUnsafe('SELECT 1');
        const dbUrl = new URL(env.databaseUrl);
        console.log(`MySQL connected (${dbUrl.hostname}:${dbUrl.port || '3306'})`);
    } catch (error) {
        console.error('MySQL connection check failed:', error);
    }

    const server = app.listen(env.port, () => {
        console.log(`Backend running on http://localhost:${env.port}`);
    });

    server.on('error', (error) => {
        if (error?.code === 'EADDRINUSE') {
            console.error(`Port ${env.port} is already in use. Stop the existing process or run with PORT=${env.port + 1}.`);
            console.error(`Try: lsof -nP -iTCP:${env.port} -sTCP:LISTEN`);
            process.exit(1);
        }
        console.error('Server listen error:', error);
        process.exit(1);
    });

    const shutdown = async () => {
        console.log('Shutting down backend...');
        server.close(async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

void bootstrap();
