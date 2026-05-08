const util = require('node:util');

function notFoundHandler(_req, res) {
    res.status(404).json({ error: 'Not found' });
}
function errorHandler(err, _req, res, _next) {
    try {
        const printable =
            err instanceof Error
                ? err.stack || `${err.name}: ${err.message}`
                : util.inspect(err, { depth: 4, breakLength: 120 });
        console.error('Backend error:', printable);
    } catch (loggingError) {
        console.error('Backend error: [unprintable]', loggingError?.message || loggingError);
    }
    if (res.headersSent)
        return;
    if (err && typeof err === 'object' && 'issues' in err) {
        res.status(400).json({ error: 'Invalid input data', details: err.issues });
        return;
    }
    if (err?.code === 'P2002') {
        const fields = err.meta?.target || [];
        res.status(409).json({ error: `Duplicate value: ${Array.isArray(fields) ? fields.join(', ') : fields} already exists` });
        return;
    }
    if (err?.code === 'P2025') {
        res.status(404).json({ error: err.meta?.cause || 'Record not found' });
        return;
    }
    res.status(500).json({ error: 'Internal server error' });
}

module.exports = { notFoundHandler, errorHandler };
