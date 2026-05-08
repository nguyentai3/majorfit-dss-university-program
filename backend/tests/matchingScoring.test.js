const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

const {
    calculateProgramMatch,
    calculateCosineSimilarity,
    calculateTOPSIS,
    calculateHybridEnsemble,
    buildRiasecBreakdown,
    buildGrowthScore,
    buildConfidenceComponent,
    buildHollandOverlapAdjustment,
    buildThresholdPenalty,
    classifyFitLevel,
    closenessScore,
    average,
    weightedAverage,
    buildCombinedVector,
    dotProduct,
    vectorMagnitude,
    mergeWeights,
} = require('../src/services/matching/coreScoringService');

const { clampScore } = require('../src/modules/matching/scoring/primitives');

const {
    MATCHING_WEIGHTS,
    ENSEMBLE_WEIGHTS,
    FIT_LEVEL_THRESHOLDS,
    MATCHING_ALGORITHM_VERSION,
} = require('../src/services/matching/constants');

function makeStudent(riasec, opts = {}) {
    return {
        stableScores: riasec,
        growth: opts.growth || [],
        confidenceScore: opts.confidence ?? 75,
        latestHollandCode: opts.hollandCode || topDims(riasec),
    };
}

function makeProgram(riasec, opts = {}) {
    return {
        id: opts.id || 'TEST-PROG',
        riasecScores: riasec,
        confidenceScore: opts.confidence ?? 80,
        focusArea: opts.focusArea || 'General',
        name: opts.name || 'Test Program',
    };
}

function makeCandidates(programs) {
    return programs.map((p) => ({
        id: p.id,
        profile: p,
        meta: { focusArea: p.focusArea, name: p.name },
    }));
}

function topDims(scores) {
    return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k)
        .join('');
}

describe('Primitives', () => {
    describe('clampScore', () => {
        it('clamps values to 0-100 range', () => {
            assert.equal(clampScore(50), 50);
            assert.equal(clampScore(-10), 0);
            assert.equal(clampScore(120), 100);
            assert.equal(clampScore(0), 0);
            assert.equal(clampScore(100), 100);
        });

        it('handles NaN with fallback', () => {
            assert.equal(clampScore(NaN), 0);
            assert.equal(clampScore(NaN, 42), 42);
        });

        it('handles undefined/null', () => {
            assert.equal(clampScore(undefined), 0);
            assert.equal(clampScore(null), 0);
        });
    });

    describe('closenessScore', () => {
        it('returns 100 for identical values', () => {
            assert.equal(closenessScore(75, 75), 100);
        });

        it('returns correct gap score', () => {
            assert.equal(closenessScore(70, 80), 90);
            assert.equal(closenessScore(80, 70), 90);
        });

        it('clamps at 0 for extreme gaps', () => {
            assert.ok(closenessScore(0, 100) >= 0);
        });
    });

    describe('average', () => {
        it('computes arithmetic mean', () => {
            assert.equal(average([10, 20, 30]), 20);
        });

        it('handles single value', () => {
            assert.equal(average([42]), 42);
        });

        it('handles empty array', () => {
            const result = average([]);
            assert.ok(result === 0 || Number.isNaN(result));
        });
    });

    describe('weightedAverage', () => {
        it('computes weighted mean', () => {
            const result = weightedAverage([100, 0], [0.5, 0.5]);
            assert.equal(result, 50);
        });

        it('weights affect result', () => {
            const result = weightedAverage([100, 0], [0.9, 0.1]);
            assert.ok(result > 50);
        });
    });

    describe('buildCombinedVector', () => {
        it('returns array from RIASEC scores', () => {
            const riasec = { R: 10, I: 20, A: 30, S: 40, E: 50, C: 60 };
            const vec = buildCombinedVector(riasec, {});
            assert.ok(vec.length >= 6);
        });

        it('first 6 elements are RIASEC', () => {
            const riasec = { R: 10, I: 20, A: 30, S: 40, E: 50, C: 60 };
            const vec = buildCombinedVector(riasec, {});
            assert.deepEqual(vec.slice(0, 6), [10, 20, 30, 40, 50, 60]);
        });
    });

    describe('dotProduct', () => {
        it('computes correct dot product', () => {
            assert.equal(dotProduct([1, 2, 3], [4, 5, 6]), 32);
        });

        it('returns 0 for zero vectors', () => {
            assert.equal(dotProduct([0, 0], [0, 0]), 0);
        });
    });

    describe('vectorMagnitude', () => {
        it('computes correct magnitude', () => {
            assert.ok(Math.abs(vectorMagnitude([3, 4]) - 5) < 0.001);
        });

        it('returns 0 for zero vector', () => {
            assert.equal(vectorMagnitude([0, 0, 0]), 0);
        });
    });
});

describe('SAW Component Builders', () => {
    const studentScores = { R: 80, I: 90, A: 25, S: 35, E: 20, C: 75 };
    const progScores = { R: 75, I: 88, A: 30, S: 30, E: 25, C: 70 };

    describe('buildRiasecBreakdown', () => {
        it('returns 6 dimension entries', () => {
            const result = buildRiasecBreakdown(studentScores, progScores);
            assert.equal(result.breakdown.length, 6);
        });

        it('each entry has required fields', () => {
            const result = buildRiasecBreakdown(studentScores, progScores);
            for (const entry of result.breakdown) {
                assert.ok('key' in entry);
                assert.ok('closeness' in entry);
                assert.ok('weight' in entry);
                assert.ok('student' in entry);
                assert.ok('target' in entry);
            }
        });

        it('score is between 0-100', () => {
            const result = buildRiasecBreakdown(studentScores, progScores);
            assert.ok(result.score >= 0 && result.score <= 100);
        });

        it('identical profiles yield near-100 score', () => {
            const result = buildRiasecBreakdown(studentScores, studentScores);
            assert.ok(result.score >= 99, `Expected ≥99, got ${result.score}`);
        });
    });

    describe('buildGrowthScore', () => {
        it('returns base 50 with no growth', () => {
            const result = buildGrowthScore([], { R: 50, I: 80, A: 30, S: 40, E: 20, C: 60 });
            assert.equal(result.score, 50);
        });

        it('positive growth increases score above 50', () => {
            const result = buildGrowthScore(
                [{ dimension: 'I', deltaFromPrevious: 5, deltaFromBaseline: 10 }],
                { R: 50, I: 80, A: 30, S: 40, E: 20, C: 60 },
            );
            assert.ok(result.score > 50, `Expected > 50, got ${result.score}`);
        });

        it('returns breakdown for relevant dimensions', () => {
            const result = buildGrowthScore(
                [{ dimension: 'I', deltaFromPrevious: 3, deltaFromBaseline: 6 }],
                { R: 50, I: 80, A: 30, S: 40, E: 20, C: 60 },
            );
            assert.ok(result.breakdown.length > 0);
            assert.ok(result.breakdown[0].key);
        });
    });

    describe('buildConfidenceComponent', () => {
        it('averages student and program confidence', () => {
            const result = buildConfidenceComponent(80, 90);
            assert.equal(result.score, 85);
        });

        it('uses fallback for missing program confidence', () => {
            const result = buildConfidenceComponent(80, undefined);
            assert.ok(result.score > 0);
        });

        it('returns student and program fields', () => {
            const result = buildConfidenceComponent(80, 90);
            assert.equal(result.student, 80);
            assert.equal(result.program, 90);
        });
    });

    describe('buildHollandOverlapAdjustment', () => {
        it('full overlap gives max bonus', () => {
            const student = makeStudent({ R: 10, I: 90, A: 20, S: 30, E: 40, C: 80 });
            const progRiasec = { R: 10, I: 88, A: 20, S: 30, E: 40, C: 82 };
            const result = buildHollandOverlapAdjustment(student, progRiasec);
            assert.equal(result.bonus, 15);
        });

        it('no overlap gives 0 bonus', () => {
            const student = makeStudent({ R: 90, I: 10, A: 80, S: 10, E: 70, C: 10 });
            const progRiasec = { R: 10, I: 90, A: 10, S: 80, E: 10, C: 70 };
            const result = buildHollandOverlapAdjustment(student, progRiasec);
            assert.equal(result.bonus, 0);
        });

        it('partial overlap gives proportional bonus', () => {
            const student = makeStudent({ R: 90, I: 80, A: 70, S: 10, E: 10, C: 10 });
            const progRiasec = { R: 90, I: 10, A: 10, S: 10, E: 80, C: 70 };
            const result = buildHollandOverlapAdjustment(student, progRiasec);
            assert.equal(result.bonus, 5, `expected 5, got ${result.bonus}`);
        });
    });

    describe('buildThresholdPenalty', () => {
        it('no penalty when student meets all targets', () => {
            const riasec = buildRiasecBreakdown(
                { R: 90, I: 90, A: 90, S: 90, E: 90, C: 90 },
                { R: 80, I: 80, A: 80, S: 80, E: 80, C: 80 },
            );
            const result = buildThresholdPenalty({
                riasecBreakdown: riasec.breakdown,
                skillBreakdown: [],
            });
            assert.equal(result.penalty, 0);
        });

        it('penalty for large RIASEC gaps', () => {
            const riasec = buildRiasecBreakdown(
                { R: 40, I: 40, A: 40, S: 40, E: 40, C: 40 },
                { R: 90, I: 90, A: 90, S: 90, E: 90, C: 90 },
            );
            const result = buildThresholdPenalty({
                riasecBreakdown: riasec.breakdown,
                skillBreakdown: [],
            });
            assert.ok(result.penalty > 0, `Expected penalty > 0, got ${result.penalty}`);
        });

        it('penalty capped at MAX_TOTAL_PENALTY (10)', () => {
            const riasec = buildRiasecBreakdown(
                { R: 10, I: 10, A: 10, S: 10, E: 10, C: 10 },
                { R: 100, I: 100, A: 100, S: 100, E: 100, C: 100 },
            );
            const result = buildThresholdPenalty({
                riasecBreakdown: riasec.breakdown,
                skillBreakdown: [],
            });
            assert.ok(result.penalty <= 10, `Expected ≤10, got ${result.penalty}`);
        });
    });
});

describe('calculateProgramMatch (SAW)', () => {
    it('returns all required fields', () => {
        const student = makeStudent({ R: 70, I: 80, A: 40, S: 50, E: 30, C: 65 });
        const prog = makeProgram({ R: 72, I: 78, A: 42, S: 48, E: 32, C: 63 });
        const result = calculateProgramMatch({
            studentProfile: student,
            programProfile: prog,
        });

        assert.ok('finalScore' in result);
        assert.ok('riasecScore' in result);
        assert.ok('growthScore' in result);
        assert.ok('confidenceScore' in result);
        assert.ok('fitLevel' in result);
        assert.ok('breakdown' in result);
        assert.ok('strengths' in result);
        assert.ok('gaps' in result);
        assert.ok('weights' in result);
    });

    it('identical profiles produce HIGH_FIT', () => {
        const riasec = { R: 80, I: 85, A: 30, S: 45, E: 35, C: 70 };
        const student = makeStudent(riasec, { confidence: 85 });
        const prog = makeProgram(riasec, { confidence: 85 });
        const result = calculateProgramMatch({
            studentProfile: student,
            programProfile: prog,
        });
        assert.ok(
            result.finalScore >= FIT_LEVEL_THRESHOLDS.high,
            `Expected ≥${FIT_LEVEL_THRESHOLDS.high}, got ${result.finalScore}`,
        );
        assert.equal(result.fitLevel, 'HIGH_FIT');
    });

    it('very different profiles produce lower score', () => {
        const student = makeStudent({ R: 90, I: 10, A: 85, S: 15, E: 80, C: 20 });
        const prog = makeProgram({ R: 15, I: 85, A: 20, S: 90, E: 10, C: 80 });
        const result = calculateProgramMatch({
            studentProfile: student,
            programProfile: prog,
        });
        assert.ok(
            result.finalScore < FIT_LEVEL_THRESHOLDS.high,
            `Expected < ${FIT_LEVEL_THRESHOLDS.high}, got ${result.finalScore}`,
        );
    });

    it('score is between 0-100', () => {
        const student = makeStudent({ R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 });
        const prog = makeProgram({ R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 });
        const result = calculateProgramMatch({
            studentProfile: student,
            programProfile: prog,
        });
        assert.ok(result.finalScore >= 0 && result.finalScore <= 100);
    });

    it('custom weights override defaults', () => {
        const student = makeStudent({ R: 80, I: 90, A: 20, S: 30, E: 25, C: 70 });
        const prog = makeProgram({ R: 82, I: 88, A: 22, S: 28, E: 27, C: 68 });
        const resultDefault = calculateProgramMatch({
            studentProfile: student,
            programProfile: prog,
        });
        const resultCustom = calculateProgramMatch({
            studentProfile: student,
            programProfile: prog,
            weights: { riasec: 0.9, skill: 0.05, growth: 0.025, confidence: 0.025 },
        });
        assert.ok(typeof resultDefault.finalScore === 'number');
        assert.ok(typeof resultCustom.finalScore === 'number');
    });
});

describe('calculateCosineSimilarity', () => {
    it('identical profiles give score ~100', () => {
        const riasec = { R: 70, I: 80, A: 50, S: 40, E: 30, C: 60 };
        const student = makeStudent(riasec);
        const prog = makeProgram(riasec);
        const result = calculateCosineSimilarity(student, prog);
        assert.ok(result.score >= 99, `Expected ≥99, got ${result.score}`);
        assert.ok(result.rawCosine >= 0.99);
    });

    it('returns score and rawCosine fields', () => {
        const student = makeStudent({ R: 50, I: 60, A: 40, S: 30, E: 20, C: 70 });
        const prog = makeProgram({ R: 55, I: 65, A: 35, S: 25, E: 25, C: 75 });
        const result = calculateCosineSimilarity(student, prog);
        assert.ok('score' in result);
        assert.ok('rawCosine' in result);
        assert.ok(result.score >= 0 && result.score <= 100);
        assert.ok(result.rawCosine >= 0 && result.rawCosine <= 1);
    });

    it('orthogonal-like profiles give lower score', () => {
        const student = makeStudent({ R: 100, I: 0, A: 0, S: 0, E: 0, C: 0 });
        const prog = makeProgram({ R: 0, I: 100, A: 0, S: 0, E: 0, C: 0 });
        const result = calculateCosineSimilarity(student, prog);
        assert.ok(result.score < 50, `Expected <50, got ${result.score}`);
    });
});

describe('calculateTOPSIS', () => {
    it('returns results for each candidate', () => {
        const student = makeStudent({ R: 70, I: 80, A: 40, S: 50, E: 30, C: 65 });
        const progs = [
            makeProgram({ R: 72, I: 78, A: 42, S: 48, E: 32, C: 63 }, { id: 'P1' }),
            makeProgram({ R: 40, I: 30, A: 80, S: 70, E: 60, C: 35 }, { id: 'P2' }),
        ];
        const results = calculateTOPSIS(student, progs);
        assert.equal(results.length, 2);
    });

    it('each result has required fields', () => {
        const student = makeStudent({ R: 60, I: 70, A: 50, S: 40, E: 30, C: 55 });
        const progs = [
            makeProgram({ R: 62, I: 68, A: 52, S: 38, E: 32, C: 53 }),
            makeProgram({ R: 30, I: 40, A: 80, S: 70, E: 60, C: 35 }),
        ];
        const results = calculateTOPSIS(student, progs);
        for (const r of results) {
            assert.ok('index' in r);
            assert.ok('score' in r);
            assert.ok('dPlus' in r || 'closenessCoefficient' in r);
            assert.ok(r.score >= 0 && r.score <= 100);
        }
    });

    it('closer profile ranks higher', () => {
        const student = makeStudent({ R: 80, I: 90, A: 20, S: 30, E: 25, C: 70 });
        const close = makeProgram({ R: 78, I: 88, A: 22, S: 32, E: 27, C: 68 }, { id: 'CLOSE' });
        const far = makeProgram({ R: 20, I: 30, A: 80, S: 70, E: 75, C: 30 }, { id: 'FAR' });
        const results = calculateTOPSIS(student, [close, far]);
        assert.ok(results[0].score > results[1].score, 'Close program should score higher');
    });

    it('handles single candidate', () => {
        const student = makeStudent({ R: 50, I: 60, A: 40, S: 30, E: 20, C: 70 });
        const prog = makeProgram({ R: 55, I: 65, A: 35, S: 25, E: 25, C: 75 });
        const results = calculateTOPSIS(student, [prog]);
        assert.equal(results.length, 1);
        assert.ok(results[0].score >= 0);
    });
});

describe('calculateHybridEnsemble', () => {
    const student = makeStudent(
        { R: 75, I: 85, A: 30, S: 40, E: 25, C: 70 },
        { hollandCode: 'IRC', confidence: 78 },
    );
    const programs = [
        makeProgram({ R: 78, I: 88, A: 35, S: 42, E: 25, C: 65 }, {
            id: 'CS-001', focusArea: 'Computer Science', name: 'Computer Science',
        }),
        makeProgram({ R: 30, I: 40, A: 80, S: 70, E: 60, C: 35 }, {
            id: 'ART-001', focusArea: 'Fine Arts', name: 'Fine Arts',
        }),
        makeProgram({ R: 20, I: 25, A: 30, S: 85, E: 80, C: 45 }, {
            id: 'BIZ-001', focusArea: 'Business', name: 'Business Administration',
        }),
    ];
    const candidates = makeCandidates(programs);

    it('returns sorted results', () => {
        const results = calculateHybridEnsemble({
            studentProfile: student,
            candidatePrograms: candidates,
        });
        assert.equal(results.length, 3);
        for (let i = 1; i < results.length; i++) {
            assert.ok(
                results[i - 1].hybridScore >= results[i].hybridScore,
                `Not sorted: ${results[i - 1].hybridScore} < ${results[i].hybridScore}`,
            );
        }
    });

    it('each result has hybrid components', () => {
        const results = calculateHybridEnsemble({
            studentProfile: student,
            candidatePrograms: candidates,
        });
        for (const r of results) {
            assert.ok('programId' in r);
            assert.ok('hybridScore' in r);
            assert.ok('sawScore' in r);
            assert.ok('topsisScore' in r);
            assert.ok('cosineScore' in r);
            assert.ok('fitLevel' in r);
        }
    });

    it('CS program ranks highest for IRC student', () => {
        const results = calculateHybridEnsemble({
            studentProfile: student,
            candidatePrograms: candidates,
        });
        assert.equal(results[0].programId, 'CS-001');
    });

    it('hybrid score is weighted combination', () => {
        const results = calculateHybridEnsemble({
            studentProfile: student,
            candidatePrograms: candidates,
        });
        const r = results[0];
        const expected =
            r.sawScore * ENSEMBLE_WEIGHTS.saw +
            r.topsisScore * ENSEMBLE_WEIGHTS.topsis +
            r.cosineScore * ENSEMBLE_WEIGHTS.cosine;
        assert.ok(
            Math.abs(r.hybridScore - expected) < 1,
            `hybridScore ${r.hybridScore} ≠ weighted sum ${expected.toFixed(2)}`,
        );
    });

    it('fitLevel assigned correctly based on thresholds', () => {
        const results = calculateHybridEnsemble({
            studentProfile: student,
            candidatePrograms: candidates,
        });
        for (const r of results) {
            if (r.hybridScore >= FIT_LEVEL_THRESHOLDS.high) {
                assert.equal(r.fitLevel, 'HIGH_FIT');
            } else if (r.hybridScore >= FIT_LEVEL_THRESHOLDS.medium) {
                assert.equal(r.fitLevel, 'MEDIUM_FIT');
            } else {
                assert.equal(r.fitLevel, 'STRETCH');
            }
        }
    });
});

describe('classifyFitLevel', () => {
    it('HIGH_FIT for scores >= threshold', () => {
        assert.equal(classifyFitLevel(FIT_LEVEL_THRESHOLDS.high), 'HIGH_FIT');
        assert.equal(classifyFitLevel(100), 'HIGH_FIT');
    });

    it('MEDIUM_FIT for mid-range scores', () => {
        assert.equal(classifyFitLevel(FIT_LEVEL_THRESHOLDS.medium), 'MEDIUM_FIT');
        assert.equal(classifyFitLevel(FIT_LEVEL_THRESHOLDS.high - 0.1), 'MEDIUM_FIT');
    });

    it('STRETCH for low scores', () => {
        assert.equal(classifyFitLevel(FIT_LEVEL_THRESHOLDS.medium - 0.1), 'STRETCH');
        assert.equal(classifyFitLevel(0), 'STRETCH');
    });
});

describe('Matching Constants', () => {
    it('MATCHING_WEIGHTS sum to 1', () => {
        const sum = Object.values(MATCHING_WEIGHTS).reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(sum - 1) < 0.001, `Weights sum to ${sum}, expected 1`);
    });

    it('ENSEMBLE_WEIGHTS sum to 1', () => {
        const sum = Object.values(ENSEMBLE_WEIGHTS).reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(sum - 1) < 0.001, `Ensemble weights sum to ${sum}, expected 1`);
    });

    it('FIT_LEVEL_THRESHOLDS.high > medium', () => {
        assert.ok(FIT_LEVEL_THRESHOLDS.high > FIT_LEVEL_THRESHOLDS.medium);
    });

    it('algorithm version is defined', () => {
        assert.ok(MATCHING_ALGORITHM_VERSION);
    });
});

describe('Evaluation Service', () => {
    const { runFullEvaluation } = require('../src/services/matching/evaluationService');

    it('runs without crashing', () => {
        const result = runFullEvaluation();
        assert.ok(result);
    });

    it('returns correct structure', () => {
        const result = runFullEvaluation();
        assert.ok('algorithmVersion' in result);
        assert.ok('aggregate' in result);
        assert.ok('cases' in result);
        assert.ok('fitLevelDistribution' in result);
    });

    it('evaluates all benchmark cases', () => {
        const result = runFullEvaluation();
        assert.ok(result.aggregate.totalCases >= 10, `Expected ≥10 cases, got ${result.aggregate.totalCases}`);
        assert.equal(result.cases.length, result.aggregate.totalCases);
    });

    it('metrics are in valid ranges', () => {
        const result = runFullEvaluation();
        const agg = result.aggregate;
        assert.ok(agg.meanPrecision_at_1 >= 0 && agg.meanPrecision_at_1 <= 1);
        assert.ok(agg.meanPrecision_at_3 >= 0 && agg.meanPrecision_at_3 <= 1);
        assert.ok(agg.meanNDCG_at_3 >= 0 && agg.meanNDCG_at_3 <= 1);
        assert.ok(agg.meanSpearmanRho >= -1 && agg.meanSpearmanRho <= 1);
        assert.ok(agg.meanMRR >= 0 && agg.meanMRR <= 1);
    });

    it('each case has predicted order and metrics', () => {
        const result = runFullEvaluation();
        for (const c of result.cases) {
            assert.ok(c.predictedOrder.length > 0);
            assert.ok('metrics' in c);
            assert.ok(c.metrics.mrr >= 0);
        }
    });
});

describe('Edge Cases', () => {
    it('handles zero RIASEC scores', () => {
        const student = makeStudent({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 });
        const prog = makeProgram({ R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 });
        const result = calculateProgramMatch({
            studentProfile: student,
            programProfile: prog,
        });
        assert.ok(result.finalScore >= 0);
        assert.ok(result.fitLevel);
    });

    it('handles max RIASEC scores', () => {
        const student = makeStudent({ R: 100, I: 100, A: 100, S: 100, E: 100, C: 100 });
        const prog = makeProgram({ R: 100, I: 100, A: 100, S: 100, E: 100, C: 100 });
        const result = calculateProgramMatch({
            studentProfile: student,
            programProfile: prog,
        });
        assert.ok(result.finalScore >= 90, `Expected ≥90 for perfect match, got ${result.finalScore}`);
    });

    it('handles missing growth data', () => {
        const student = {
            stableScores: { R: 50, I: 60, A: 40, S: 30, E: 20, C: 70 },
            confidenceScore: 75,
            latestHollandCode: 'ICR',
        };
        const prog = makeProgram({ R: 55, I: 65, A: 35, S: 25, E: 25, C: 75 });
        const result = calculateProgramMatch({
            studentProfile: student,
            programProfile: prog,
        });
        assert.ok(result.finalScore >= 0);
    });

    it('handles missing confidence', () => {
        const student = {
            stableScores: { R: 50, I: 60, A: 40, S: 30, E: 20, C: 70 },
            growth: [],
            latestHollandCode: 'ICR',
        };
        const prog = makeProgram({ R: 55, I: 65, A: 35, S: 25, E: 25, C: 75 });
        const result = calculateProgramMatch({
            studentProfile: student,
            programProfile: prog,
        });
        assert.ok(result.finalScore >= 0);
    });

    it('hybrid with single candidate', () => {
        const student = makeStudent({ R: 70, I: 80, A: 40, S: 50, E: 30, C: 65 });
        const prog = makeProgram({ R: 72, I: 78, A: 42, S: 48, E: 32, C: 63 }, {
            id: 'SINGLE',
        });
        const results = calculateHybridEnsemble({
            studentProfile: student,
            candidatePrograms: makeCandidates([prog]),
        });
        assert.equal(results.length, 1);
        assert.equal(results[0].programId, 'SINGLE');
        assert.ok(results[0].hybridScore > 0);
    });

    it('cosine with flat profiles', () => {
        const student = makeStudent({ R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 });
        const prog = makeProgram({ R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 });
        const result = calculateCosineSimilarity(student, prog);
        assert.ok(result.rawCosine >= 0.99, 'Identical flat profiles should have cosine ~1');
    });
});

describe('Scoring with real gold dataset', () => {
    const { ALL_PROGRAMS } = require('../src/services/matching/benchmarkDataset');

    it('gold dataset has IT programs', () => {
        assert.ok(ALL_PROGRAMS.length >= 20, `Expected ≥20 IT programs, got ${ALL_PROGRAMS.length}`);
    });

    it('all programs have valid RIASEC scores', () => {
        for (const prog of ALL_PROGRAMS) {
            const s = prog.riasecScores;
            assert.ok(s, `Program ${prog.id} missing riasecScores`);
            for (const dim of ['R', 'I', 'A', 'S', 'E', 'C']) {
                assert.ok(
                    typeof s[dim] === 'number' && s[dim] >= 0 && s[dim] <= 100,
                    `${prog.id}.${dim} = ${s[dim]} invalid`,
                );
            }
        }
    });

    it('hybrid ensemble ranks IRC student near CS programs', () => {
        const student = makeStudent(
            { R: 80, I: 90, A: 25, S: 35, E: 20, C: 75 },
            { hollandCode: 'IRC', confidence: 80 },
        );
        const candidates = makeCandidates(ALL_PROGRAMS);
        const results = calculateHybridEnsemble({
            studentProfile: student,
            candidatePrograms: candidates,
        });

        const csPrograms = ALL_PROGRAMS
            .filter((p) => p.focusArea?.toLowerCase().includes('computer science'))
            .map((p) => p.id);

        const top10 = results.slice(0, 10).map((r) => r.programId);
        const csInTop10 = top10.filter((id) => csPrograms.includes(id));
        assert.ok(
            csInTop10.length >= 1,
            `No CS programs in top 10 for IRC student: ${top10.join(', ')}`,
        );
    });

    it('ESC student ranks near business programs', () => {
        const student = makeStudent(
            { R: 20, I: 30, A: 25, S: 60, E: 90, C: 80 },
            { hollandCode: 'ECS', confidence: 75 },
        );
        const candidates = makeCandidates(ALL_PROGRAMS);
        const results = calculateHybridEnsemble({
            studentProfile: student,
            candidatePrograms: candidates,
        });

        const top5Programs = results
            .slice(0, 5)
            .map((result) => ALL_PROGRAMS.find((program) => program.id === result.programId))
            .filter(Boolean);
        const hasEnterprisingProgram = top5Programs.some((program) => {
            const text = `${program.name} ${program.focusArea}`.toLowerCase();
            return /business|management|tourism|trade|law|relations|human resources/.test(text);
        });
        assert.ok(hasEnterprisingProgram, `Expected business-adjacent program in top 5: ${top5Programs.map((program) => program.id).join(', ')}`);
        assert.ok(results[0].hybridScore > 50);
    });
});
