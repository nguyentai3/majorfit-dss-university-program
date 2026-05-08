const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
    cosineSimilarity,
    buildOccupationText,
    VN_OCCUPATION_SUPPLEMENT,
    EMBEDDING_DIMENSIONS,
    findRelatedOnetSemanticSearch,
    suggestOnetLinks,
    clearEmbeddingCache,
} = require('../src/services/programs/onetSemanticSearch');

describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
        const v = [1, 2, 3, 4, 5];
        assert.ok(Math.abs(cosineSimilarity(v, v) - 1.0) < 1e-6);
    });

    it('should return 0 for orthogonal vectors', () => {
        const a = [1, 0, 0];
        const b = [0, 1, 0];
        assert.ok(Math.abs(cosineSimilarity(a, b)) < 1e-6);
    });

    it('should return -1 for opposite vectors', () => {
        const a = [1, 2, 3];
        const b = [-1, -2, -3];
        assert.ok(Math.abs(cosineSimilarity(a, b) - (-1.0)) < 1e-6);
    });

    it('should handle zero vectors gracefully', () => {
        const a = [0, 0, 0];
        const b = [1, 2, 3];
        const result = cosineSimilarity(a, b);
        assert.ok(result === 0 || Number.isNaN(result));
    });

    it('should handle single-element vectors', () => {
        const result = cosineSimilarity([5], [3]);
        assert.ok(Math.abs(result - 1.0) < 1e-6);
    });

    it('should compute correct similarity for known vectors', () => {
        const result = cosineSimilarity([1, 0], [1, 1]);
        assert.ok(Math.abs(result - Math.SQRT1_2) < 1e-4);
    });

    it('should be symmetric', () => {
        const a = [3, 7, 2, 9];
        const b = [1, 4, 8, 5];
        assert.ok(Math.abs(cosineSimilarity(a, b) - cosineSimilarity(b, a)) < 1e-10);
    });
});

describe('VN_OCCUPATION_SUPPLEMENT', () => {
    const DIMS = ['R', 'I', 'A', 'S', 'E', 'C'];

    it('should have exactly 10 VN-specific occupations', () => {
        assert.strictEqual(VN_OCCUPATION_SUPPLEMENT.length, 10);
    });

    it('every entry should have required fields', () => {
        for (const occ of VN_OCCUPATION_SUPPLEMENT) {
            assert.ok(occ.code, `Missing code on ${occ.title}`);
            assert.ok(occ.code.startsWith('VN-'), `Code ${occ.code} should start with VN-`);
            assert.ok(occ.title, `Missing title on ${occ.code}`);
            assert.ok(occ.titleVi, `Missing titleVi on ${occ.code}`);
            assert.ok(occ.description, `Missing description on ${occ.code}`);
            assert.ok(occ.hollandCode, `Missing hollandCode on ${occ.code}`);
            assert.ok(occ.riasec, `Missing riasec on ${occ.code}`);
            assert.ok(Array.isArray(occ.skills), `Skills should be array on ${occ.code}`);
            assert.ok(occ.skills.length >= 3, `Should have at least 3 skills on ${occ.code}`);
            assert.ok(Array.isArray(occ.nearestOnet), `nearestOnet should be array on ${occ.code}`);
            assert.ok(occ.nearestOnet.length >= 1, `Should have at least 1 nearestOnet on ${occ.code}`);
        }
    });

    it('all RIASEC scores should be 0-100', () => {
        for (const occ of VN_OCCUPATION_SUPPLEMENT) {
            for (const d of DIMS) {
                const val = occ.riasec[d];
                assert.ok(typeof val === 'number', `${occ.code}.${d} should be number`);
                assert.ok(val >= 0 && val <= 100, `${occ.code}.${d}=${val} should be 0-100`);
            }
        }
    });

    it('all codes should be unique', () => {
        const codes = VN_OCCUPATION_SUPPLEMENT.map((o) => o.code);
        assert.strictEqual(new Set(codes).size, codes.length);
    });

    it('hollandCode should only contain RIASEC letters', () => {
        for (const occ of VN_OCCUPATION_SUPPLEMENT) {
            for (const ch of occ.hollandCode) {
                assert.ok(DIMS.includes(ch), `${occ.code} hollandCode has invalid letter '${ch}'`);
            }
        }
    });

    it('hollandCode top letters should match highest RIASEC dimensions', () => {
        for (const occ of VN_OCCUPATION_SUPPLEMENT) {
            const sorted = [...DIMS].sort((a, b) => occ.riasec[b] - occ.riasec[a]);
            const topFromCode = occ.hollandCode[0];
            assert.ok(
                sorted.slice(0, 3).includes(topFromCode),
                `${occ.code}: hollandCode first letter '${topFromCode}' not in top-3 dimensions (${sorted.slice(0, 3).join(',')})`,
            );
        }
    });

    it('nearestOnet codes should match XX-XXXX.XX format', () => {
        const pattern = /^\d{2}-\d{4}\.\d{2}$/;
        for (const occ of VN_OCCUPATION_SUPPLEMENT) {
            for (const code of occ.nearestOnet) {
                assert.ok(pattern.test(code), `${occ.code}: nearestOnet '${code}' has invalid format`);
            }
        }
    });
});

describe('EMBEDDING_DIMENSIONS', () => {
    it('should be a positive integer', () => {
        assert.ok(Number.isInteger(EMBEDDING_DIMENSIONS));
        assert.ok(EMBEDDING_DIMENSIONS > 0);
    });

    it('should be 512 (text-embedding-3-small reduced)', () => {
        assert.strictEqual(EMBEDDING_DIMENSIONS, 512);
    });
});

describe('buildOccupationText', () => {
    it('should combine title, description, skills, and knowledge', () => {
        const occ = {
            title: 'Software Developer',
            description: 'Develops applications',
            topSkillsJson: JSON.stringify([
                { name: 'Programming', value: 80 },
                { name: 'Testing', value: 70 },
            ]),
            topKnowledgeJson: JSON.stringify([
                { name: 'Computers', value: 90 },
            ]),
        };
        const text = buildOccupationText(occ);
        assert.ok(text.includes('Software Developer'));
        assert.ok(text.includes('Develops applications'));
        assert.ok(text.includes('Programming'));
        assert.ok(text.includes('Computers'));
    });

    it('should handle missing fields gracefully', () => {
        const text = buildOccupationText({ title: 'Test' });
        assert.ok(text.includes('Test'));
        assert.ok(typeof text === 'string');
    });

    it('should handle unparseable JSON', () => {
        const occ = {
            title: 'Test',
            topSkillsJson: 'not-json',
            topKnowledgeJson: 'not-json',
        };
        const text = buildOccupationText(occ);
        assert.ok(text.includes('Test'));
    });
});

describe('findRelatedOnetSemanticSearch – keyword fallback', () => {
    beforeEach(() => {
        clearEmbeddingCache();
    });

    it('should return an array', async () => {
        const results = await findRelatedOnetSemanticSearch({
            programName: 'Computer Science',
            courseList: ['Programming', 'Algorithms', 'Database'],
            limit: 5,
        });
        assert.ok(Array.isArray(results));
    });

    it('should return results with expected shape', async () => {
        const results = await findRelatedOnetSemanticSearch({
            programName: 'Nursing',
            courseList: ['Patient Care', 'Pharmacology', 'Anatomy'],
            limit: 3,
        });
        for (const r of results) {
            assert.ok(r.onetCode || r.title, 'Should have onetCode or title');
            assert.ok(typeof r.relevanceScore === 'number', 'Should have numeric relevanceScore');
            assert.ok(r.matchMethod, 'Should have matchMethod');
        }
    });

    it('should include matchMethod field', async () => {
        const results = await findRelatedOnetSemanticSearch({
            programName: 'Civil Engineering',
            courseList: ['Structural Engineering', 'Concrete Design'],
            limit: 3,
        });
        for (const r of results) {
            assert.ok(
                ['keyword', 'hybrid_semantic'].includes(r.matchMethod),
                `matchMethod should be keyword or hybrid_semantic, got: ${r.matchMethod}`,
            );
        }
    });

    it('should handle empty inputs gracefully', async () => {
        const results = await findRelatedOnetSemanticSearch({
            programName: '',
            courseList: [],
            limit: 5,
        });
        assert.ok(Array.isArray(results));
    });

    it('should respect limit parameter', async () => {
        const results = await findRelatedOnetSemanticSearch({
            programName: 'Computer Science and Engineering',
            courseList: ['Programming', 'Algorithms', 'Database', 'Networking', 'Operating Systems'],
            limit: 3,
        });
        assert.ok(results.length <= 3, `Expected <= 3, got ${results.length}`);
    });

    it('should handle existingOnetLinks for manual link priority', async () => {
        const results = await findRelatedOnetSemanticSearch({
            programName: 'Business Administration',
            courseList: ['Marketing', 'Finance', 'Management'],
            existingOnetLinks: [{ id: 999, occupationId: 999 }],
            limit: 5,
        });
        assert.ok(Array.isArray(results));
    });
});

describe('suggestOnetLinks', () => {
    beforeEach(() => {
        clearEmbeddingCache();
    });

    it('should return an array of suggestions', async () => {
        const results = await suggestOnetLinks({
            programId: 1,
            programName: 'Mechanical Engineering',
            courseList: ['Thermodynamics', 'Machine Design', 'Manufacturing'],
            limit: 3,
        });
        assert.ok(Array.isArray(results));
    });

    it('suggestions should have expected fields', async () => {
        const results = await suggestOnetLinks({
            programId: 1,
            programName: 'Psychology',
            courseList: ['Clinical Psychology', 'Counseling', 'Behavioral Science'],
            limit: 3,
        });
        for (const s of results) {
            assert.ok(s.programId === 1, 'Should include programId');
            assert.ok(s.onetCode, 'Should have onetCode');
            assert.ok(typeof s.relevance === 'number', 'Should have numeric relevance');
            assert.ok(s.relevance >= 1 && s.relevance <= 10, `Relevance should be 1-10, got ${s.relevance}`);
            assert.ok(typeof s.isPrimary === 'boolean', 'Should have boolean isPrimary');
            assert.ok(typeof s.confidence === 'number', 'Should have numeric confidence');
            assert.ok(s.note, 'Should have note');
            assert.ok(s.matchMethod, 'Should have matchMethod');
        }
    });

    it('first suggestion should be marked as primary', async () => {
        const results = await suggestOnetLinks({
            programId: 1,
            programName: 'Electrical Engineering',
            courseList: ['Circuit Design', 'Power Systems', 'Electronics'],
            limit: 3,
        });
        if (results.length > 0) {
            assert.strictEqual(results[0].isPrimary, true);
        }
    });

    it('should respect limit parameter', async () => {
        const results = await suggestOnetLinks({
            programId: 1,
            programName: 'Computer Science',
            courseList: ['Algorithms', 'Data Structures', 'Operating Systems'],
            limit: 2,
        });
        assert.ok(results.length <= 2, `Expected <= 2 suggestions, got ${results.length}`);
    });
});

describe('clearEmbeddingCache', () => {
    it('should not throw', () => {
        assert.doesNotThrow(() => clearEmbeddingCache());
    });

    it('should be callable multiple times', () => {
        clearEmbeddingCache();
        clearEmbeddingCache();
        clearEmbeddingCache();
    });
});
