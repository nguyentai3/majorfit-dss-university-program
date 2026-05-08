#!/usr/bin/env node


const fs = require('fs');
const path = require('path');
const { prisma } = require('../db/prisma');

const DEFAULT_BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://127.0.0.1:8000';
const DEFAULT_SEGMENT = 'nonofficial-no-success';
const DEFAULT_DELAY_MS = 750;
const OFFICIAL_PREFIX = 'Official CIP-SOC migration';
const SUCCESS_STATUSES = new Set(['SUCCESS', 'PROFILE_READY', 'PROFILE_PUBLISHED']);
const SEGMENTS = new Set([
    'nonofficial-no-success',
    'nonofficial-with-success',
    'all-nonofficial',
    'official-only',
    'all-active',
]);

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}

function getArg(name, fallback = null) {
    const key = `--${name}=`;
    const found = process.argv.find((item) => item.startsWith(key));
    return found ? found.slice(key.length) : fallback;
}

function hasFlag(name) {
    return process.argv.includes(`--${name}`);
}

function parseList(value) {
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function positionalCodes() {
    return process.argv
        .slice(2)
        .filter((item) => !item.startsWith('--'))
        .map((item) => item.trim())
        .filter(Boolean);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowStamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function isCurriculumPrompt(promptVersion) {
    return /^curriculum-interpretation-v\d+$/i.test(String(promptVersion || '').trim());
}

function toInt(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.round(numeric));
}

function classifyLinkMode(onetLinks = []) {
    if (!onetLinks.length) return 'no-links';
    const notes = onetLinks.map((link) => String(link.note || '').trim());
    const officialCount = notes.filter((note) => note.startsWith(OFFICIAL_PREFIX)).length;
    if (officialCount === onetLinks.length) return 'official-only';
    if (officialCount === 0) return 'nonofficial-only';
    return 'mixed';
}

function summarizeProgram(program) {
    const latestRun = (program.analysisRuns || [])
        .slice()
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0] || null;
    const latestCurriculumSuccess = (program.analysisRuns || [])
        .filter((run) => SUCCESS_STATUSES.has(run.status) && isCurriculumPrompt(run.promptVersion))
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0] || null;

    return {
        id: program.id,
        code: program.code,
        name: program.name,
        hasCurriculum: (program.curriculums || []).length > 0,
        linkMode: classifyLinkMode(program.onetLinks || []),
        onetLinkCount: (program.onetLinks || []).length,
        hasCurriculumSuccess: Boolean(latestCurriculumSuccess),
        latestCurriculumSuccessPrompt: latestCurriculumSuccess?.promptVersion || null,
        latestRunStatus: latestRun?.status || null,
        latestRunPrompt: latestRun?.promptVersion || null,
    };
}

function matchesSegment(item, segment) {
    if (segment === 'all-active') return true;
    if (segment === 'official-only') return item.linkMode === 'official-only';
    if (segment === 'all-nonofficial') return item.linkMode === 'nonofficial-only';
    if (segment === 'nonofficial-no-success') {
        return item.linkMode === 'nonofficial-only' && !item.hasCurriculumSuccess;
    }
    if (segment === 'nonofficial-with-success') {
        return item.linkMode === 'nonofficial-only' && item.hasCurriculumSuccess;
    }
    return false;
}

async function loadPrograms() {
    const programs = await prisma.program.findMany({
        where: { status: 'ACTIVE' },
        select: {
            id: true,
            code: true,
            name: true,
            curriculums: {
                orderBy: { version: 'desc' },
                take: 1,
                select: { id: true, version: true },
            },
            onetLinks: {
                select: { note: true },
            },
            analysisRuns: {
                select: {
                    status: true,
                    promptVersion: true,
                    createdAt: true,
                },
            },
        },
        orderBy: { code: 'asc' },
    });

    return programs.map(summarizeProgram);
}

function buildSelection(programs, { segment, codes, limit }) {
    const codeSet = new Set((codes || []).map((item) => item.toUpperCase()));
    const explicit = codeSet.size > 0;

    const selected = programs
        .filter((program) => {
            if (explicit) return codeSet.has(program.code.toUpperCase());
            return matchesSegment(program, segment);
        })
        .slice(0, limit > 0 ? limit : undefined);

    return selected;
}

function buildInventory(programs) {
    const inventory = {
        total: programs.length,
        officialOnly: 0,
        nonofficialOnly: 0,
        mixed: 0,
        noLinks: 0,
        withCurriculumSuccess: 0,
        withoutCurriculumSuccess: 0,
    };

    for (const program of programs) {
        if (program.linkMode === 'official-only') inventory.officialOnly += 1;
        else if (program.linkMode === 'nonofficial-only') inventory.nonofficialOnly += 1;
        else if (program.linkMode === 'mixed') inventory.mixed += 1;
        else inventory.noLinks += 1;

        if (program.hasCurriculumSuccess) inventory.withCurriculumSuccess += 1;
        else inventory.withoutCurriculumSuccess += 1;
    }

    return inventory;
}

async function signInAdmin(baseUrl) {
    const response = await fetch(`${baseUrl}/api/auth/admin/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: process.env.BENCHMARK_ADMIN_USERNAME || 'admin',
            password: requiredEnv('BENCHMARK_ADMIN_PASSWORD'),
        }),
    });

    const cookie = response.headers.get('set-cookie');
    if (!(response.ok && cookie)) {
        throw new Error(`Admin sign-in failed with HTTP ${response.status}`);
    }

    return cookie.split(';')[0];
}

async function applyProgram(baseUrl, adminCookie, program) {
    const response = await fetch(`${baseUrl}/api/admin/programs/${program.id}/ai-analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: adminCookie,
        },
        body: JSON.stringify({ mode: 'apply' }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        return {
            ok: false,
            status: response.status,
            error: payload.error || `HTTP ${response.status}`,
        };
    }

    const linkResult = payload.linkResult || {};
    return {
        ok: true,
        status: response.status,
        provider: payload.provider || '',
        model: payload.model || '',
        tokensUsed: Number(payload.tokensUsed || 0),
        previewHollandCode: payload.previewProfile?.hollandCode || '',
        createdCount: Array.isArray(linkResult.created) ? linkResult.created.length : 0,
        updatedCount: Array.isArray(linkResult.updated) ? linkResult.updated.length : 0,
        deletedCount: Array.isArray(linkResult.deleted) ? linkResult.deleted.length : 0,
        skippedCount: Array.isArray(linkResult.skipped) ? linkResult.skipped.length : 0,
        skippedSync: Boolean(linkResult.skippedSync),
        preprocessor: payload.preprocessor || null,
    };
}

function isFatalHttpStatus(status) {
    return [401, 403, 429, 503].includes(Number(status));
}

function resolveReportPath(reportArg, dryRun) {
    if (reportArg === 'none') return null;
    if (reportArg) {
        if (reportArg === 'auto') {
            const fileName = `batch_ai_onet_apply_${dryRun ? 'dry_run' : 'apply'}_${nowStamp()}.json`;
            return path.resolve(__dirname, '../../../tools/reports', fileName);
        }
        return path.resolve(process.cwd(), reportArg);
    }
    if (dryRun) return null;
    const fileName = `batch_ai_onet_apply_${nowStamp()}.json`;
    return path.resolve(__dirname, '../../../tools/reports', fileName);
}

function ensureDirFor(filePath) {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function printSelectionSummary({ inventory, selected, segment, explicitCodes, dryRun, delayMs, baseUrl }) {
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('  BATCH AI O*NET APPLY');
    console.log('════════════════════════════════════════════════════════════════════');
    console.log(`Base URL            : ${baseUrl}`);
    console.log(`Mode                : ${dryRun ? 'dry-run' : 'apply'}`);
    console.log(`Segment             : ${explicitCodes.length ? 'explicit-codes' : segment}`);
    console.log(`Delay per request   : ${delayMs} ms`);
    console.log('');
    console.log('Inventory');
    console.log(`- Active programs           : ${inventory.total}`);
    console.log(`- Official-only links       : ${inventory.officialOnly}`);
    console.log(`- Non-official-only links   : ${inventory.nonofficialOnly}`);
    console.log(`- Mixed links               : ${inventory.mixed}`);
    console.log(`- No links                  : ${inventory.noLinks}`);
    console.log(`- With curriculum success   : ${inventory.withCurriculumSuccess}`);
    console.log(`- Without curriculum success: ${inventory.withoutCurriculumSuccess}`);
    console.log('');
    console.log(`Selected targets: ${selected.length}`);
    if (selected.length > 0) {
        for (const item of selected) {
            console.log(
                `- ${item.code} | ${item.linkMode} | curriculumSuccess=${item.hasCurriculumSuccess ? 'yes' : 'no'} | latest=${item.latestRunStatus || '-'} ${item.latestRunPrompt || ''}`.trim(),
            );
        }
    }
    console.log('');
}

function writeReport(reportPath, data) {
    if (!reportPath) return;
    ensureDirFor(reportPath);
    fs.writeFileSync(reportPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    console.log(`Report written: ${reportPath}`);
}

async function main() {
    const explicitCodes = [
        ...positionalCodes(),
        ...parseList(getArg('codes', '')),
    ];
    const segment = getArg('segment', DEFAULT_SEGMENT);
    const limit = toInt(getArg('limit', '0'), 0);
    const delayMs = toInt(getArg('delay-ms', String(DEFAULT_DELAY_MS)), DEFAULT_DELAY_MS);
    const dryRun = hasFlag('dry-run');
    const stopOnError = hasFlag('stop-on-error');
    const baseUrl = getArg('base-url', DEFAULT_BASE_URL);
    const reportPath = resolveReportPath(getArg('report', null), dryRun);

    if (!SEGMENTS.has(segment) && explicitCodes.length === 0) {
        throw new Error(
            `Unknown segment "${segment}". Valid segments: ${Array.from(SEGMENTS).join(', ')}`,
        );
    }

    const programs = await loadPrograms();
    const inventory = buildInventory(programs);
    const selected = buildSelection(programs, {
        segment,
        codes: explicitCodes,
        limit,
    });

    printSelectionSummary({
        inventory,
        selected,
        segment,
        explicitCodes,
        dryRun,
        delayMs,
        baseUrl,
    });

    if (dryRun || selected.length === 0) {
        writeReport(reportPath, {
            dryRun,
            segment,
            explicitCodes,
            limit,
            delayMs,
            inventory,
            selected,
            results: [],
        });
        return;
    }

    const adminCookie = await signInAdmin(baseUrl);
    const results = [];
    let aborted = false;

    for (let index = 0; index < selected.length; index += 1) {
        const program = selected[index];
        console.log(`[${index + 1}/${selected.length}] Applying ${program.code} - ${program.name}`);
        const result = await applyProgram(baseUrl, adminCookie, program);
        results.push({
            code: program.code,
            name: program.name,
            ...result,
        });

        if (result.ok) {
            console.log(
                `  ok | created=${result.createdCount} updated=${result.updatedCount} deleted=${result.deletedCount} skipped=${result.skippedCount} holland=${result.previewHollandCode || '-'} tokens=${result.tokensUsed || 0}`,
            );
        } else {
            console.log(`  error | status=${result.status} | ${result.error}`);
            if (stopOnError || isFatalHttpStatus(result.status)) {
                aborted = true;
                break;
            }
        }

        if (delayMs > 0 && index < selected.length - 1) {
            await sleep(delayMs);
        }
    }

    const okRows = results.filter((row) => row.ok);
    const errorRows = results.filter((row) => !row.ok);
    console.log('');
    console.log('Summary');
    console.log('-------');
    console.log(`Applied successfully: ${okRows.length}`);
    console.log(`Errors              : ${errorRows.length}`);
    console.log(`Aborted             : ${aborted ? 'yes' : 'no'}`);

    writeReport(reportPath, {
        dryRun,
        segment,
        explicitCodes,
        limit,
        delayMs,
        inventory,
        selected,
        results,
        aborted,
        successCount: okRows.length,
        errorCount: errorRows.length,
    });
}

main()
    .catch((error) => {
        console.error('Batch AI O*NET apply failed.');
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
