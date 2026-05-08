const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

function isDailyQuotaExhausted(error) {
    const msg = String(error?.message || '').toLowerCase();
    return (
        msg.includes('tokens per day') ||
        msg.includes('per day') ||
        msg.includes('daily') ||
        msg.includes('insufficient_quota') ||
        msg.includes('exceeded your current quota') ||
        msg.includes('quota exceeded') ||
        (msg.includes('try again in') && /try again in \d+[hm]/i.test(String(error?.message || '')))
    );
}

function isRetryableError(error, statusCode) {
    if (isDailyQuotaExhausted(error)) return false;
    if (statusCode === 429 || statusCode === 503 || statusCode === 502) return true;
    const msg = String(error?.message || '').toLowerCase();
    return (
        msg.includes('econnreset') ||
        msg.includes('etimedout') ||
        msg.includes('enotfound') ||
        msg.includes('socket hang up') ||
        msg.includes('abort') ||
        msg.includes('timeout') ||
        msg.includes('unavailable') ||
        msg.includes('overloaded') ||
        msg.includes('rate limit') ||
        msg.includes('high demand')
    );
}

async function runOpenAiCompatibleChat({
    baseUrl,
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    temperature = 0.2,
    timeoutMs = 45000,
}) {
    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(`${String(baseUrl || '').replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    temperature,
                    ...(`${systemPrompt} ${userPrompt}`.toLowerCase().includes('json')
                        ? { response_format: { type: 'json_object' } }
                        : {}),
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const text = await response.text();
                const err = new Error(`AI provider error ${response.status}: ${text.slice(0, 600)}`);
                if (attempt < MAX_RETRIES && isRetryableError(err, response.status)) {
                    lastError = err;
                    const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                    console.warn(`AI request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${response.status}. Retrying in ${delay}ms...`);
                    clearTimeout(timeout);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                throw err;
            }

            const text = await response.text();
            const payload = text ? JSON.parse(text) : {};
            const content = payload?.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('AI provider returned empty content');
            }

            return {
                text: String(content),
                raw: payload,
                usage: payload?.usage || null,
            };
        } catch (error) {
            clearTimeout(timeout);
            if (attempt < MAX_RETRIES && isRetryableError(error, null)) {
                lastError = error;
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                console.warn(`AI request error (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${error.message}. Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    throw lastError || new Error('AI request failed after all retry attempts');
}

module.exports = { runOpenAiCompatibleChat, isDailyQuotaExhausted };
