export function createClosedProgramWorkspace() {
    return {
        open: false,
        loading: false,
        program: null,
        onetRefreshNonce: 0,
        selectedProfileIndex: 0,
        editingScores: false,
        showRawResponse: false,
    };
}

export function createEmptyStudentReportModal() {
    return {
        open: false,
        loading: false,
        report: null,
    };
}
