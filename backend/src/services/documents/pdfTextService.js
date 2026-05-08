async function extractPdfText(buffer) {
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(buffer);
    const text = String(result?.text || '').normalize('NFC').replace(/\s+/g, ' ').trim();

    return {
        text,
        pages: Number(result?.numpages || 0),
        info: result?.info || {},
        metadata: result?.metadata || {},
    };
}

function validatePdfFile(file) {
    if (!file) {
        return { valid: false, error: 'No file uploaded' };
    }
    if (file.mimetype !== 'application/pdf') {
        return { valid: false, error: 'Only PDF files are supported' };
    }
    if (file.size > 10 * 1024 * 1024) {
        return { valid: false, error: 'File size too large. Maximum size is 10MB.' };
    }
    if (file.size < 256) {
        return { valid: false, error: 'File size too small. Please upload a valid PDF document.' };
    }

    return { valid: true };
}

module.exports = {
    extractPdfText,
    validatePdfFile,
};
