function toMysqlDateTime(date = new Date()) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}
function normalizeDbRow(row) {
    if (!row)
        return null;
    const out = {};
    for (const [key, value] of Object.entries(row)) {
        out[key] = value instanceof Date ? value.toISOString() : value;
    }
    return out;
}
function jsonOrNull(value) {
    if (value === undefined)
        return undefined;
    if (value === null)
        return null;
    if (typeof value === 'string')
        return value;
    try {
        return JSON.stringify(value);
    }
    catch {
        return null;
    }
}
function safeJsonParse(value, fallback) {
    if (value == null)
        return fallback;
    if (typeof value !== 'string')
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}

module.exports = { toMysqlDateTime, normalizeDbRow, jsonOrNull, safeJsonParse };
