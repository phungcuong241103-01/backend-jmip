const db = require('../config/db');

class JobLevelController {
  // GET /api/job-levels - Lấy tất cả quan hệ job-level
  async getAll(req, res, next) {
    try {
      const result = await db.query(`
        SELECT jl.*, j.title as job_title, l.name as level_name
        FROM job_levels jl
        JOIN jobs j ON jl.job_id = j.id
        JOIN levels l ON jl.level_id = l.id
        ORDER BY jl.job_id ASC
      `);
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/jobs/:jobId/levels - Lấy levels của một job cụ thể
  async getByJobId(req, res, next) {
    try {
      const { jobId } = req.params;
      const result = await db.query(`
        SELECT l.*
        FROM levels l
        JOIN job_levels jl ON l.id = jl.level_id
        WHERE jl.job_id = $1
        ORDER BY l.name ASC
      `, [jobId]);
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/levels/:levelId/jobs - Lấy jobs theo level
  async getJobsByLevel(req, res, next) {
    try {
      const { levelId } = req.params;
      const result = await db.query(`
        SELECT j.*, c.name as company_name, r.name as role_name, l.name as level_name, loc.city
        FROM jobs j
        JOIN job_levels jl ON j.id = jl.job_id
        JOIN levels l ON jl.level_id = l.id
        LEFT JOIN companies c ON j.company_id = c.id
        LEFT JOIN roles r ON j.role_id = r.id
        LEFT JOIN locations loc ON j.location_id = loc.id
        WHERE jl.level_id = $1
        ORDER BY j.posted_at DESC
      `, [levelId]);
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new JobLevelController();
