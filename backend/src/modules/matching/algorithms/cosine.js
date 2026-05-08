const {
    clampScore,
    buildCombinedVector,
    dotProduct,
    vectorMagnitude,
} = require('../scoring/primitives');

function calculateCosineSimilarity(studentProfile, programProfile) {
    const studentVec = buildCombinedVector(studentProfile?.stableScores || {});
    const programVec = buildCombinedVector(programProfile?.riasecScores || {});

    const magA = vectorMagnitude(studentVec);
    const magB = vectorMagnitude(programVec);

    // Empty vector → return 0 instead of dividing by zero.
    if (magA === 0 || magB === 0) {
        return { score: 0, rawCosine: 0 };
    }

    const rawCosine = dotProduct(studentVec, programVec) / (magA * magB);
    return {
        score: clampScore(rawCosine * 100),
        rawCosine: Math.round(rawCosine * 10000) / 10000,
    };
}

module.exports = { calculateCosineSimilarity };
