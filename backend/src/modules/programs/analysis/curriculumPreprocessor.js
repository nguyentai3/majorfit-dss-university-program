function preprocessCurriculum(curriculumText, courseList = [], objectives = []) {
    const parts = [];
    if (curriculumText) parts.push(curriculumText);
    if (courseList.length > 0) {
        const courseNames = courseList.map(c =>
            typeof c === 'string' ? c : (c.name || c.courseName || c.title || '')
        ).filter(Boolean);
        parts.push('Courses: ' + courseNames.join(', '));
    }
    if (objectives.length > 0) {
        parts.push('Objectives: ' + objectives.join('; '));
    }
    const combinedText = parts.join('\n\n');

    let courseCount = courseList.length;
    if (courseCount === 0 && curriculumText) {
        const lines = curriculumText.split('\n').filter(l => l.trim().length > 5);
        courseCount = Math.min(lines.length, 100);
    }

    let dataQualityLevel;
    if (courseCount >= 20 && objectives.length > 0) {
        dataQualityLevel = 'GOOD';
    } else if (courseCount >= 10) {
        dataQualityLevel = 'FAIR';
    } else {
        dataQualityLevel = 'POOR';
    }

    return {
        combinedText,
        courseCount,
        quality: { courseCount, dataQualityLevel },
    };
}

module.exports = { preprocessCurriculum };
