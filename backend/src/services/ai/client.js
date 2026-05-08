const { env } = require('../../config/env');
const { runOpenAiCompatibleChat, isDailyQuotaExhausted } = require('./providers/openaiCompatible');

function estimateTokens(text) {
    return Math.ceil((String(text || '').length) / 2.5);
}

function computeDynamicTimeout(tokens) {
    return Math.min(20_000 + tokens, 120_000);
}

function normalizeProvider(value) {
    const provider = String(value || '').trim().toLowerCase();
    if (!provider || provider === 'manual' || provider === 'manual-ai') {
        return 'manual-ai';
    }
    if (provider === 'openai' || provider === 'openai-compatible' || provider === 'openai_compatible') {
        return 'openai-compatible';
    }
    if (provider === 'groq' || provider === 'grog') {
        return 'groq';
    }
    return provider;
}

function getProviderDefaults(provider) {
    return {
        model: provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
        baseUrl: provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1',
    };
}

function normalizeModelForBaseUrl(model, baseUrl) {
    const cleanedModel = String(model || '').trim();
    const normalizedBaseUrl = String(baseUrl || '').trim().toLowerCase();

    if (!cleanedModel) {
        return cleanedModel;
    }

    if (!normalizedBaseUrl.includes('generativelanguage.googleapis.com')) {
        return cleanedModel;
    }

    const googleAliasMap = {
        'gemini-2.0-flash-lite': 'gemini-2.0-flash-lite-001',
    };

    return googleAliasMap[cleanedModel] || cleanedModel;
}

function buildDirectProviderConfig(provider, overrides = {}) {
    const normalizedProvider = normalizeProvider(provider);
    const defaults = getProviderDefaults(normalizedProvider);
    const baseUrl = String(overrides.baseUrl || '').trim() || defaults.baseUrl;
    const requestedModel = String(overrides.model || '').trim() || defaults.model;
    const model = normalizeModelForBaseUrl(requestedModel, baseUrl);
    const apiKey = String(overrides.apiKey || '').trim();

    return {
        provider: normalizedProvider,
        model,
        baseUrl,
        apiKey,
        directRunEnabled: Boolean(apiKey && baseUrl),
    };
}

function shouldFallbackOnError(error) {
    const message = String(error?.message || '').toLowerCase();
    return (
        message.includes('rate limit') ||
        message.includes('rate_limit_exceeded') ||
        message.includes('429') ||
        message.includes('503') ||
        message.includes('404') ||
        message.includes('not_found') ||
        message.includes('not found') ||
        message.includes('unavailable') ||
        message.includes('high demand') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('temporar') ||
        message.includes('overloaded')
    );
}

function getAiRuntimeConfig() {
    const provider = normalizeProvider(env.aiProvider);
    const primary = buildDirectProviderConfig(provider, {
        model: env.aiModel,
        baseUrl: env.aiBaseUrl,
        apiKey: env.aiApiKey,
    });
    const fallbackProvider = normalizeProvider(env.aiFallbackProvider);
    const fallback = env.aiFallbackEnabled
        ? buildDirectProviderConfig(fallbackProvider, {
              model: env.aiFallbackModel,
              baseUrl: env.aiFallbackBaseUrl,
              apiKey: env.aiFallbackApiKey,
          })
        : null;

    const fallbackChain = (env.aiFallbackChain || []).map((fb) =>
        buildDirectProviderConfig(fb.provider, {
            model: fb.model,
            baseUrl: fb.baseUrl,
            apiKey: fb.apiKey,
        }),
    ).filter((fb) => fb.directRunEnabled);

    const directRunEnabled = Boolean(env.aiDirectEnabled && primary.directRunEnabled);

    return {
        provider,
        model: primary.model,
        temperature: env.aiTemperature,
        baseUrl: primary.baseUrl,
        directRunEnabled,
        primary,
        fallback,
        fallbackChain,
        providerOptions: [
            { value: 'openai-compatible', label: 'OpenAI-Compatible', direct: true },
            { value: 'groq', label: 'Groq', direct: true },
        ],
        fallbackEnabled: fallbackChain.length > 0,
        fallbackProvider: fallback?.provider || null,
    };
}

function getProgramAnalysisConfig() {
    const runtime = getAiRuntimeConfig();
    const defaultProvider =
        runtime.directRunEnabled && runtime.provider === 'manual-ai' ? 'openai-compatible' : runtime.provider;
    return {
        directRunEnabled: runtime.directRunEnabled,
        defaultProvider,
        defaultModel: runtime.model,
        providerOptions: runtime.providerOptions,
    };
}

async function runAiAnalysis({ provider, model, systemPrompt, userPrompt, temperature, timeoutMs }) {
    const runtime = getAiRuntimeConfig();
    const normalizedProvider = normalizeProvider(provider || runtime.provider);
    const runtimeTemperature = Number.isFinite(Number(runtime.temperature)) ? Number(runtime.temperature) : 0.2;
    const resolvedTemperature = Number.isFinite(Number(temperature))
        ? Number(temperature)
        : runtimeTemperature;

    if (normalizedProvider === 'manual-ai') {
        throw new Error('Direct AI run is disabled for manual-ai mode. Configure an API provider.');
    }

    if (!runtime.directRunEnabled) {
        throw new Error('Direct AI run is not configured. Set AI_DIRECT_ENABLED, AI_BASE_URL, and AI_API_KEY.');
    }

    const primaryConfig =
        normalizedProvider === runtime.primary.provider
            ? {
                  ...runtime.primary,
                  model: String(model || runtime.primary.model || '').trim() || runtime.primary.model,
              }
            : buildDirectProviderConfig(normalizedProvider, {
                  model: model || runtime.model,
                  apiKey: env.aiApiKey,
                  baseUrl: runtime.baseUrl,
              });

    const estimatedPromptTokens = estimateTokens(systemPrompt) + estimateTokens(userPrompt);
    const resolvedTimeoutMs = timeoutMs || computeDynamicTimeout(estimatedPromptTokens);

    const attempts = [primaryConfig];
    const seenKeys = new Set([`${primaryConfig.baseUrl}::${primaryConfig.apiKey}`]);
    for (const fb of runtime.fallbackChain) {
        if (!fb.directRunEnabled) continue;
        const key = `${fb.baseUrl}::${fb.apiKey}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        attempts.push(fb);
    }

    let lastError = null;

    for (let index = 0; index < attempts.length; index++) {
        const attempt = attempts[index];
        const isLast = index === attempts.length - 1;

        try {
            const result = await runOpenAiCompatibleChat({
                baseUrl: attempt.baseUrl,
                apiKey: attempt.apiKey,
                model: attempt.model,
                systemPrompt,
                userPrompt,
                temperature: resolvedTemperature,
                timeoutMs: resolvedTimeoutMs,
            });
            return {
                ...result,
                usedProvider: attempt.provider,
                usedModel: attempt.model,
                usedFallback: index > 0,
                usage: result.usage || null,
            };
        } catch (error) {
            lastError = error;
            const isDaily = isDailyQuotaExhausted(error);
            const canTryNext = !isLast && (shouldFallbackOnError(error) || isDaily);
            if (canTryNext) {
                const next = attempts[index + 1];
                const reason = isDaily ? 'daily quota exhausted' : `error ${error.message}`;
                console.warn(`AI provider [${index + 1}/${attempts.length}] (${attempt.provider}/${attempt.model}): ${reason}. Switching to [${index + 2}/${attempts.length}] ${next.provider}/${next.model}...`);
            } else {
                if (isDaily) {
                    const err = new Error(`AI_DAILY_QUOTA_EXHAUSTED: All ${attempts.length} providers exhausted. ${error.message}`);
                    err.code = 'AI_DAILY_QUOTA_EXHAUSTED';
                    throw err;
                }
                throw error;
            }
        }
    }

    throw lastError || new Error('AI analysis failed without a specific provider error');
}

module.exports = {
    normalizeProvider,
    getAiRuntimeConfig,
    getProgramAnalysisConfig,
    runAiAnalysis,
    normalizeModelForBaseUrl,
};
