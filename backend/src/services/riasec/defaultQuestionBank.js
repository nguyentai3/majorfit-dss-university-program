const RIASEC_SCALE_OPTIONS = [
    { value: 1, code: 'A', label: 'Strongly Dislike / Strongly Disagree' },
    { value: 2, code: 'B', label: 'Dislike / Disagree' },
    { value: 3, code: 'C', label: 'Neutral / No Opinion' },
    { value: 4, code: 'D', label: 'Like / Agree' },
    { value: 5, code: 'E', label: 'Strongly Like / Strongly Agree' },
];


const IIP_RIASEC_QUESTIONS = [
    { code: 'R1', dimension: 'R', order: 1, prompt: 'Test the quality of parts before shipment' },
    { code: 'R2', dimension: 'R', order: 2, prompt: 'Lay brick or tile' },
    { code: 'R3', dimension: 'R', order: 3, prompt: 'Work on an offshore oil-drilling rig' },
    { code: 'R4', dimension: 'R', order: 4, prompt: 'Assemble electronic parts' },
    { code: 'R5', dimension: 'R', order: 5, prompt: 'Operate a grinding machine in a factory' },
    { code: 'R6', dimension: 'R', order: 6, prompt: 'Fix a broken faucet' },
    { code: 'R7', dimension: 'R', order: 7, prompt: 'Assemble products in a factory' },
    { code: 'R8', dimension: 'R', order: 8, prompt: 'Install flooring in houses' },

    { code: 'I1', dimension: 'I', order: 9,  prompt: 'Study the structure of the human body' },
    { code: 'I2', dimension: 'I', order: 10, prompt: 'Study animal behavior' },
    { code: 'I3', dimension: 'I', order: 11, prompt: 'Do research on plants or animals' },
    { code: 'I4', dimension: 'I', order: 12, prompt: 'Develop a new medical treatment or procedure' },
    { code: 'I5', dimension: 'I', order: 13, prompt: 'Conduct biological research' },
    { code: 'I6', dimension: 'I', order: 14, prompt: 'Study whales and other types of marine life' },
    { code: 'I7', dimension: 'I', order: 15, prompt: 'Work in a biology lab' },
    { code: 'I8', dimension: 'I', order: 16, prompt: 'Make a map of the bottom of an ocean' },

    { code: 'A1', dimension: 'A', order: 17, prompt: 'Conduct a musical choir' },
    { code: 'A2', dimension: 'A', order: 18, prompt: 'Direct a play' },
    { code: 'A3', dimension: 'A', order: 19, prompt: 'Design artwork for magazines' },
    { code: 'A4', dimension: 'A', order: 20, prompt: 'Write a song' },
    { code: 'A5', dimension: 'A', order: 21, prompt: 'Write books or plays' },
    { code: 'A6', dimension: 'A', order: 22, prompt: 'Play a musical instrument' },
    { code: 'A7', dimension: 'A', order: 23, prompt: 'Perform stunts for a movie or television show' },
    { code: 'A8', dimension: 'A', order: 24, prompt: 'Design sets for plays' },

    { code: 'S1', dimension: 'S', order: 25, prompt: 'Give career guidance to people' },
    { code: 'S2', dimension: 'S', order: 26, prompt: 'Do volunteer work at a non-profit organization' },
    { code: 'S3', dimension: 'S', order: 27, prompt: 'Help people who have problems with drugs or alcohol' },
    { code: 'S4', dimension: 'S', order: 28, prompt: 'Teach an individual an exercise routine' },
    { code: 'S5', dimension: 'S', order: 29, prompt: 'Help people with family-related problems' },
    { code: 'S6', dimension: 'S', order: 30, prompt: 'Supervise the activities of children at a camp' },
    { code: 'S7', dimension: 'S', order: 31, prompt: 'Teach children how to read' },
    { code: 'S8', dimension: 'S', order: 32, prompt: 'Help elderly people with their daily activities' },

    { code: 'E1', dimension: 'E', order: 33, prompt: 'Sell restaurant franchises to individuals' },
    { code: 'E2', dimension: 'E', order: 34, prompt: 'Sell merchandise at a department store' },
    { code: 'E3', dimension: 'E', order: 35, prompt: 'Manage the operations of a hotel' },
    { code: 'E4', dimension: 'E', order: 36, prompt: 'Operate a beauty salon or barber shop' },
    { code: 'E5', dimension: 'E', order: 37, prompt: 'Manage a department within a large company' },
    { code: 'E6', dimension: 'E', order: 38, prompt: 'Manage a clothing store' },
    { code: 'E7', dimension: 'E', order: 39, prompt: 'Sell houses' },
    { code: 'E8', dimension: 'E', order: 40, prompt: 'Run a toy store' },

    { code: 'C1', dimension: 'C', order: 41, prompt: 'Generate the monthly payroll checks for an office' },
    { code: 'C2', dimension: 'C', order: 42, prompt: 'Inventory supplies using a hand-held computer' },
    { code: 'C3', dimension: 'C', order: 43, prompt: 'Use a computer program to generate customer bills' },
    { code: 'C4', dimension: 'C', order: 44, prompt: 'Maintain employee records' },
    { code: 'C5', dimension: 'C', order: 45, prompt: 'Compute and record statistical and other numerical data' },
    { code: 'C6', dimension: 'C', order: 46, prompt: 'Operate a calculator' },
    { code: 'C7', dimension: 'C', order: 47, prompt: 'Handle customers\' bank transactions' },
    { code: 'C8', dimension: 'C', order: 48, prompt: 'Keep shipping and receiving records' },
];

const VERSION_SOURCES = {
    2: {
        sourceLabel: 'IIP Basic Interest Markers',
        sourceUrl: 'https://doi.org/10.1016/j.jvb.2007.12.002',
        sourceCitation:
            'Liao, H.-Y., Armstrong, P. I., & Rounds, J. (2008). Development and initial ' +
            'validation of public domain Basic Interest Markers. Journal of Vocational Behavior, ' +
            '73(1), 159–183. Public domain via Interest Item Pool (IIP), hosted by Open-Source ' +
            'Psychometrics Project (openpsychometrics.org). Validated with N = 145,828.',
    },
};

module.exports = {
    IIP_RIASEC_QUESTIONS,
    RIASEC_SCALE_OPTIONS,
    VERSION_SOURCES,
};
