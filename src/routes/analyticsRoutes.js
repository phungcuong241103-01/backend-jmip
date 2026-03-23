const express = require('express');
const router = express.Router();
const analyticsController = require('../controller/analyticsController');

router.get('/overview', analyticsController.getOverview);
router.get('/skills', analyticsController.getSkills);
router.get('/salary', analyticsController.getSalary);
router.get('/trend', analyticsController.getTrend);

module.exports = router;
