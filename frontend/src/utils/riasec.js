
export const DIMENSION_LABELS = {
    R: 'Realistic',
    I: 'Investigative',
    A: 'Artistic',
    S: 'Social',
    E: 'Enterprising',
    C: 'Conventional',
};

export const DIMENSIONS = ['R', 'I', 'A', 'S', 'E', 'C'];

export const RIASEC_COLORS = {
    R: 'bg-red-100 text-red-700 border-red-200',
    I: 'bg-blue-100 text-blue-700 border-blue-200',
    A: 'bg-purple-100 text-purple-700 border-purple-200',
    S: 'bg-green-100 text-green-700 border-green-200',
    E: 'bg-amber-100 text-amber-700 border-amber-200',
    C: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function buildHollandCode(scores = {}) {
    return Object.entries(scores)
        .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
        .slice(0, 3)
        .map(([dimension]) => dimension)
        .join('');
}
