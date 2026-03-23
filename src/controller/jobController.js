const jobService = require('../services/jobService');

class JobController {
  async getFilters(req, res, next) {
    try {
      const filters = await jobService.getAllMetadata();
      res.json(filters);
    } catch (err) {
      next(err);
    }
  }

  async getJobs(req, res, next) {
    try {
      const jobs = await jobService.findJobs(req.query);
      res.json(jobs);
    } catch (err) {
      next(err);
    }
  }

  async predictSalary(req, res, next) {
    try {
      const result = await jobService.predictSalary(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await jobService.getMarketStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }

  async getLearningAdvice(req, res, next) {
    try {
      const advice = await jobService.suggestLearningPath(req.body);
      res.json(advice);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new JobController();
