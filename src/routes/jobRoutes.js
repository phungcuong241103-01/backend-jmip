const express = require('express');
const router = express.Router();
const jobController = require('../controller/jobController');
const locationController = require('../controller/locationController');
const companiesController = require('../controller/companiesController');
const rolesController = require('../controller/rolesController');
const levelsController = require('../controller/levelsController');
const skillsController = require('../controller/skillsController');
const jobSkillsController = require('../controller/jobSkillsController');

// Jobs
router.get('/jobs', jobController.getJobs);
router.get('/filters', jobController.getFilters);
router.post('/predict-salary', jobController.predictSalary);
router.get('/stats', jobController.getStats);
router.post('/advisor/suggest', jobController.getLearningAdvice);

// Locations
router.get('/locations', locationController.getAll);
router.get('/locations/:id', locationController.getById);

// Companies
router.get('/companies', companiesController.getAll);
router.get('/companies/:id', companiesController.getById);

// Roles
router.get('/roles', rolesController.getAll);
router.get('/roles/:id', rolesController.getById);

// Levels
router.get('/levels', levelsController.getAll);
router.get('/levels/:id', levelsController.getById);

// Skills
router.get('/skills', skillsController.getAll);
router.get('/skills/:id', skillsController.getById);

// Job Skills
router.get('/job-skills', jobSkillsController.getAll);
router.get('/jobs/:jobId/skills', jobSkillsController.getByJobId);

module.exports = router;
