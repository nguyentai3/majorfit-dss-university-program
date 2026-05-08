const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '../../..');
const BACKEND_ROOT = path.resolve(__dirname, '../..');

for (const file of [
    path.join(BACKEND_ROOT, '.env'),
    path.join(BACKEND_ROOT, '.env.local'),
    path.join(ROOT, '.env.local'),
    path.join(ROOT, '.env'),
]) {
    if (fs.existsSync(file)) {
        dotenv.config({ path: file, override: false });
    }
}

function ensureDatabaseUrlFromParts() {
    if (process.env.DATABASE_URL) return;

    const host = process.env.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || '8889';
    const user = process.env.DB_USER || 'root';
    const pass = process.env.DB_PASS ?? process.env.DB_PASSWORD ?? 'root';
    const db = process.env.DB_NAME || 'majorfit';

    process.env.DATABASE_URL =
        `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(db)}`;
}

ensureDatabaseUrlFromParts();

const frontendOrigins = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const adminEmails = (process.env.ADMIN_EMAILS || 'admin@majorfit.local')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const adminUsername = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();
const adminDefaultPassword = String(process.env.ADMIN_PASSWORD || '').trim();
const defaultUserEmail = String(process.env.DEFAULT_USER_EMAIL || '').trim().toLowerCase();
const defaultUserPassword = String(process.env.DEFAULT_USER_PASSWORD || '').trim();

if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback-secret') {
        console.error('[SECURITY] JWT_SECRET must be set in production. Exiting.');
        process.exit(1);
    }
}
function normalizeAiProvider(value) {
    return String(value || 'manual-ai').trim().toLowerCase();
}

function getDefaultAiBaseUrl(provider) {
    return provider === 'groq' || provider === 'grog'
        ? 'https://api.groq.com/openai/v1'
        : 'https://api.openai.com/v1';
}

function getDefaultAiModel(provider) {
    return provider === 'groq' || provider === 'grog' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
}

const aiProvider = process.env.AI_PROVIDER || 'manual-ai';
const aiProviderNormalized = normalizeAiProvider(aiProvider);
const aiDefaultBaseUrl = getDefaultAiBaseUrl(aiProviderNormalized);
const aiDefaultModel = getDefaultAiModel(aiProviderNormalized);
const aiFallbackProvider = String(process.env.AI_FALLBACK_PROVIDER || '').trim();
const aiFallbackProviderNormalized = normalizeAiProvider(aiFallbackProvider);
const aiFallbackBaseUrl = String(process.env.AI_FALLBACK_BASE_URL || '').trim();
const aiFallbackModel = String(process.env.AI_FALLBACK_MODEL || '').trim();
const aiFallbackApiKey = String(process.env.AI_FALLBACK_API_KEY || '').trim();

function buildFallbackChain() {
    const chain = [];
    if (aiFallbackProvider && aiFallbackApiKey) {
        chain.push({
            provider: aiFallbackProvider,
            baseUrl: aiFallbackBaseUrl || getDefaultAiBaseUrl(aiFallbackProviderNormalized),
            apiKey: aiFallbackApiKey,
            model: aiFallbackModel || getDefaultAiModel(aiFallbackProviderNormalized),
        });
    }
    for (let i = 2; i <= 10; i++) {
        const prov = String(process.env[`AI_FALLBACK${i}_PROVIDER`] || '').trim();
        const key = String(process.env[`AI_FALLBACK${i}_API_KEY`] || '').trim();
        if (!prov || !key) continue;
        const provNorm = normalizeAiProvider(prov);
        chain.push({
            provider: prov,
            baseUrl: String(process.env[`AI_FALLBACK${i}_BASE_URL`] || '').trim() || getDefaultAiBaseUrl(provNorm),
            apiKey: key,
            model: String(process.env[`AI_FALLBACK${i}_MODEL`] || '').trim() || getDefaultAiModel(provNorm),
        });
    }
    return chain;
}

const aiFallbackChain = buildFallbackChain();

const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 8000),
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
    databaseUrl: process.env.DATABASE_URL,
    frontendOrigins,
    adminEmails,
    adminUsername,
    adminDefaultPassword,
    defaultUserEmail,
    defaultUserPassword,
    aiProvider,
    aiBaseUrl: process.env.AI_BASE_URL || aiDefaultBaseUrl,
    aiApiKey: process.env.AI_API_KEY || '',
    aiModel: process.env.AI_MODEL || aiDefaultModel,
    aiTemperature: Number(process.env.AI_TEMPERATURE || 0.2),
    aiDirectEnabled: ['1', 'true', 'yes', 'on'].includes(String(process.env.AI_DIRECT_ENABLED || '').toLowerCase()),
    aiFallbackProvider,
    aiFallbackBaseUrl: aiFallbackBaseUrl || (aiFallbackProvider ? getDefaultAiBaseUrl(aiFallbackProviderNormalized) : ''),
    aiFallbackApiKey,
    aiFallbackModel: aiFallbackModel || (aiFallbackProvider ? getDefaultAiModel(aiFallbackProviderNormalized) : ''),
    aiFallbackEnabled:
        ['1', 'true', 'yes', 'on'].includes(String(process.env.AI_FALLBACK_ENABLED || 'true').toLowerCase()) &&
        Boolean(aiFallbackProvider && aiFallbackApiKey),
    aiFallbackChain,
};

module.exports = { env };
