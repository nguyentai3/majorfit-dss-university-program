const { Router } = require('express');
const { programsAdminRouter } = require('./content/programs');
const { questionBanksAdminRouter } = require('./content/questionBanks');
const { questionsAdminRouter } = require('./content/questions');
const { universitiesAdminRouter } = require('./content/universities');
const { expertReviewsAdminRouter } = require('./content/expertReviews');

const contentAdminRouter = Router();

contentAdminRouter.use(universitiesAdminRouter);
contentAdminRouter.use(programsAdminRouter);
contentAdminRouter.use(questionBanksAdminRouter);
contentAdminRouter.use(questionsAdminRouter);
contentAdminRouter.use(expertReviewsAdminRouter);

module.exports = { contentAdminRouter };
