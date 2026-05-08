const { fitLevelLabel } = require('./constants');
const { buildSpecializationMeta } = require('./specializationTagService');
const { buildCareerDifferentiation } = require('./careerPathwayService');

const RIASEC_IMPROVEMENT_TIPS = {
    R: {
        label: 'Realistic',
        tips: [
            'Tham gia các dự án thực hành: lắp ráp phần cứng, sửa chữa thiết bị, làm mô hình',
            'Học các kỹ năng kỹ thuật: lập trình Arduino/Raspberry Pi, in 3D, CAD/CAM',
            'Tham gia câu lạc bộ robotics, IoT, hoặc workshop cơ khí',
            'Thực tập tại xưởng sản xuất, phòng lab kỹ thuật, hoặc công trình xây dựng',
        ],
    },
    I: {
        label: 'Investigative',
        tips: [
            'Đọc bài nghiên cứu khoa học, paper trên Google Scholar về lĩnh vực quan tâm',
            'Tham gia các cuộc thi nghiên cứu khoa học sinh viên hoặc hackathon',
            'Luyện tư duy phân tích: giải toán logic, puzzle, competitive programming',
            'Tham gia lab nghiên cứu, viết báo cáo khoa học hoặc blog chia sẻ kiến thức',
        ],
    },
    A: {
        label: 'Artistic',
        tips: [
            'Học thiết kế đồ họa (Figma, Canva), chỉnh sửa video, hoặc nhiếp ảnh',
            'Tham gia câu lạc bộ sáng tạo: viết lách, vẽ, âm nhạc, kịch nghệ',
            'Thử sức với UI/UX design, content creation, hoặc digital art',
            'Đọc sách về tư duy sáng tạo: Design Thinking, Creative Confidence',
        ],
    },
    S: {
        label: 'Social',
        tips: [
            'Tham gia hoạt động tình nguyện, mentoring, hoặc dạy kèm',
            'Rèn kỹ năng giao tiếp: thuyết trình, tranh biện, làm việc nhóm',
            'Tham gia câu lạc bộ sinh viên, đoàn hội, hoặc tổ chức sự kiện',
            'Học kỹ năng lắng nghe tích cực, coaching, hoặc tư vấn học đường',
        ],
    },
    E: {
        label: 'Enterprising',
        tips: [
            'Tham gia cuộc thi khởi nghiệp, startup weekend, hoặc business case competition',
            'Học kỹ năng lãnh đạo: quản lý dự án, ra quyết định, đàm phán',
            'Nhận vai trò trưởng nhóm trong các project môn học',
            'Đọc sách về kinh doanh và lãnh đạo: Lean Startup, 7 Habits',
        ],
    },
    C: {
        label: 'Conventional',
        tips: [
            'Rèn kỹ năng tổ chức: lập kế hoạch, quản lý thời gian, sắp xếp tài liệu',
            'Học Excel nâng cao, SQL, hoặc các công cụ phân tích dữ liệu',
            'Tham gia công việc hành chính, kế toán, hoặc quản lý sự kiện',
            'Luyện tập tỉ mỉ: kiểm tra code review, proofread tài liệu, QA testing',
        ],
    },
};

function formatList(items = []) {
    const labels = items.map((item) => item.label).filter(Boolean);
    if (labels.length === 0) {
        return 'your overall profile';
    }
    if (labels.length === 1) {
        return labels[0];
    }
    if (labels.length === 2) {
        return `${labels[0]} and ${labels[1]}`;
    }
    return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function buildMatchExplanation({ studentProfile, programCard, scoring, allResults, rank }) {
    const strengths = scoring.strengths.slice(0, 3);
    const gaps = scoring.gaps.slice(0, 3);
    const strongestDimension = studentProfile?.strongestDimension || 'I';
    const weakestDimension = studentProfile?.weakestDimension || 'C';
    const growthSignals = (scoring.breakdown.growth || [])
        .filter((entry) => entry.deltaFromPrevious > 0 || entry.deltaFromBaseline > 0)
        .slice(0, 2);
    const hollandOverlap = scoring.diagnostics?.holland?.overlap || [];
    const criticalGaps = scoring.diagnostics?.thresholdPenalty?.criticalGaps || [];

    const headline = `${fitLevelLabel(scoring.fitLevel)} for ${programCard.name}`;
    const summary = `This program aligns most strongly with ${formatList(strengths)} in your current stable profile.`;
    const whyItFits = `${programCard.name} at ${programCard.university?.shortName || programCard.university?.name || 'this university'} rewards ${formatList(
        strengths,
    )}, which are already among your better-aligned dimensions and skills.${hollandOverlap.length ? ` Your Holland overlap (${hollandOverlap.join(', ')}) also supports this recommendation.` : ''}`;
    const growthNarrative = growthSignals.length
        ? `Your recent growth in ${formatList(growthSignals)} improves readiness for this program.`
        : `Your profile is stable enough to compare against this program, but recent growth has not yet shifted the recommendation strongly.`;
    const caution = criticalGaps.length
        ? `This program has some stronger thresholds around ${formatList(criticalGaps)}. Improving them would raise your readiness score faster.`
        : gaps.length
        ? `You would strengthen this match further by developing ${formatList(gaps)}.`
        : `There are no major gaps in the current profile snapshot.`;

    const careerOutcomes = (programCard.careerOutcomes || []).filter((c) => c.title);
    const careerNarrative = careerOutcomes.length
        ? `Graduates of ${programCard.name} typically pursue careers such as ${careerOutcomes.map((c) => c.title).join(', ')}.`
        : '';

    const specMeta = buildSpecializationMeta(programCard);

    const careerDiff = buildCareerDifferentiation(
        programCard,
        allResults || [],
        rank || 0,
    );

    const improvementGuidance = gaps
        .filter((g) => g.key && RIASEC_IMPROVEMENT_TIPS[g.key])
        .slice(0, 3)
        .map((g) => ({
            dimension: g.key,
            label: RIASEC_IMPROVEMENT_TIPS[g.key].label,
            studentScore: Math.round(Number(g.student ?? 0)),
            targetScore: Math.round(Number(g.target ?? 0)),
            gap: Math.round(Math.abs(Number(g.target ?? 0) - Number(g.student ?? 0))),
            tips: RIASEC_IMPROVEMENT_TIPS[g.key].tips,
        }));

    const DIMS = ['R', 'I', 'A', 'S', 'E', 'C'];
    const DIM_LABELS = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' };
    const studentScores = studentProfile?.stableScores || studentProfile?.latestScores || {};
    const programScores = programCard?.latestProfile?.riasecScores || {};
    const riasecComparison = DIMS.map((dim) => ({
        dimension: dim,
        label: DIM_LABELS[dim],
        student: Math.round(Number(studentScores[dim] ?? 0)),
        program: Math.round(Number(programScores[dim] ?? 0)),
    }));

    return {
        headline,
        summary,
        whyItFits,
        growthNarrative,
        caution,
        careerNarrative,
        fitLevelLabel: fitLevelLabel(scoring.fitLevel),
        strongestStudentDimension: strongestDimension,
        weakestStudentDimension: weakestDimension,
        riasecComparison,
        specializationTags: specMeta.specializationTags,
        learningOrientation: specMeta.learningOrientation,
        primaryCareer: careerDiff.careerSignature.primaryCareer,
        careerPathways: careerDiff.careerSignature.careerPathways,
        careerDifferentiation: careerDiff.differentiation,
        comparedTo: careerDiff.comparedTo,
        improvementGuidance,
    };
}

module.exports = {
    buildMatchExplanation,
    fitLevelLabel,
};
