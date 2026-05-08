const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { safeJsonParse } = require('../src/utils/http');

describe('keyCourses JSON serialization', () => {
    it('should serialize array of course names to JSON', () => {
        const courses = ['Lập trình C++', 'Cấu trúc dữ liệu', 'Mạng máy tính'];
        const json = JSON.stringify(courses);
        const parsed = JSON.parse(json);
        assert.deepStrictEqual(parsed, courses);
    });

    it('should handle Vietnamese characters correctly', () => {
        const courses = ['Trí tuệ nhân tạo', 'Cơ sở dữ liệu', 'Đồ họa máy tính'];
        const json = JSON.stringify(courses);
        const parsed = JSON.parse(json);
        assert.strictEqual(parsed[0], 'Trí tuệ nhân tạo');
        assert.strictEqual(parsed[1], 'Cơ sở dữ liệu');
        assert.strictEqual(parsed[2], 'Đồ họa máy tính');
    });

    it('should handle empty array', () => {
        const json = JSON.stringify([]);
        const parsed = JSON.parse(json);
        assert.deepStrictEqual(parsed, []);
    });

    it('should safeJsonParse null to empty array', () => {
        assert.deepStrictEqual(safeJsonParse(null, []), []);
    });

    it('should safeJsonParse undefined to empty array', () => {
        assert.deepStrictEqual(safeJsonParse(undefined, []), []);
    });

    it('should safeJsonParse valid JSON string', () => {
        const json = '["Lập trình C","Mạng máy tính"]';
        const result = safeJsonParse(json, []);
        assert.deepStrictEqual(result, ['Lập trình C', 'Mạng máy tính']);
    });

    it('should safeJsonParse invalid JSON to fallback', () => {
        assert.deepStrictEqual(safeJsonParse('not-json', []), []);
    });
});

describe('buildProgramCard keyCourses', () => {
    const { buildProgramCard } = require('../src/services/programs/programCatalogService');

    const baseProgramRow = {
        id: 'test-prog-1',
        code: 'TEST-IT',
        slug: 'test-it',
        name: 'Công nghệ Thông tin',
        degreeLevel: 'Bachelor',
        department: 'Khoa CNTT',
        focusArea: 'Computer Science',
        summary: 'Chương trình đào tạo CNTT',
        sourceUrl: 'https://example.edu.vn/cntt',
        durationYears: 4,
        status: 'ACTIVE',
        featured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        university: {
            id: 'u1',
            code: 'TEST-UNI',
            name: 'Đại học Test',
            shortName: 'DH Test',
            city: 'HCM',
            state: null,
            country: 'VN',
            website: 'https://example.edu.vn',
            overview: null,
            featured: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { programs: 1 },
        },
        curriculums: [],
        profiles: [],
        onetLinks: [],
        _count: { curriculums: 0, profiles: 0, analysisRuns: 0 },
    };

    it('should include keyCourses when keyCoursesJson is set', () => {
        const row = {
            ...baseProgramRow,
            keyCoursesJson: JSON.stringify(['Lập trình C++', 'Cấu trúc dữ liệu', 'Mạng máy tính']),
            courseSourceUrl: 'https://bku.edu.vn/ctdt/cntt',
        };
        const card = buildProgramCard(row);
        assert.deepStrictEqual(card.keyCourses, ['Lập trình C++', 'Cấu trúc dữ liệu', 'Mạng máy tính']);
        assert.strictEqual(card.courseSourceUrl, 'https://bku.edu.vn/ctdt/cntt');
    });

    it('should return empty array when keyCoursesJson is null', () => {
        const row = { ...baseProgramRow, keyCoursesJson: null, courseSourceUrl: null };
        const card = buildProgramCard(row);
        assert.deepStrictEqual(card.keyCourses, []);
        assert.strictEqual(card.courseSourceUrl, null);
    });

    it('should return empty array when keyCoursesJson is undefined', () => {
        const row = { ...baseProgramRow };
        const card = buildProgramCard(row);
        assert.deepStrictEqual(card.keyCourses, []);
    });

    it('should handle large course list (20+ courses)', () => {
        const courses = Array.from({ length: 25 }, (_, i) => `Môn học ${i + 1}`);
        const row = {
            ...baseProgramRow,
            keyCoursesJson: JSON.stringify(courses),
        };
        const card = buildProgramCard(row);
        assert.strictEqual(card.keyCourses.length, 25);
        assert.strictEqual(card.keyCourses[0], 'Môn học 1');
        assert.strictEqual(card.keyCourses[24], 'Môn học 25');
    });

    it('should preserve course order', () => {
        const courses = ['Toán cao cấp', 'Vật lý đại cương', 'Lập trình C'];
        const row = {
            ...baseProgramRow,
            keyCoursesJson: JSON.stringify(courses),
        };
        const card = buildProgramCard(row);
        assert.strictEqual(card.keyCourses[0], 'Toán cao cấp');
        assert.strictEqual(card.keyCourses[1], 'Vật lý đại cương');
        assert.strictEqual(card.keyCourses[2], 'Lập trình C');
    });

    it('should not affect other program card fields', () => {
        const row = {
            ...baseProgramRow,
            keyCoursesJson: JSON.stringify(['Course A']),
            courseSourceUrl: 'https://example.com',
        };
        const card = buildProgramCard(row);
        assert.strictEqual(card.id, 'test-prog-1');
        assert.strictEqual(card.name, 'Công nghệ Thông tin');
        assert.strictEqual(card.code, 'TEST-IT');
        assert.strictEqual(card.focusArea, 'Computer Science');
        assert.strictEqual(card.durationYears, 4);
        assert.ok(card.university);
        assert.strictEqual(card.university.name, 'Đại học Test');
    });
});

describe('Admin keyCourses input transform', () => {
    it('should transform multiline text to array', () => {
        const textInput = 'Lập trình C++\nCấu trúc dữ liệu\nMạng máy tính';
        const courses = textInput.split('\n').map((s) => s.trim()).filter(Boolean);
        assert.deepStrictEqual(courses, ['Lập trình C++', 'Cấu trúc dữ liệu', 'Mạng máy tính']);
    });

    it('should skip empty lines', () => {
        const textInput = 'Lập trình C++\n\n\nMạng máy tính\n';
        const courses = textInput.split('\n').map((s) => s.trim()).filter(Boolean);
        assert.deepStrictEqual(courses, ['Lập trình C++', 'Mạng máy tính']);
    });

    it('should trim whitespace', () => {
        const textInput = '  Lập trình C++  \n  Mạng máy tính  ';
        const courses = textInput.split('\n').map((s) => s.trim()).filter(Boolean);
        assert.deepStrictEqual(courses, ['Lập trình C++', 'Mạng máy tính']);
    });

    it('should handle tab-separated lines', () => {
        const textInput = 'CS101\tLập trình C++\nCS201\tCấu trúc dữ liệu';
        const courses = textInput.split('\n').map((s) => s.trim()).filter(Boolean);
        assert.strictEqual(courses.length, 2);
    });
});

describe('Full flow: keyCourses + O*NET derived profile', () => {
    const { buildProgramCard } = require('../src/services/programs/programCatalogService');

    it('should include keyCourses alongside O*NET derived RIASEC', () => {
        const row = {
            id: 'prog-cntt',
            code: 'BK-CNTT',
            slug: 'bk-cntt',
            name: 'Công nghệ Thông tin',
            degreeLevel: 'Bachelor',
            department: 'Khoa CNTT',
            focusArea: 'Computer Science',
            summary: 'CNTT tại ĐH Bách Khoa',
            sourceUrl: null,
            durationYears: 4,
            keyCoursesJson: JSON.stringify([
                'Lập trình C++',
                'Cấu trúc dữ liệu & Giải thuật',
                'Mạng máy tính',
                'Cơ sở dữ liệu',
                'Trí tuệ nhân tạo',
            ]),
            courseSourceUrl: 'https://bku.edu.vn/ctdt/cntt',
            status: 'ACTIVE',
            featured: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            university: {
                id: 'u-bk', code: 'BK-HCM', name: 'ĐH Bách Khoa HCM',
                shortName: 'BK HCM', city: 'HCM', state: null, country: 'VN',
                website: 'https://bku.edu.vn', overview: null, featured: true,
                createdAt: new Date(), updatedAt: new Date(), _count: { programs: 5 },
            },
            curriculums: [],
            profiles: [],
            onetLinks: [
                {
                    relevance: 8,
                    isPrimary: true,
                    occupation: {
                        onetCode: '15-1256.00',
                        title: 'Software Developers and Software Quality Assurance Analysts',
                        riasecScoresJson: JSON.stringify({ R: 2.5, I: 5.8, A: 3.2, S: 2.8, E: 3.5, C: 4.5 }),
                        topSkillsJson: JSON.stringify(['Programming', 'Critical Thinking', 'Complex Problem Solving']),
                        topKnowledgeJson: JSON.stringify(['Computers and Electronics', 'Mathematics']),
                        hollandCode: 'ICE',
                        jobOutlook: 'Bright',
                        brightOutlook: true,
                        educationLevel: "Bachelor's degree",
                        jobZone: 4,
                    },
                },
                {
                    relevance: 5,
                    isPrimary: false,
                    occupation: {
                        onetCode: '15-1243.01',
                        title: 'Data Mining Analysts',
                        riasecScoresJson: JSON.stringify({ R: 1.5, I: 6.2, A: 2.8, S: 2.2, E: 3.0, C: 5.0 }),
                        topSkillsJson: JSON.stringify(['Critical Thinking', 'Mathematics', 'Programming']),
                        topKnowledgeJson: JSON.stringify(['Mathematics', 'Computers and Electronics']),
                        hollandCode: 'ICE',
                        jobOutlook: 'Bright',
                        brightOutlook: true,
                        educationLevel: "Master's degree",
                        jobZone: 5,
                    },
                },
            ],
            _count: { curriculums: 0, profiles: 0, analysisRuns: 0 },
        };

        const card = buildProgramCard(row);

        assert.strictEqual(card.keyCourses.length, 5);
        assert.strictEqual(card.keyCourses[0], 'Lập trình C++');
        assert.strictEqual(card.keyCourses[4], 'Trí tuệ nhân tạo');
        assert.strictEqual(card.courseSourceUrl, 'https://bku.edu.vn/ctdt/cntt');

        assert.ok(card.latestProfile, 'Should have O*NET-derived profile');
        assert.strictEqual(card.latestProfile.sourceType, 'ONET_DERIVED');
        assert.ok(card.latestProfile.riasecScores.I > 50, 'I score should be high for software dev');
        assert.ok(typeof card.latestProfile.hollandCode === 'string');

        assert.strictEqual(card.careerOutcomes.length, 2);
        assert.strictEqual(card.careerOutcomes[0].onetCode, '15-1256.00');
        assert.strictEqual(card.careerOutcomes[0].isPrimary, true);

        assert.ok(card.keyCourses.length > 0 && card.latestProfile.riasecScores.R >= 0,
            'keyCourses and RIASEC should coexist');
    });

    it('should work without keyCourses (backward compat)', () => {
        const row = {
            id: 'prog-old',
            code: 'OLD-PROG',
            slug: 'old-prog',
            name: 'Legacy Program',
            degreeLevel: null,
            department: null,
            focusArea: null,
            summary: null,
            sourceUrl: null,
            durationYears: null,
            status: 'ACTIVE',
            featured: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            university: {
                id: 'u2', code: 'UNI2', name: 'Uni 2',
                shortName: 'U2', city: 'HN', state: null, country: 'VN',
                website: null, overview: null, featured: false,
                createdAt: new Date(), updatedAt: new Date(), _count: { programs: 1 },
            },
            curriculums: [],
            profiles: [],
            onetLinks: [],
            _count: { curriculums: 0, profiles: 0, analysisRuns: 0 },
        };

        const card = buildProgramCard(row);
        assert.deepStrictEqual(card.keyCourses, []);
        assert.strictEqual(card.courseSourceUrl, null);
        assert.strictEqual(card.name, 'Legacy Program');
    });
});
