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
      // Tính lương theo role qua role_skills → job_skills (không dùng legacy role_id)
      const result = await db.query(`
        SELECT r.name as role, AVG(j.salary_min) as avg_min, AVG(j.salary_max) as avg_max
        FROM roles r
        JOIN role_skills rs ON r.id = rs.role_id
        JOIN job_skills js ON rs.skill_id = js.skill_id
        JOIN jobs j ON js.job_id = j.id
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
      // Grouping jobs by date posted (casting timestamp to date)
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
      // Bước 1: Tìm "best role" cho mỗi job dựa vào role có nhiều matching skills nhất
      // Mỗi job chỉ được gán vào ĐÚNG 1 role → không bị đếm trùng
      // Dùng role_skills → job_skills (KHÔNG dùng legacy jobs.role_id)
      const rolesResult = await db.query(`
        WITH job_role_matches AS (
          -- Đếm số skills match giữa mỗi job và mỗi role
          SELECT js.job_id, rs.role_id, COUNT(*) as match_count
          FROM job_skills js
          JOIN role_skills rs ON js.skill_id = rs.skill_id
          JOIN jobs j ON js.job_id = j.id
          WHERE j.is_active = TRUE
          GROUP BY js.job_id, rs.role_id
          HAVING COUNT(*) >= 1
        ),
        best_role AS (
          -- Mỗi job chỉ gán vào role có nhiều skills match nhất
          SELECT DISTINCT ON (job_id) job_id, role_id, match_count
          FROM job_role_matches
          ORDER BY job_id, match_count DESC, role_id
        )
        SELECT r.id, r.name as role,
               COUNT(br.job_id) as job_count
        FROM roles r
        LEFT JOIN best_role br ON r.id = br.role_id
        GROUP BY r.id, r.name
        ORDER BY job_count DESC
      `);

      // Lấy skills cho mỗi role từ bảng role_skills, kèm số lượng jobs của mỗi skill
      const skillsResult = await db.query(`
        SELECT rs.role_id, s.name as skill_name,
               COUNT(DISTINCT js.job_id) as skill_job_count
        FROM role_skills rs
        JOIN skills s ON rs.skill_id = s.id
        LEFT JOIN job_skills js ON s.id = js.skill_id
        LEFT JOIN jobs j ON js.job_id = j.id AND j.is_active = TRUE
        GROUP BY rs.role_id, s.name
        ORDER BY rs.role_id, skill_job_count DESC
      `);

      // Lấy lương trung bình cho mỗi role qua skill-matching
      const salaryResult = await db.query(`
        WITH job_role_matches AS (
          SELECT js.job_id, rs.role_id, COUNT(*) as match_count
          FROM job_skills js
          JOIN role_skills rs ON js.skill_id = rs.skill_id
          JOIN jobs j ON js.job_id = j.id
          WHERE j.is_active = TRUE AND j.salary_min IS NOT NULL
          GROUP BY js.job_id, rs.role_id
        ),
        best_role AS (
          SELECT DISTINCT ON (job_id) job_id, role_id
          FROM job_role_matches
          ORDER BY job_id, match_count DESC, role_id
        )
        SELECT br.role_id,
               AVG(j.salary_min) as avg_min,
               AVG(j.salary_max) as avg_max
        FROM best_role br
        JOIN jobs j ON br.job_id = j.id
        WHERE j.salary_min IS NOT NULL
        GROUP BY br.role_id
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
          skills: (skillsByRole[row.id] || []).map(s => s.name),
          skills_detail: skillsByRole[row.id] || []
        }))
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();
