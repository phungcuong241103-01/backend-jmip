const db = require('../config/db');
const Groq = require('groq-sdk');

class AnalyticsController {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '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' });
  }

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

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: Filtered Analytics — single endpoint, optional role_id filter
  // ═══════════════════════════════════════════════════════════════════════════
  async getFilteredAnalytics(req, res, next) {
    try {
      const { role_id } = req.query;
      const roleFilter = role_id ? ' AND j.role_id = $1' : '';
      const roleParams = role_id ? [parseInt(role_id)] : [];

      // 1. Total jobs
      const totalResult = await db.query(
        `SELECT COUNT(*) as total FROM jobs j WHERE j.is_active = TRUE${roleFilter}`,
        roleParams
      );
      const totalJobs = parseInt(totalResult.rows[0].total);

      // 2. Skills breakdown
      const skillsResult = await db.query(
        `SELECT s.name, COUNT(DISTINCT j.id) as count
         FROM skills s
         JOIN job_skills js ON s.id = js.skill_id
         JOIN jobs j ON js.job_id = j.id
         WHERE j.is_active = TRUE${roleFilter}
         GROUP BY s.name
         ORDER BY count DESC`,
        roleParams
      );

      // 3. Locations breakdown
      const locationsResult = await db.query(
        `SELECT loc.city as name, COUNT(j.id) as count
         FROM locations loc
         JOIN jobs j ON loc.id = j.location_id
         WHERE j.is_active = TRUE${roleFilter}
         GROUP BY loc.city
         ORDER BY count DESC`,
        roleParams
      );

      // 4. Trend (by date)
      const trendResult = await db.query(
        `SELECT DATE(j.posted_at) as date, COUNT(j.id) as count
         FROM jobs j
         WHERE j.posted_at IS NOT NULL AND j.is_active = TRUE${roleFilter}
         GROUP BY DATE(j.posted_at)
         ORDER BY DATE(j.posted_at) ASC
         LIMIT 30`,
        roleParams
      );

      // 5. Roles breakdown (nhu cầu theo vai trò)
      const rolesResult = await db.query(
        `SELECT r.id, r.name as role, COUNT(j.id) as job_count,
                AVG(j.salary_min) as avg_min, AVG(j.salary_max) as avg_max
         FROM roles r
         LEFT JOIN jobs j ON r.id = j.role_id AND j.is_active = TRUE
         GROUP BY r.id, r.name
         ORDER BY job_count DESC`
      );

      // 6. Salary by level (filtered by role if provided)
      const salaryByLevelResult = await db.query(
        `SELECT l.name as role, 
                AVG(j.salary_min) as avg_min, 
                AVG(j.salary_max) as avg_max,
                COUNT(j.id) as job_count
         FROM levels l
         JOIN job_levels jl ON l.id = jl.level_id
         JOIN jobs j ON jl.job_id = j.id
         WHERE j.is_active = TRUE AND j.salary_min IS NOT NULL${roleFilter}
         GROUP BY l.name
         ORDER BY avg_min DESC`,
        roleParams
      );

      // 7. Levels breakdown (experience)
      const levelsResult = await db.query(
        `SELECT l.name as level, COUNT(DISTINCT j.id) as job_count
         FROM levels l
         LEFT JOIN job_levels jl ON l.id = jl.level_id
         LEFT JOIN jobs j ON jl.job_id = j.id AND j.is_active = TRUE${roleFilter ? ' AND j.role_id = $1' : ''}
         GROUP BY l.name, l.id
         ORDER BY job_count DESC`,
        roleParams
      );

      // 8. Active companies
      const companiesResult = await db.query(
        `SELECT COUNT(DISTINCT c.id) as count
         FROM companies c
         JOIN jobs j ON c.id = j.company_id
         WHERE j.is_active = TRUE${roleFilter}`,
        roleParams
      );

      res.json({
        status: 'success',
        data: {
          totalJobs,
          activeCompanies: parseInt(companiesResult.rows[0].count),
          skills: skillsResult.rows.map(r => ({ name: r.name, count: parseInt(r.count) })),
          locations: locationsResult.rows.map(r => ({ name: r.name, count: parseInt(r.count) })),
          trend: trendResult.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
          roles: rolesResult.rows.map(r => ({
            id: r.id, role: r.role,
            job_count: parseInt(r.job_count),
            avg_min: r.avg_min ? Math.round(parseFloat(r.avg_min)) : null,
            avg_max: r.avg_max ? Math.round(parseFloat(r.avg_max)) : null,
          })),
          salaryByLevel: salaryByLevelResult.rows.map(r => ({
            role: r.role,
            avg_min: Math.round(parseFloat(r.avg_min)),
            avg_max: Math.round(parseFloat(r.avg_max)),
            job_count: parseInt(r.job_count),
          })),
          levels: levelsResult.rows.map(r => ({
            level: r.level, job_count: parseInt(r.job_count)
          })),
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: AI Insights — Groq reads real DB data and analyzes
  // ═══════════════════════════════════════════════════════════════════════════
  async getAIInsights(req, res, next) {
    try {
      const { role_id } = req.query;
      const roleFilter = role_id ? ' AND j.role_id = $1' : '';
      const roleParams = role_id ? [parseInt(role_id)] : [];

      // Gather data summary for AI
      const [totalRes, topSkillsRes, topLocRes, salaryRes, roleName] = await Promise.all([
        db.query(`SELECT COUNT(*) as total FROM jobs j WHERE j.is_active = TRUE${roleFilter}`, roleParams),
        db.query(`SELECT s.name, COUNT(DISTINCT j.id) as count
                   FROM skills s JOIN job_skills js ON s.id = js.skill_id
                   JOIN jobs j ON js.job_id = j.id
                   WHERE j.is_active = TRUE${roleFilter}
                   GROUP BY s.name ORDER BY count DESC LIMIT 10`, roleParams),
        db.query(`SELECT loc.city as name, COUNT(j.id) as count
                   FROM locations loc JOIN jobs j ON loc.id = j.location_id
                   WHERE j.is_active = TRUE${roleFilter}
                   GROUP BY loc.city ORDER BY count DESC LIMIT 5`, roleParams),
        db.query(`SELECT AVG(j.salary_min) as avg_min, AVG(j.salary_max) as avg_max
                   FROM jobs j WHERE j.is_active = TRUE AND j.salary_min IS NOT NULL${roleFilter}`, roleParams),
        role_id
          ? db.query('SELECT name FROM roles WHERE id = $1', [parseInt(role_id)]).then(r => r.rows[0]?.name || 'N/A')
          : Promise.resolve(null),
      ]);

      const totalJobs = parseInt(totalRes.rows[0].total);
      const topSkills = topSkillsRes.rows.map(r => `${r.name} (${r.count} jobs)`).join(', ');
      const topLocations = topLocRes.rows.map(r => `${r.name} (${r.count} jobs)`).join(', ');
      const avgMin = salaryRes.rows[0].avg_min ? Math.round(parseFloat(salaryRes.rows[0].avg_min)).toLocaleString() : 'N/A';
      const avgMax = salaryRes.rows[0].avg_max ? Math.round(parseFloat(salaryRes.rows[0].avg_max)).toLocaleString() : 'N/A';

      const contextLabel = roleName ? `cho vị trí "${roleName}"` : 'toàn thị trường IT';

      const prompt = `Bạn là chuyên gia phân tích thị trường lao động IT tại Việt Nam. Dưới đây là dữ liệu THỰC TẾ từ database tuyển dụng ${contextLabel}:

- Tổng số tin tuyển dụng: ${totalJobs}
- Top 10 kỹ năng được yêu cầu nhiều nhất: ${topSkills}
- Top 5 địa điểm tuyển dụng: ${topLocations}
- Mức lương trung bình: ${avgMin} - ${avgMax} VNĐ

Hãy phân tích dữ liệu trên và đưa ra ĐÚNG 4 nhận xét ngắn gọn, sắc bén, mỗi nhận xét 1-2 câu. Mỗi nhận xét phải bắt đầu bằng 1 emoji phù hợp. Tập trung vào:
1. Xu hướng kỹ năng nổi bật
2. Phân bố địa lý tuyển dụng
3. Mức lương và cơ hội
4. Lời khuyên thực tế cho ứng viên

Trả về format JSON: {"insights": ["nhận xét 1", "nhận xét 2", "nhận xét 3", "nhận xét 4"]}. CHỈ trả về JSON.`;

      if (!this.groq) {
        return res.json({ status: 'success', data: { insights: [] } });
      }

      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });

      const text = response.choices[0].message.content;
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json({ status: 'success', data: parsed });
      }

      res.json({ status: 'success', data: { insights: [text] } });
    } catch (err) {
      console.error('AI Insights error:', err);
      // Graceful fallback — don't crash the page
      res.json({ status: 'success', data: { insights: ['⚠️ Không thể kết nối AI lúc này. Vui lòng thử lại sau.'] } });
    }
  }
}

module.exports = new AnalyticsController();
