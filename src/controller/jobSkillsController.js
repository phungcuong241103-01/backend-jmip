const db = require('../config/db');

class JobSkillsController {
  async getByJobId(req, res, next) {
    try {
      const { jobId } = req.params;
      const result = await db.query(`
        SELECT s.* 
        FROM skills s
        JOIN job_skills js ON s.id = js.skill_id
        WHERE js.job_id = $1
      `, [jobId]);
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const result = await db.query('SELECT * FROM job_skills');
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new JobSkillsController();
