const db = require('../config/db');

class AnalyticsController {
  async getOverview(req, res, next) {
    try {
      const result = await db.query('SELECT COUNT(*) as total_jobs FROM jobs WHERE is_active = TRUE');
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
        JOIN jobs j ON js.job_id = j.id
        WHERE j.is_active = TRUE
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
        WHERE j.is_active = TRUE AND j.salary_min IS NOT NULL
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
      const result = await db.query(`
        SELECT DATE(posted_at) as date, COUNT(id) as count
        FROM jobs
        WHERE posted_at IS NOT NULL AND is_active = TRUE
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
        JOIN job_levels jl ON l.id = jl.level_id
        JOIN jobs j ON jl.job_id = j.id
        WHERE j.is_active = TRUE AND j.salary_min IS NOT NULL
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
        SELECT l.name as level, COUNT(DISTINCT j.id) as job_count
        FROM levels l
        LEFT JOIN job_levels jl ON l.id = jl.level_id
        LEFT JOIN jobs j ON jl.job_id = j.id AND j.is_active = TRUE
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

  async getRoleAnalytics(req, res, next) {
    try {
      // Đếm jobs trực tiếp qua jobs.role_id (chính xác)
      const rolesResult = await db.query(`
        SELECT r.id, r.name as role, COUNT(j.id) as job_count
        FROM roles r
        LEFT JOIN jobs j ON r.id = j.role_id AND j.is_active = TRUE
        GROUP BY r.id, r.name
        ORDER BY job_count DESC
      `);

      // Lấy top skills cho mỗi role (qua jobs.role_id → job_skills)
      const skillsResult = await db.query(`
        SELECT j.role_id, s.name as skill_name,
               COUNT(DISTINCT j.id) as skill_job_count
        FROM jobs j
        JOIN job_skills js ON j.id = js.job_id
        JOIN skills s ON js.skill_id = s.id
        WHERE j.is_active = TRUE AND j.role_id IS NOT NULL
        GROUP BY j.role_id, s.name
        ORDER BY j.role_id, skill_job_count DESC
      `);

      // Lấy lương trung bình cho mỗi role
      const salaryResult = await db.query(`
        SELECT j.role_id,
               AVG(j.salary_min) as avg_min,
               AVG(j.salary_max) as avg_max
        FROM jobs j
        WHERE j.is_active = TRUE AND j.salary_min IS NOT NULL AND j.role_id IS NOT NULL
        GROUP BY j.role_id
      `);

      // Map skills theo role_id
      const skillsByRole = {};
      for (const row of skillsResult.rows) {
        if (!skillsByRole[row.role_id]) skillsByRole[row.role_id] = [];
        skillsByRole[row.role_id].push({
          name: row.skill_name,
          job_count: parseInt(row.skill_job_count)
        });
      }

      // Map salary theo role_id
      const salaryByRole = {};
      for (const row of salaryResult.rows) {
        salaryByRole[row.role_id] = {
          avg_min: row.avg_min ? Math.round(parseFloat(row.avg_min)) : null,
          avg_max: row.avg_max ? Math.round(parseFloat(row.avg_max)) : null
        };
      }

      res.json({
        status: 'success',
        data: rolesResult.rows.map(row => ({
          id: row.id,
          role: row.role,
          job_count: parseInt(row.job_count),
          avg_min: salaryByRole[row.id]?.avg_min || null,
          avg_max: salaryByRole[row.id]?.avg_max || null,
          skills: (skillsByRole[row.id] || []).slice(0, 10).map(s => s.name),
          skills_detail: (skillsByRole[row.id] || []).slice(0, 10)
        }))
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();
