export function formatAssessmentContext(row) {
    return [
        row.gradeLevel ? `Grade ${row.gradeLevel}` : null,
        row.academicYear || null,
        row.semester || null,
        row.classCode || null,
    ]
        .filter(Boolean)
        .join(' • ');
}
