const db = require('../config/db');

class AnalyticsController {
  async getOverview(req, res, next) {
    try {
      const result = await db.query('SELECT COUNT(*) as total_jobs FROM jobs');
      const totalJobs = parseInt(result.rows[0].total_jobs);

      res.json({
        status: 'success',
        data: {
          totalJobs
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getSkills(req, res, next) {
    try {
      const result = await db.query(`
        SELECT s.name, COUNT(js.job_id) as count
        FROM skills s
        JOIN job_skills js ON s.id = js.skill_id
        GROUP BY s.name
        ORDER BY count DESC
      `);

      res.json({
        status: 'success',
        data: result.rows.map(row => ({
          name: row.name,
          count: parseInt(row.count)
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  async getSalary(req, res, next) {
    try {
      const result = await db.query(`
        SELECT r.name as role, AVG(j.salary_min) as avg_min, AVG(j.salary_max) as avg_max
        FROM roles r
        JOIN jobs j ON r.id = j.role_id
        WHERE j.salary_min IS NOT NULL
        GROUP BY r.name
        ORDER BY avg_min DESC
        LIMIT 10
      `);

      res.json({
        status: 'success',
        data: result.rows.map(row => ({
          role: row.role,
          avg_min: Math.round(row.avg_min),
          avg_max: Math.round(row.avg_max)
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  async getTrend(req, res, next) {
    try {
      // Grouping jobs by date posted (casting timestamp to date)
      const result = await db.query(`
        SELECT DATE(posted_at) as date, COUNT(id) as count
        FROM jobs
        WHERE posted_at IS NOT NULL
        GROUP BY DATE(posted_at)
        ORDER BY DATE(posted_at) ASC
        LIMIT 30
      `);

      res.json({
        status: 'success',
        data: result.rows.map(row => ({
          date: row.date,
          count: parseInt(row.count)
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  async getSalaryByRole(req, res, next) {
    try {
      const result = await db.query(`
        SELECT l.name as role, 
               AVG(j.salary_min) as avg_min, 
               AVG(j.salary_max) as avg_max,
               COUNT(j.id) as job_count
        FROM levels l
        JOIN jobs j ON l.id = j.level_id
        WHERE j.salary_min IS NOT NULL
        GROUP BY l.name
        ORDER BY avg_min DESC
      `);

      res.json({
        status: 'success',
        data: result.rows.map(row => ({
          role: row.role,
          avg_min: Math.round(parseFloat(row.avg_min)),
          avg_max: Math.round(parseFloat(row.avg_max)),
          job_count: parseInt(row.job_count)
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  async getLevelStats(req, res, next) {
    try {
      const result = await db.query(`
        SELECT l.name as level, COUNT(j.id) as job_count
        FROM levels l
        LEFT JOIN jobs j ON l.id = j.level_id
        GROUP BY l.name, l.id
        ORDER BY job_count DESC
      `);

      res.json({
        status: 'success',
        data: result.rows.map(row => ({
          level: row.level,
          job_count: parseInt(row.job_count)
        }))
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();
