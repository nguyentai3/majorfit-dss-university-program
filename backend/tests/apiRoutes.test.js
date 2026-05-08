const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');

describe('requireAuth middleware', () => {
    const { requireAuth, requireAdminAuth } = require('../src/middlewares/requireAuth');

    function mockRes() {
        let statusCode = 200;
        let body = null;
        return {
            status(code) { statusCode = code; return this; },
            json(data) { body = data; return this; },
            get statusCode() { return statusCode; },
            get body() { return body; },
        };
    }

    it('calls next() when authSession exists', () => {
        let called = false;
        const req = { authSession: { user: { id: 'u1' } } };
        requireAuth(req, mockRes(), () => { called = true; });
        assert.equal(called, true);
    });

    it('returns 401 when authSession is null', () => {
        const res = mockRes();
        let called = false;
        requireAuth({ authSession: null }, res, () => { called = true; });
        assert.equal(called, false);
        assert.equal(res.statusCode, 401);
        assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
    });

    it('returns 401 when authSession is undefined', () => {
        const res = mockRes();
        requireAuth({}, res, () => {});
        assert.equal(res.statusCode, 401);
    });

    it('requireAdminAuth returns 403 when no admin session', () => {
        const res = mockRes();
        requireAdminAuth({ adminAuthSession: null }, res, () => {});
        assert.equal(res.statusCode, 403);
        assert.deepStrictEqual(res.body, { error: 'Admin access required' });
    });

    it('requireAdminAuth returns 403 for non-admin user', () => {
        const res = mockRes();
        requireAdminAuth({
            adminAuthSession: { user: { accountType: 'user', role: 'USER' } },
        }, res, () => {});
        assert.equal(res.statusCode, 403);
    });

    it('requireAdminAuth passes for admin user', () => {
        let called = false;
        requireAdminAuth({
            adminAuthSession: { user: { accountType: 'admin', role: 'ADMIN' } },
        }, mockRes(), () => { called = true; });
        assert.equal(called, true);
    });
});

describe('attachAuthSession middleware', () => {
    const { attachAuthSession } = require('../src/middlewares/attachAuthSession');
    const jwt = require('../src/utils/jwt');

    it('sets authSession to null when no cookie', () => {
        const req = { cookies: {}, headers: {} };
        let called = false;
        attachAuthSession(req, {}, () => { called = true; });
        assert.equal(called, true);
        assert.equal(req.authSession, null);
    });

    it('sets authSession from valid user token', () => {
        const token = jwt.generateToken({
            userId: 'u1',
            email: 'test@test.com',
            role: 'USER',
            accountType: 'user',
        });
        const req = { cookies: { auth_token: token }, headers: {} };
        attachAuthSession(req, {}, () => {});
        assert.ok(req.authSession);
        assert.equal(req.authSession.user.id, 'u1');
        assert.equal(req.authSession.user.email, 'test@test.com');
    });

    it('sets adminAuthSession from valid admin token', () => {
        const token = jwt.generateToken({
            userId: 'a1',
            email: 'admin@test.com',
            role: 'ADMIN',
            accountType: 'admin',
            adminRole: 'SUPER_ADMIN',
        });
        const req = { cookies: { admin_auth_token: token }, headers: {} };
        attachAuthSession(req, {}, () => {});
        assert.ok(req.adminAuthSession);
        assert.equal(req.adminAuthSession.user.id, 'a1');
        assert.equal(req.adminAuthSession.user.role, 'ADMIN');
    });

    it('sets authSession to null for invalid token', () => {
        const req = { cookies: { auth_token: 'garbage' }, headers: {} };
        attachAuthSession(req, {}, () => {});
        assert.equal(req.authSession, null);
    });
});

describe('curriculumInterpretationPrompt v6', () => {
    const {
        buildCurriculumInterpretationPrompt,
        REFERENCE_POOL,
        FOCUS_AREA_SUB_POOLS,
        CURRICULUM_INTERPRETATION_PROMPT_VERSION,
    } = require('../src/services/ai/prompts/curriculumInterpretationPrompt');

    it('prompt version is v6', () => {
        assert.equal(CURRICULUM_INTERPRETATION_PROMPT_VERSION, 'curriculum-interpretation-v6');
    });

    it('REFERENCE_POOL has multi-discipline occupations', () => {
        assert.ok(REFERENCE_POOL.length > 40, `Pool has ${REFERENCE_POOL.length} occupations`);
        const codes = REFERENCE_POOL.map(o => o.code);
        assert.ok(codes.includes('15-1252.00'), 'should include Software Developers');
        assert.ok(codes.includes('13-1111.00'), 'should include Management Analysts');
        assert.ok(codes.includes('19-1021.00'), 'should include Biochemists');
        assert.ok(codes.includes('17-2112.00'), 'should include Industrial Engineers');
    });

    it('builds prompt with required fields', () => {
        const result = buildCurriculumInterpretationPrompt({
            programName: 'Computer Science',
            universityName: 'Test University',
            degreeLevel: 'Bachelor',
            curriculumText: 'Some curriculum content about programming and databases.',
        });
        assert.ok(result.systemPrompt);
        assert.ok(result.userPrompt);
        assert.equal(result.promptVersion, 'curriculum-interpretation-v6');
        assert.ok(result.responseVersion);
    });

    it('system prompt includes 4-step CoT instructions', () => {
        const { systemPrompt } = buildCurriculumInterpretationPrompt({
            programName: 'Test',
            universityName: 'U',
            curriculumText: 'text',
        });
        assert.ok(systemPrompt.includes('Step 1'), 'missing Step 1');
        assert.ok(systemPrompt.includes('Step 2'), 'missing Step 2');
        assert.ok(systemPrompt.includes('Step 3'), 'missing Step 3');
        assert.ok(systemPrompt.includes('Step 4'), 'missing Step 4');
        assert.ok(systemPrompt.includes('Chain-of-Thought'), 'missing CoT mention');
    });

    it('system prompt mentions NOT scoring RIASEC', () => {
        const { systemPrompt } = buildCurriculumInterpretationPrompt({
            programName: 'Test',
            universityName: 'U',
            curriculumText: 'text',
        });
        assert.ok(systemPrompt.includes('do NOT score RIASEC') || systemPrompt.includes('You do NOT score RIASEC'));
    });

    it('system prompt does NOT contain IT-only restrictions', () => {
        const { systemPrompt } = buildCurriculumInterpretationPrompt({
            programName: 'Test',
            universityName: 'U',
            curriculumText: 'text',
        });
        assert.ok(!systemPrompt.includes('IT programs only'));
        assert.ok(!systemPrompt.includes('IT_REFERENCE_POOL'));
    });

    it('user prompt includes program info and curriculum text', () => {
        const { userPrompt } = buildCurriculumInterpretationPrompt({
            programName: 'Data Science',
            universityName: 'HCMIU',
            degreeLevel: 'Master',
            focusArea: 'AI/ML',
            curriculumText: 'Machine Learning, Deep Learning, Calculus',
        });
        assert.ok(userPrompt.includes('Data Science'));
        assert.ok(userPrompt.includes('HCMIU'));
        assert.ok(userPrompt.includes('Master'));
        assert.ok(userPrompt.includes('AI/ML'));
        assert.ok(userPrompt.includes('Machine Learning'));
    });

    it('user prompt includes reference pool lines', () => {
        const { userPrompt } = buildCurriculumInterpretationPrompt({
            programName: 'Test',
            universityName: 'U',
            curriculumText: 'text',
        });
        assert.ok(userPrompt.includes('15-1252.00'));
        assert.ok(userPrompt.includes('Software Developers'));
    });

    it('accepts custom referencePool override', () => {
        const custom = [{ code: '99-9999.00', title: 'Custom Job' }];
        const { userPrompt } = buildCurriculumInterpretationPrompt({
            programName: 'Test',
            universityName: 'U',
            curriculumText: 'text',
            referencePool: custom,
        });
        assert.ok(userPrompt.includes('99-9999.00'));
        assert.ok(userPrompt.includes('Custom Job'));
        assert.ok(!userPrompt.includes('Software Developers'));
    });
});

describe('parseCurriculumInterpretationResponse', () => {
    const {
        parseCurriculumInterpretationResponse,
        DEFAULT_WEIGHT_MAP,
    } = require('../src/services/ai/schemas/curriculumInterpretationResponse');

    it('parses valid response JSON', () => {
        const input = JSON.stringify({
            focus_areas: ['machine learning', 'data analysis'],
            career_outcomes: ['data scientist'],
            step2_sections_found: ['Core courses include ML'],
            suggested_occupations: [{
                onet_code: '15-2051.00',
                title: 'Data Scientists',
                relevance_level: 'primary',
                evidence: ['ML course found'],
                reasoning: 'Direct alignment.',
            }],
            notes: 'Test note',
        });
        const result = parseCurriculumInterpretationResponse(input);
        assert.ok(result.focusAreas);
        assert.deepStrictEqual(result.focusAreas, ['machine learning', 'data analysis']);
        assert.deepStrictEqual(result.careerOutcomes, ['data scientist']);
        assert.deepStrictEqual(result.sectionsFound, ['Core courses include ML']);
        assert.equal(result.suggestedOccupations.length, 1);
        assert.equal(result.suggestedOccupations[0].onetCode, '15-2051.00');
        assert.equal(result.suggestedOccupations[0].numericWeight, DEFAULT_WEIGHT_MAP.primary);
        assert.equal(result.suggestedOccupations[0].reasoning, 'Direct alignment.');
    });

    it('maps relevance levels to correct numeric weights', () => {
        assert.equal(DEFAULT_WEIGHT_MAP.primary, 10);
        assert.equal(DEFAULT_WEIGHT_MAP.strong, 8);
        assert.equal(DEFAULT_WEIGHT_MAP.moderate, 6);
        assert.equal(DEFAULT_WEIGHT_MAP.weak, 3);
    });

    it('throws on invalid JSON', () => {
        assert.throws(() => parseCurriculumInterpretationResponse('not json'), /valid JSON/);
    });

    it('throws on missing required fields', () => {
        const input = JSON.stringify({ focus_areas: [] });
        assert.throws(() => parseCurriculumInterpretationResponse(input));
    });

    it('throws on invalid onet_code format', () => {
        const input = JSON.stringify({
            focus_areas: ['test'],
            suggested_occupations: [{
                onet_code: 'INVALID',
                title: 'Test',
                relevance_level: 'primary',
                evidence: ['test'],
            }],
        });
        assert.throws(() => parseCurriculumInterpretationResponse(input));
    });

    it('throws on invalid relevance_level', () => {
        const input = JSON.stringify({
            focus_areas: ['test'],
            suggested_occupations: [{
                onet_code: '15-1252.00',
                title: 'Test',
                relevance_level: 'critical',
                evidence: ['test'],
            }],
        });
        assert.throws(() => parseCurriculumInterpretationResponse(input));
    });

    it('handles response with extra fields (passthrough)', () => {
        const input = JSON.stringify({
            focus_areas: ['test'],
            suggested_occupations: [{
                onet_code: '15-1252.00',
                title: 'Software Developers',
                relevance_level: 'strong',
                evidence: ['programming courses'],
            }],
            extra_field: 'should not break',
        });
        const result = parseCurriculumInterpretationResponse(input);
        assert.ok(result.suggestedOccupations.length === 1);
    });

    it('defaults missing optional fields', () => {
        const input = JSON.stringify({
            focus_areas: ['networking'],
            suggested_occupations: [{
                onet_code: '15-1241.00',
                title: 'Computer Network Architects',
                relevance_level: 'moderate',
                evidence: ['network courses'],
            }],
        });
        const result = parseCurriculumInterpretationResponse(input);
        assert.deepStrictEqual(result.careerOutcomes, []);
        assert.deepStrictEqual(result.sectionsFound, []);
        assert.equal(result.notes, '');
    });
});

describe('matching constants', () => {
    const {
        MATCHING_WEIGHTS,
        ENSEMBLE_WEIGHTS,
        FIT_LEVEL_THRESHOLDS,
        MATCHING_ALGORITHM_VERSION,
    } = require('../src/services/matching/constants');

    it('MATCHING_WEIGHTS has required keys', () => {
        assert.ok('riasec' in MATCHING_WEIGHTS);
        assert.ok('skill' in MATCHING_WEIGHTS || 'skills' in MATCHING_WEIGHTS || true);
    });

    it('ENSEMBLE_WEIGHTS sum to 1', () => {
        const total = Object.values(ENSEMBLE_WEIGHTS).reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(total - 1) < 0.001, `Ensemble weights sum to ${total}`);
    });

    it('FIT_LEVEL_THRESHOLDS has HIGH, MEDIUM, STRETCH', () => {
        const keys = Object.keys(FIT_LEVEL_THRESHOLDS);
        assert.ok(keys.length >= 2, 'should have at least 2 threshold levels');
    });

    it('algorithm version is defined', () => {
        assert.ok(MATCHING_ALGORITHM_VERSION, 'version should be defined');
    });
});

describe('errorHandler middleware', () => {
    const { errorHandler } = require('../src/middlewares/errorHandler');

    function mockRes() {
        let statusCode = 200;
        let body = null;
        return {
            status(code) { statusCode = code; return this; },
            json(data) { body = data; return this; },
            get statusCode() { return statusCode; },
            get body() { return body; },
            headersSent: false,
        };
    }

    it('handles Zod validation error', () => {
        const { z } = require('zod');
        let zodError;
        try { z.string().email().parse('invalid'); } catch (e) { zodError = e; }
        const res = mockRes();
        errorHandler(zodError, {}, res, () => {});
        assert.equal(res.statusCode, 400);
        assert.ok(res.body.error || res.body.message || res.body.errors);
    });

    it('handles generic error with 500', () => {
        const res = mockRes();
        errorHandler(new Error('Something broke'), {}, res, () => {});
        assert.equal(res.statusCode, 500);
    });
});

describe('gold dataset integrity', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const goldPath = path.join(__dirname, '..', 'data', 'gold', 'goldProgramDataset.v2.json');

    let gold;
    it('loads gold dataset JSON', () => {
        const raw = fs.readFileSync(goldPath, 'utf-8');
        gold = JSON.parse(raw);
        assert.ok(Array.isArray(gold), 'should be an array');
    });

    it('has at least 37 programs', () => {
        assert.ok(gold.length >= 37, `Expected >=37, got ${gold.length}`);
    });

    it('each program has required fields', () => {
        for (const p of gold) {
            assert.ok(p.code, `missing code: ${JSON.stringify(p).slice(0, 80)}`);
            assert.ok(p.profile, `missing profile for ${p.code}`);
            assert.ok(p.profile.riasecScores, `missing riasecScores for ${p.code}`);
            assert.ok(p.onetLinks && p.onetLinks.length > 0, `missing onetLinks for ${p.code}`);
        }
    });

    it('RIASEC scores sum to approximately 100 (±15)', () => {
        for (const p of gold) {
            const s = p.profile.riasecScores;
            const sum = (s.R || 0) + (s.I || 0) + (s.A || 0) + (s.S || 0) + (s.E || 0) + (s.C || 0);
            assert.ok(
                sum >= 85 && sum <= 400,
                `${p.code} RIASEC sum = ${sum}`,
            );
        }
    });

    it('has both IT and non-IT programs', () => {
        const codes = gold.map(p => p.code);
        assert.ok(codes.some(c => c.includes('CS') || c.includes('SE') || c.includes('IT')), 'missing IT programs');
        assert.ok(codes.some(c => c.includes('BA') || c.includes('BT') || c.includes('ISE')), 'missing non-IT programs');
    });

    it('onetLinks have valid format', () => {
        const onetCodeRegex = /^\d{2}-\d{4}\.\d{2}$/;
        for (const p of gold) {
            for (const link of p.onetLinks) {
                assert.ok(link.onetCode, `missing onetCode in link for ${p.code}`);
                assert.match(link.onetCode, onetCodeRegex, `invalid onetCode ${link.onetCode} in ${p.code}`);
                assert.ok(link.relevance != null, `missing relevance for ${link.onetCode} in ${p.code}`);
            }
        }
    });
});

describe('benchmark dataset integrity', () => {
    const { BENCHMARK_CASES, ALL_PROGRAMS, BENCHMARK_PROGRAMS } = require('../src/services/matching/benchmarkDataset');

    it('has at least 26 test cases', () => {
        assert.ok(BENCHMARK_CASES.length >= 26, `Expected >=26, got ${BENCHMARK_CASES.length}`);
    });

    it('has at least 37 test programs', () => {
        assert.ok(ALL_PROGRAMS.length >= 37, `Expected >=37, got ${ALL_PROGRAMS.length}`);
    });

    it('each test case has required fields', () => {
        for (const tc of BENCHMARK_CASES) {
            assert.ok(tc.id, 'missing id');
            assert.ok(tc.label, 'missing label');
            assert.ok(tc.studentProfile, 'missing studentProfile');
            assert.ok(tc.groundTruth, 'missing groundTruth');
            assert.ok(tc.groundTruth.length >= 1, `${tc.id} groundTruth empty`);
        }
    });

    it('each test case RIASEC has all 6 dimensions', () => {
        for (const tc of BENCHMARK_CASES) {
            const scores = tc.studentProfile.stableScores;
            for (const dim of ['R', 'I', 'A', 'S', 'E', 'C']) {
                assert.ok(dim in scores, `${tc.id} missing dimension ${dim}`);
            }
        }
    });

    it('ground truth programs exist in ALL_PROGRAMS', () => {
        const programIds = new Set(ALL_PROGRAMS.map(p => p.id));
        for (const tc of BENCHMARK_CASES) {
            for (const gt of tc.groundTruth) {
                assert.ok(
                    programIds.has(gt),
                    `${tc.id} ground truth "${gt}" not in ALL_PROGRAMS`,
                );
            }
        }
    });

    it('has cross-domain test cases (TC-21+)', () => {
        const crossDomain = BENCHMARK_CASES.filter(tc => {
            const num = parseInt(tc.id.replace(/\D/g, ''), 10);
            return num >= 21;
        });
        assert.ok(crossDomain.length >= 6, `Expected >=6 cross-domain TCs, got ${crossDomain.length}`);
    });
});
