// Ground-truth ranking is built by a different scoring rule than the runtime
// engine, so the benchmark measures agreement between two methods, not itself.
const path = require('path');

const goldDataset = require(
    path.resolve(__dirname, '../../../data/gold/goldProgramDataset.v2.json'),
);

const BENCHMARK_PROGRAMS = {};
const ALL_PROGRAMS = goldDataset.map((p) => {
    const entry = {
        id: p.code,
        name: p.name,
        focusArea: p.focusArea,
        riasecScores: p.profile.riasecScores,
        confidenceScore: p.profile.confidenceScore,
    };
    BENCHMARK_PROGRAMS[p.code] = entry;
    return entry;
});

const BENCHMARK_CASES = [
        {
                "id": "TC-01",
                "label": "IRC: Strong CS/Software student",
                "studentProfile": {
                        "stableScores": {
                                "R": 78,
                                "I": 88,
                                "A": 30,
                                "S": 40,
                                "E": 25,
                                "C": 72
                        },
                        "growth": [
                                {
                                        "dimension": "I",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "IRC"
                },
                "groundTruth": [
                        "HCMIU-BT",
                        "HCMIU-CHEMBIO",
                        "HCMIU-ETE",
                        "HCMUS-ET"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-BT(cos=0.975,h=0.15), HCMIU-CHEMBIO(cos=0.973,h=0.15), HCMIU-ETE(cos=0.972,h=0.15), HCMUS-ET(cos=0.970,h=0.15)"
        },
        {
                "id": "TC-02",
                "label": "IAC: AI/Data Science researcher",
                "studentProfile": {
                        "stableScores": {
                                "R": 55,
                                "I": 92,
                                "A": 55,
                                "S": 42,
                                "E": 30,
                                "C": 65
                        },
                        "growth": [
                                {
                                        "dimension": "I",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "ICR"
                },
                "groundTruth": [
                        "CTU-SE",
                        "TDTU-SE",
                        "HCMIU-BE",
                        "VGU-EEIT"
                ],
                "reasoning": "IndepGT(cosine+holland): CTU-SE(cos=0.973,h=0.15), TDTU-SE(cos=0.973,h=0.15), HCMIU-BE(cos=0.954,h=0.15), VGU-EEIT(cos=0.940,h=0.15)"
        },
        {
                "id": "TC-03",
                "label": "ICR: Systems/Network engineer",
                "studentProfile": {
                        "stableScores": {
                                "R": 80,
                                "I": 75,
                                "A": 20,
                                "S": 30,
                                "E": 35,
                                "C": 85
                        },
                        "growth": [
                                {
                                        "dimension": "C",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "CRI"
                },
                "groundTruth": [
                        "HCMIU-FT",
                        "HCMIU-ETE",
                        "HCMUT-CE",
                        "HCMIU-CVE"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-FT(cos=0.991,h=0.15), HCMIU-ETE(cos=0.979,h=0.15), HCMUT-CE(cos=0.975,h=0.15), HCMIU-CVE(cos=0.974,h=0.15)"
        },
        {
                "id": "TC-04",
                "label": "ICA: Data Science + creativity",
                "studentProfile": {
                        "stableScores": {
                                "R": 40,
                                "I": 85,
                                "A": 60,
                                "S": 35,
                                "E": 25,
                                "C": 78
                        },
                        "growth": [
                                {
                                        "dimension": "I",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "ICA"
                },
                "groundTruth": [
                        "CTU-SE",
                        "TDTU-SE",
                        "HCMUS-AI",
                        "UAH-ARCH"
                ],
                "reasoning": "IndepGT(cosine+holland): CTU-SE(cos=0.980,h=0.10), TDTU-SE(cos=0.980,h=0.10), HCMUS-AI(cos=0.948,h=0.10), UAH-ARCH(cos=0.944,h=0.10)"
        },
        {
                "id": "TC-05",
                "label": "RIC: Hardware/CE focused",
                "studentProfile": {
                        "stableScores": {
                                "R": 90,
                                "I": 70,
                                "A": 15,
                                "S": 25,
                                "E": 30,
                                "C": 65
                        },
                        "growth": [
                                {
                                        "dimension": "R",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "RIC"
                },
                "groundTruth": [
                        "HCMUT-TE",
                        "HCMUT-EE",
                        "HCMIU-CVE",
                        "HCMUT"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMUT-TE(cos=0.990,h=0.15), HCMUT-EE(cos=0.990,h=0.15), HCMIU-CVE(cos=0.990,h=0.15), HCMUT(cos=0.985,h=0.15)"
        },
        {
                "id": "TC-06",
                "label": "CIR: Systematic programmer",
                "studentProfile": {
                        "stableScores": {
                                "R": 65,
                                "I": 80,
                                "A": 25,
                                "S": 30,
                                "E": 20,
                                "C": 90
                        },
                        "growth": [
                                {
                                        "dimension": "C",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "CIR"
                },
                "groundTruth": [
                        "HCMUT-CE",
                        "HCMIU-ETE",
                        "HCMUS-ET",
                        "HCMIU-FT"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMUT-CE(cos=0.982,h=0.15), HCMIU-ETE(cos=0.982,h=0.15), HCMUS-ET(cos=0.981,h=0.15), HCMIU-FT(cos=0.979,h=0.15)"
        },
        {
                "id": "TC-07",
                "label": "IRE: Tech lead / PM oriented",
                "studentProfile": {
                        "stableScores": {
                                "R": 60,
                                "I": 82,
                                "A": 30,
                                "S": 45,
                                "E": 70,
                                "C": 55
                        },
                        "growth": [
                                {
                                        "dimension": "I",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "IER"
                },
                "groundTruth": [
                        "UAH-LA",
                        "HCMIU-BE",
                        "UAH-ARCH",
                        "HCMIU-ENV"
                ],
                "reasoning": "IndepGT(cosine+holland): UAH-LA(cos=0.965,h=0.15), HCMIU-BE(cos=0.976,h=0.10), UAH-ARCH(cos=0.958,h=0.10), HCMIU-ENV(cos=0.948,h=0.10)"
        },
        {
                "id": "TC-08",
                "label": "ISC: InfoSec analyst",
                "studentProfile": {
                        "stableScores": {
                                "R": 55,
                                "I": 78,
                                "A": 20,
                                "S": 60,
                                "E": 40,
                                "C": 80
                        },
                        "growth": [
                                {
                                        "dimension": "C",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "CIS"
                },
                "groundTruth": [
                        "HCMIU-BE",
                        "UNCC-CPE-ML",
                        "HCMUS-NET",
                        "UIT-NET"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-BE(cos=0.950,h=0.10), UNCC-CPE-ML(cos=0.946,h=0.10), HCMUS-NET(cos=0.942,h=0.10), UIT-NET(cos=0.942,h=0.10)"
        },
        {
                "id": "TC-09",
                "label": "IRA: Research scientist",
                "studentProfile": {
                        "stableScores": {
                                "R": 70,
                                "I": 95,
                                "A": 45,
                                "S": 30,
                                "E": 20,
                                "C": 60
                        },
                        "growth": [
                                {
                                        "dimension": "I",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "IRC"
                },
                "groundTruth": [
                        "HCMIU-BT",
                        "HCMIU-CHEMBIO",
                        "CTU-SE",
                        "TDTU-SE"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-BT(cos=0.976,h=0.15), HCMIU-CHEMBIO(cos=0.975,h=0.15), CTU-SE(cos=0.969,h=0.15), TDTU-SE(cos=0.969,h=0.15)"
        },
        {
                "id": "TC-10",
                "label": "CIA: Info Systems analyst",
                "studentProfile": {
                        "stableScores": {
                                "R": 35,
                                "I": 75,
                                "A": 50,
                                "S": 50,
                                "E": 55,
                                "C": 80
                        },
                        "growth": [
                                {
                                        "dimension": "C",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "CIE"
                },
                "groundTruth": [
                        "UAH-ARCH",
                        "TDTU-SOC",
                        "TDTU-LAW",
                        "HCMIU-ECON"
                ],
                "reasoning": "IndepGT(cosine+holland): UAH-ARCH(cos=0.967,h=0.15), TDTU-SOC(cos=0.944,h=0.15), TDTU-LAW(cos=0.935,h=0.15), HCMIU-ECON(cos=0.931,h=0.15)"
        },
        {
                "id": "TC-11",
                "label": "RCI: Network admin",
                "studentProfile": {
                        "stableScores": {
                                "R": 75,
                                "I": 60,
                                "A": 15,
                                "S": 35,
                                "E": 40,
                                "C": 88
                        },
                        "growth": [
                                {
                                        "dimension": "C",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "CRI"
                },
                "groundTruth": [
                        "HCMIU-FT",
                        "HCMUS-NET",
                        "UIT-NET",
                        "HCMIU-CVE"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-FT(cos=0.985,h=0.15), HCMUS-NET(cos=0.969,h=0.15), UIT-NET(cos=0.969,h=0.15), HCMIU-CVE(cos=0.964,h=0.15)"
        },
        {
                "id": "TC-12",
                "label": "ICE: Business IT consultant",
                "studentProfile": {
                        "stableScores": {
                                "R": 40,
                                "I": 70,
                                "A": 35,
                                "S": 55,
                                "E": 75,
                                "C": 80
                        },
                        "growth": [
                                {
                                        "dimension": "C",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "CEI"
                },
                "groundTruth": [
                        "UEL-ITL",
                        "UAH-ARCH",
                        "TDTU-LAW",
                        "HCMIU-ECON"
                ],
                "reasoning": "IndepGT(cosine+holland): UEL-ITL(cos=0.965,h=0.15), UAH-ARCH(cos=0.962,h=0.15), TDTU-LAW(cos=0.955,h=0.15), HCMIU-ECON(cos=0.939,h=0.15)"
        },
        {
                "id": "TC-13",
                "label": "IRS: Technical trainer",
                "studentProfile": {
                        "stableScores": {
                                "R": 65,
                                "I": 80,
                                "A": 30,
                                "S": 70,
                                "E": 35,
                                "C": 55
                        },
                        "growth": [
                                {
                                        "dimension": "I",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "ISR"
                },
                "groundTruth": [
                        "HCMIU-BE",
                        "UAH-LA",
                        "HCMIU-BT",
                        "HCMIU-CHEMBIO"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-BE(cos=0.952,h=0.10), UAH-LA(cos=0.920,h=0.10), HCMIU-BT(cos=0.908,h=0.10), HCMIU-CHEMBIO(cos=0.908,h=0.10)"
        },
        {
                "id": "TC-14",
                "label": "AIC: Creative developer (UX)",
                "studentProfile": {
                        "stableScores": {
                                "R": 45,
                                "I": 65,
                                "A": 80,
                                "S": 50,
                                "E": 40,
                                "C": 55
                        },
                        "growth": [
                                {
                                        "dimension": "A",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "AIC"
                },
                "groundTruth": [
                        "TDTU-GD",
                        "UAH-ARCH",
                        "HCMUSSH-MMP",
                        "CTU-SE"
                ],
                "reasoning": "IndepGT(cosine+holland): TDTU-GD(cos=0.940,h=0.10), UAH-ARCH(cos=0.915,h=0.10), HCMUSSH-MMP(cos=0.904,h=0.10), CTU-SE(cos=0.889,h=0.10)"
        },
        {
                "id": "TC-15",
                "label": "RIE: Engineering manager",
                "studentProfile": {
                        "stableScores": {
                                "R": 82,
                                "I": 72,
                                "A": 20,
                                "S": 35,
                                "E": 68,
                                "C": 60
                        },
                        "growth": [
                                {
                                        "dimension": "R",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "RIE"
                },
                "groundTruth": [
                        "UAH-LA",
                        "HCMIU-ENV",
                        "HCMIU-BE",
                        "HCMIU-CVE"
                ],
                "reasoning": "IndepGT(cosine+holland): UAH-LA(cos=0.983,h=0.15), HCMIU-ENV(cos=0.967,h=0.10), HCMIU-BE(cos=0.964,h=0.10), HCMIU-CVE(cos=0.959,h=0.10)"
        },
        {
                "id": "TC-16",
                "label": "ICR: Balanced CS student",
                "studentProfile": {
                        "stableScores": {
                                "R": 60,
                                "I": 75,
                                "A": 35,
                                "S": 40,
                                "E": 35,
                                "C": 70
                        },
                        "growth": [
                                {
                                        "dimension": "I",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "ICR"
                },
                "groundTruth": [
                        "CTU-SE",
                        "TDTU-SE",
                        "HCMIU-BE",
                        "VGU-EEIT"
                ],
                "reasoning": "IndepGT(cosine+holland): CTU-SE(cos=0.966,h=0.15), TDTU-SE(cos=0.966,h=0.15), HCMIU-BE(cos=0.966,h=0.15), VGU-EEIT(cos=0.958,h=0.15)"
        },
        {
                "id": "TC-17",
                "label": "ICS: Data + Social",
                "studentProfile": {
                        "stableScores": {
                                "R": 45,
                                "I": 85,
                                "A": 30,
                                "S": 65,
                                "E": 30,
                                "C": 75
                        },
                        "growth": [
                                {
                                        "dimension": "I",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "ICS"
                },
                "groundTruth": [
                        "HCMUSSH-PSY",
                        "HCMUSSH-EDU",
                        "CTU-SE",
                        "TDTU-SE"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMUSSH-PSY(cos=0.913,h=0.15), HCMUSSH-EDU(cos=0.903,h=0.15), CTU-SE(cos=0.946,h=0.10), TDTU-SE(cos=0.946,h=0.10)"
        },
        {
                "id": "TC-18",
                "label": "RCA: Embedded systems",
                "studentProfile": {
                        "stableScores": {
                                "R": 88,
                                "I": 65,
                                "A": 25,
                                "S": 20,
                                "E": 25,
                                "C": 75
                        },
                        "growth": [
                                {
                                        "dimension": "R",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "RCI"
                },
                "groundTruth": [
                        "HCMIU-CVE",
                        "HCMIU-FT",
                        "HCMUT-TE",
                        "HCMUT-EE"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-CVE(cos=0.987,h=0.15), HCMIU-FT(cos=0.982,h=0.15), HCMUT-TE(cos=0.981,h=0.15), HCMUT-EE(cos=0.981,h=0.15)"
        },
        {
                "id": "TC-19",
                "label": "IRC: All-rounder CS grad",
                "studentProfile": {
                        "stableScores": {
                                "R": 70,
                                "I": 80,
                                "A": 40,
                                "S": 45,
                                "E": 45,
                                "C": 65
                        },
                        "growth": [
                                {
                                        "dimension": "I",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "IRC"
                },
                "groundTruth": [
                        "HCMIU-BE",
                        "HCMIU-ENV",
                        "CTU-SE",
                        "TDTU-SE"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-BE(cos=0.973,h=0.15), HCMIU-ENV(cos=0.955,h=0.15), CTU-SE(cos=0.946,h=0.15), TDTU-SE(cos=0.946,h=0.15)"
        },
        {
                "id": "TC-20",
                "label": "CIE: Business analytics",
                "studentProfile": {
                        "stableScores": {
                                "R": 30,
                                "I": 78,
                                "A": 28,
                                "S": 42,
                                "E": 65,
                                "C": 88
                        },
                        "growth": [
                                {
                                        "dimension": "C",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "CIE"
                },
                "groundTruth": [
                        "TDTU-LAW",
                        "HCMIU-ECON",
                        "UEL-E",
                        "HCMUS-IS"
                ],
                "reasoning": "IndepGT(cosine+holland): TDTU-LAW(cos=0.976,h=0.15), HCMIU-ECON(cos=0.976,h=0.15), UEL-E(cos=0.973,h=0.15), HCMUS-IS(cos=0.965,h=0.15)"
        },
        {
                "id": "TC-21",
                "label": "ESC: Business management student",
                "studentProfile": {
                        "stableScores": {
                                "R": 15,
                                "I": 30,
                                "A": 20,
                                "S": 45,
                                "E": 90,
                                "C": 70
                        },
                        "growth": [
                                {
                                        "dimension": "E",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "ESC"
                },
                "groundTruth": [
                        "TDTU-TT",
                        "HCMUSSH-TRM",
                        "TDTU-SBEM",
                        "TDTU-LR"
                ],
                "reasoning": "IndepGT(cosine+holland): TDTU-TT(cos=0.999,h=0.15), HCMUSSH-TRM(cos=0.996,h=0.15), TDTU-SBEM(cos=0.995,h=0.15), TDTU-LR(cos=0.993,h=0.15)"
        },
        {
                "id": "TC-22",
                "label": "CEI: Finance/accounting student",
                "studentProfile": {
                        "stableScores": {
                                "R": 10,
                                "I": 50,
                                "A": 10,
                                "S": 20,
                                "E": 60,
                                "C": 85
                        },
                        "growth": [
                                {
                                        "dimension": "C",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "CEI"
                },
                "groundTruth": [
                        "HCMIU-FB",
                        "TDTU-LAW",
                        "UEL-A",
                        "HCMIU-ACC"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-FB(cos=0.996,h=0.15), TDTU-LAW(cos=0.992,h=0.15), UEL-A(cos=0.990,h=0.15), HCMIU-ACC(cos=0.982,h=0.15)"
        },
        {
                "id": "TC-23",
                "label": "IRA: Biotech researcher student",
                "studentProfile": {
                        "stableScores": {
                                "R": 65,
                                "I": 95,
                                "A": 25,
                                "S": 30,
                                "E": 15,
                                "C": 40
                        },
                        "growth": [
                                {
                                        "dimension": "I",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "IRA"
                },
                "groundTruth": [
                        "HCMIU-CHEMBIO",
                        "HCMIU-BT",
                        "HCMIU-BE",
                        "HCMUT-MSE"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-CHEMBIO(cos=0.988,h=0.15), HCMIU-BT(cos=0.986,h=0.15), HCMIU-BE(cos=0.969,h=0.15), HCMUT-MSE(cos=0.969,h=0.15)"
        },
        {
                "id": "TC-24",
                "label": "RCI: Industrial engineering student",
                "studentProfile": {
                        "stableScores": {
                                "R": 70,
                                "I": 60,
                                "A": 15,
                                "S": 10,
                                "E": 40,
                                "C": 75
                        },
                        "growth": [
                                {
                                        "dimension": "R",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "RCI"
                },
                "groundTruth": [
                        "HCMIU-FT",
                        "HCMIU-CVE",
                        "HCMIU-ETE",
                        "HCMUS-NET"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-FT(cos=0.994,h=0.15), HCMIU-CVE(cos=0.985,h=0.15), HCMIU-ETE(cos=0.971,h=0.15), HCMUS-NET(cos=0.969,h=0.15)"
        },
        {
                "id": "TC-25",
                "label": "ECR: Logistics/supply chain student",
                "studentProfile": {
                        "stableScores": {
                                "R": 35,
                                "I": 35,
                                "A": 5,
                                "S": 25,
                                "E": 80,
                                "C": 80
                        },
                        "growth": [
                                {
                                        "dimension": "E",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "ECR"
                },
                "groundTruth": [
                        "HCMUT-IM",
                        "HCMUT-LS",
                        "UEL-IB",
                        "HCMIU-LSCM2"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMUT-IM(cos=0.985,h=0.15), HCMUT-LS(cos=0.990,h=0.10), UEL-IB(cos=0.989,h=0.10), HCMIU-LSCM2(cos=0.989,h=0.10)"
        },
        {
                "id": "TC-26",
                "label": "ICE: Data science cross-domain student",
                "studentProfile": {
                        "stableScores": {
                                "R": 20,
                                "I": 88,
                                "A": 15,
                                "S": 12,
                                "E": 25,
                                "C": 80
                        },
                        "growth": [
                                {
                                        "dimension": "I",
                                        "deltaFromPrevious": 3,
                                        "deltaFromBaseline": 6
                                }
                        ],
                        "confidenceScore": 75,
                        "latestHollandCode": "ICE"
                },
                "groundTruth": [
                        "HCMIU-STAT",
                        "HCMIU-AM",
                        "UNCC-DS",
                        "UIT-IS-VN"
                ],
                "reasoning": "IndepGT(cosine+holland): HCMIU-STAT(cos=0.998,h=0.15), HCMIU-AM(cos=0.993,h=0.15), UNCC-DS(cos=0.991,h=0.15), UIT-IS-VN(cos=0.989,h=0.15)"
        }
];

module.exports = { BENCHMARK_PROGRAMS, ALL_PROGRAMS, BENCHMARK_CASES };
