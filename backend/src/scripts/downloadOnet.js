#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');
const { Readable } = require('stream');

const URL = 'https://www.onetcenter.org/dl_files/database/db_29_1_text.zip';
const OUT_DIR = '/tmp/onet_db_full';
const ZIP_PATH = path.join(OUT_DIR, 'onet_db.zip');
const EXTRACT_DIR = path.join(OUT_DIR, 'extracted');

async function download() {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    if (fs.existsSync(ZIP_PATH) && fs.statSync(ZIP_PATH).size > 12_000_000) {
        console.log(`ZIP already exists (${(fs.statSync(ZIP_PATH).size / 1e6).toFixed(1)} MB), skipping download.`);
        return;
    }

    if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);

    console.log(`Downloading ${URL}...`);
    console.log('(13 MB, streaming to disk — safe even on slow connections)\n');

    const response = await fetch(URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const totalBytes = parseInt(response.headers.get('content-length') || '0');
    let downloaded = 0;
    const startTime = Date.now();

    const fileStream = createWriteStream(ZIP_PATH);
    const reader = response.body.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fileStream.write(value);
        downloaded += value.length;

        if (downloaded % 500_000 < value.length) {
            const pct = totalBytes ? ((downloaded / totalBytes) * 100).toFixed(0) : '?';
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            const speed = (downloaded / 1024 / ((Date.now() - startTime) / 1000)).toFixed(0);
            process.stdout.write(`\r  ${(downloaded / 1e6).toFixed(1)}/${(totalBytes / 1e6).toFixed(1)} MB (${pct}%) — ${speed} KB/s — ${elapsed}s`);
        }
    }

    fileStream.end();
    await new Promise((resolve) => fileStream.on('finish', resolve));

    const finalSize = fs.statSync(ZIP_PATH).size;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n\nDownloaded: ${(finalSize / 1e6).toFixed(1)} MB in ${elapsed}s`);

    if (finalSize < 12_000_000) {
        throw new Error(`File too small (${finalSize} bytes) — download may be incomplete`);
    }
}

function extract() {
    console.log('\nExtracting...');
    if (!fs.existsSync(EXTRACT_DIR)) fs.mkdirSync(EXTRACT_DIR, { recursive: true });

    const { execSync } = require('child_process');
    execSync(`unzip -o "${ZIP_PATH}" -d "${EXTRACT_DIR}"`, { stdio: 'pipe' });

    const entries = fs.readdirSync(EXTRACT_DIR);
    let dataDir = EXTRACT_DIR;
    for (const entry of entries) {
        const full = path.join(EXTRACT_DIR, entry);
        if (fs.statSync(full).isDirectory() && entry.includes('db_')) {
            dataDir = full;
            break;
        }
    }

    const files = fs.readdirSync(dataDir);
    const keyFiles = ['Knowledge', 'Skills', 'Interests', 'Occupation Data', 'Technology Skills'];
    console.log('\nExtracted files:');
    for (const key of keyFiles) {
        const found = files.find((f) => f.includes(key));
        if (found) {
            const size = (fs.statSync(path.join(dataDir, found)).size / 1024).toFixed(0);
            console.log(`  ✓ ${found} (${size} KB)`);
        } else {
            console.log(`  ✗ ${key}.txt — NOT FOUND`);
        }
    }

    const knowledgeFile = files.find((f) => f.includes('Knowledge'));
    if (knowledgeFile) {
        const raw = fs.readFileSync(path.join(dataDir, knowledgeFile), 'utf-8');
        const lines = raw.split('\n').filter(Boolean);
        const codes = new Set();
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split('\t');
            if (parts[3]?.trim() === 'IM') codes.add(parts[0]?.trim());
        }
        console.log(`\n  Knowledge.txt: ${codes.size} occupation codes with survey data`);
    }

    const targetDir = '/tmp/onet_db';
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    for (const key of keyFiles) {
        const found = files.find((f) => f.includes(key));
        if (found) {
            const src = path.join(dataDir, found);
            const dst = path.join(targetDir, key.replace(/ /g, '_') + '.txt');
            fs.copyFileSync(src, dst);
        }
    }
    console.log(`\nCopied to ${targetDir} for processing.`);

    return dataDir;
}

async function main() {
    await download();
    extract();
    console.log('\nDone! Now run: node src/scripts/fetchOnetComplete.js');
}

main().catch((err) => {
    console.error('\nFailed:', err.message);
    process.exit(1);
});
