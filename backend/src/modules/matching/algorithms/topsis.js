const {
    DIMENSIONS,
    clampScore,
    closenessScore,
} = require('../scoring/primitives');

function calculateTOPSIS(studentProfile, candidateProfiles) {
    if (!candidateProfiles.length) {
        return [];
    }

    const studentScores = studentProfile?.stableScores || {};

    if (candidateProfiles.length === 1) {
        const program = candidateProfiles[0];
        const programRiasec = program.riasecScores || {};
        const allCloseness = DIMENSIONS.map((dimension) =>
            closenessScore(Number(studentScores[dimension] || 0), Number(programRiasec[dimension] || 0)),
        );
        const avgCloseness = allCloseness.reduce((sum, value) => sum + value, 0) / (allCloseness.length || 1);
        return [
            {
                index: 0,
                dPlus: 0,
                dMinus: 0,
                closenessCoefficient: Math.round((avgCloseness / 100) * 10000) / 10000,
                score: clampScore(avgCloseness),
            },
        ];
    }

    const rawMatrix = candidateProfiles.map((program) => {
        const programRiasec = program.riasecScores || {};
        return DIMENSIONS.map((dimension) =>
            closenessScore(Number(studentScores[dimension] || 0), Number(programRiasec[dimension] || 0)),
        );
    });

    const numCols = DIMENSIONS.length;
    const numRows = rawMatrix.length;

    const columnNorms = [];
    for (let col = 0; col < numCols; col += 1) {
        let sumSquares = 0;
        for (let row = 0; row < numRows; row += 1) {
            sumSquares += rawMatrix[row][col] * rawMatrix[row][col];
        }
        columnNorms.push(Math.sqrt(sumSquares) || 1);
    }

    const normalised = rawMatrix.map((row) => row.map((value, col) => value / columnNorms[col]));

    const weight = 1 / numCols;
    const weighted = normalised.map((row) => row.map((value) => value * weight));

    const idealPositive = [];
    const idealNegative = [];
    for (let col = 0; col < numCols; col += 1) {
        let colMax = -Infinity;
        let colMin = Infinity;
        for (let row = 0; row < numRows; row += 1) {
            if (weighted[row][col] > colMax) colMax = weighted[row][col];
            if (weighted[row][col] < colMin) colMin = weighted[row][col];
        }
        idealPositive.push(colMax);
        idealNegative.push(colMin);
    }

    return weighted.map((row, index) => {
        let dPlus = 0;
        let dMinus = 0;
        for (let col = 0; col < numCols; col += 1) {
            dPlus += Math.pow(row[col] - idealPositive[col], 2);
            dMinus += Math.pow(row[col] - idealNegative[col], 2);
        }
        dPlus = Math.sqrt(dPlus);
        dMinus = Math.sqrt(dMinus);

        const closenessCoefficient = dPlus + dMinus > 0 ? dMinus / (dPlus + dMinus) : 0;

        return {
            index,
            dPlus: Math.round(dPlus * 10000) / 10000,
            dMinus: Math.round(dMinus * 10000) / 10000,
            closenessCoefficient: Math.round(closenessCoefficient * 10000) / 10000,
            score: clampScore(closenessCoefficient * 100),
        };
    });
}

module.exports = { calculateTOPSIS };
