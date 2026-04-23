const db = require('../config/db');
const Groq = require('groq-sdk');
const cache = require('../config/cache');

class AnalyticsController {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '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' });
  }

  async getOverview(req, res, next) {
    try {
      const cached = cache.get('analytics:overview');
      if (cached) return res.json(cached);

      const result = await db.query('SELECT COUNT(*) as total_jobs FROM jobs WHERE is_active = TRUE');
      const totalJobs = parseInt(result.rows[0].total_jobs);

      const response = { status: 'success', data: { totalJobs } };
      cache.set('analytics:overview', response, 600); // 10 phút
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async getSkills(req, res, next) {
    try {
      // ⚡ Cache 10 phút — skills aggregation ít thay đổi
      const cached = cache.get('analytics:skills');
      if (cached) return res.json(cached);

      const result = await db.query(`
        SELECT s.name, COUNT(js.job_id) as count
        FROM skills s
        JOIN job_skills js ON s.id = js.skill_id
        JOIN jobs j ON js.job_id = j.id
        WHERE j.is_active = TRUE
        GROUP BY s.name
        ORDER BY count DESC
      `);

      const response = {
        status: 'success',
        data: result.rows.map(row => ({
          name: row.name,
          count: parseInt(row.count)
        }))
      };
      cache.set('analytics:skills', response, 600); // 10 phút
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async getSalary(req, res, next) {
    try {
      // ⚡ Cache 10 phút
      const cached = cache.get('analytics:salary');
      if (cached) return res.json(cached);

      const result = await db.query(`
        SELECT r.name as role, AVG(j.salary_min) as avg_min, AVG(j.salary_max) as avg_max
        FROM roles r
        JOIN jobs j ON r.id = j.role_id
        WHERE j.is_active = TRUE AND j.salary_min IS NOT NULL
        GROUP BY r.name
        ORDER BY avg_min DESC
        LIMIT 10
      `);

      const response = {
        status: 'success',
        data: result.rows.map(row => ({
          role: row.role,
          avg_min: Math.round(row.avg_min),
          avg_max: Math.round(row.avg_max)
        }))
      };
      cache.set('analytics:salary', response, 600);
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async getTrend(req, res, next) {
    try {
      // ⚡ Cache 10 phút
      const cached = cache.get('analytics:trend');
      if (cached) return res.json(cached);

      const result = await db.query(`
        SELECT DATE(posted_at) as date, COUNT(id) as count
        FROM jobs
        WHERE posted_at IS NOT NULL AND is_active = TRUE
        GROUP BY DATE(posted_at)
        ORDER BY DATE(posted_at) ASC
        LIMIT 30
      `);

      const response = {
        status: 'success',
        data: result.rows.map(row => ({
          date: row.date,
          count: parseInt(row.count)
        }))
      };
      cache.set('analytics:trend', response, 600);
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async getSalaryByRole(req, res, next) {
    try {
      // ⚡ Cache 10 phút
      const cached = cache.get('analytics:salaryByRole');
      if (cached) return res.json(cached);

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

      const response = {
        status: 'success',
        data: result.rows.map(row => ({
          role: row.role,
          avg_min: Math.round(parseFloat(row.avg_min)),
          avg_max: Math.round(parseFloat(row.avg_max)),
          job_count: parseInt(row.job_count)
        }))
      };
      cache.set('analytics:salaryByRole', response, 600);
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async getLevelStats(req, res, next) {
    try {
      // ⚡ Cache 10 phút
      const cached = cache.get('analytics:levelStats');
      if (cached) return res.json(cached);

      const result = await db.query(`
        SELECT l.name as level, COUNT(DISTINCT j.id) as job_count
        FROM levels l
        LEFT JOIN job_levels jl ON l.id = jl.level_id
        LEFT JOIN jobs j ON jl.job_id = j.id AND j.is_active = TRUE
        GROUP BY l.name, l.id
        ORDER BY job_count DESC
      `);

      const response = {
        status: 'success',
        data: result.rows.map(row => ({
          level: row.level,
          job_count: parseInt(row.job_count)
        }))
      };
      cache.set('analytics:levelStats', response, 600);
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async getRoleAnalytics(req, res, next) {
    try {
      // ⚡ Cache 10 phút
      const cached = cache.get('analytics:roleAnalytics');
      if (cached) return res.json(cached);

      // ⚡ Chạy 3 queries SONG SONG thay vì tuần tự (Promise.all)
      const [rolesResult, skillsResult, salaryResult] = await Promise.all([
        // Đếm jobs trực tiếp qua jobs.role_id (chính xác)
        db.query(`
          SELECT r.id, r.name as role, COUNT(j.id) as job_count
          FROM roles r
          LEFT JOIN jobs j ON r.id = j.role_id AND j.is_active = TRUE
          GROUP BY r.id, r.name
          ORDER BY job_count DESC
        `),
        // Lấy top skills cho mỗi role (qua jobs.role_id → job_skills)
        db.query(`
          SELECT j.role_id, s.name as skill_name,
                 COUNT(DISTINCT j.id) as skill_job_count
          FROM jobs j
          JOIN job_skills js ON j.id = js.job_id
          JOIN skills s ON js.skill_id = s.id
          WHERE j.is_active = TRUE AND j.role_id IS NOT NULL
          GROUP BY j.role_id, s.name
          ORDER BY j.role_id, skill_job_count DESC
        `),
        // Lấy lương trung bình cho mỗi role
        db.query(`
          SELECT j.role_id,
                 AVG(j.salary_min) as avg_min,
                 AVG(j.salary_max) as avg_max
          FROM jobs j
          WHERE j.is_active = TRUE AND j.salary_min IS NOT NULL AND j.role_id IS NOT NULL
          GROUP BY j.role_id
        `),
      ]);

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

      const response = {
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
      };
      cache.set('analytics:roleAnalytics', response, 600);
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper: build dynamic WHERE filters from query params
  // ═══════════════════════════════════════════════════════════════════════════
  _buildFilters(query) {
    const clauses = [];
    const params = [];
    let idx = 1;

    if (query.role_id) {
      clauses.push(`j.role_id = $${idx++}`);
      params.push(parseInt(query.role_id));
    }
    if (query.location_id) {
      clauses.push(`j.location_id = $${idx++}`);
      params.push(parseInt(query.location_id));
    }
    if (query.level_id) {
      clauses.push(`EXISTS (SELECT 1 FROM job_levels jl_f WHERE jl_f.job_id = j.id AND jl_f.level_id = $${idx++})`);
      params.push(parseInt(query.level_id));
    }
    if (query.skill_id) {
      clauses.push(`EXISTS (SELECT 1 FROM job_skills js_f WHERE js_f.job_id = j.id AND js_f.skill_id = $${idx++})`);
      params.push(parseInt(query.skill_id));
    }

    const where = clauses.length > 0 ? ' AND ' + clauses.join(' AND ') : '';
    return { where, params };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Filtered Analytics — single endpoint, multi-filter support
  // ═══════════════════════════════════════════════════════════════════════════
  async getFilteredAnalytics(req, res, next) {
    try {
      const { where, params } = this._buildFilters(req.query);

      // ⚡ Cache key dựa trên filter params (mỗi tổ hợp filter = 1 cache riêng)
      const cacheKey = `analytics:filtered:${JSON.stringify(req.query)}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      // ⚡ Chạy 8 queries SONG SONG thay vì tuần tự (Promise.all)
      const [
        totalResult, skillsResult, locationsResult, trendResult,
        rolesResult, salaryByLevelResult, levelsResult, companiesResult
      ] = await Promise.all([
        // 1. Total jobs
        db.query(
          `SELECT COUNT(*) as total FROM jobs j WHERE j.is_active = TRUE${where}`,
          params
        ),
        // 2. Skills breakdown
        db.query(
          `SELECT s.name, COUNT(DISTINCT j.id) as count
           FROM skills s
           JOIN job_skills js ON s.id = js.skill_id
           JOIN jobs j ON js.job_id = j.id
           WHERE j.is_active = TRUE${where}
           GROUP BY s.name
           ORDER BY count DESC`,
          params
        ),
        // 3. Locations breakdown
        db.query(
          `SELECT loc.city as name, COUNT(j.id) as count
           FROM locations loc
           JOIN jobs j ON loc.id = j.location_id
           WHERE j.is_active = TRUE${where}
           GROUP BY loc.city
           ORDER BY count DESC`,
          params
        ),
        // 4. Trend (by date)
        db.query(
          `SELECT DATE(j.posted_at) as date, COUNT(j.id) as count
           FROM jobs j
           WHERE j.posted_at IS NOT NULL AND j.is_active = TRUE${where}
           GROUP BY DATE(j.posted_at)
           ORDER BY DATE(j.posted_at) ASC
           LIMIT 30`,
          params
        ),
        // 5. Roles breakdown (luôn hiển thị tất cả roles, không filter)
        db.query(
          `SELECT r.id, r.name as role, COUNT(j.id) as job_count,
                  AVG(j.salary_min) as avg_min, AVG(j.salary_max) as avg_max
           FROM roles r
           LEFT JOIN jobs j ON r.id = j.role_id AND j.is_active = TRUE
           GROUP BY r.id, r.name
           ORDER BY job_count DESC`
        ),
        // 6. Salary by level (filtered)
        db.query(
          `SELECT l.name as role, 
                  AVG(j.salary_min) as avg_min, 
                  AVG(j.salary_max) as avg_max,
                  COUNT(j.id) as job_count
           FROM levels l
           JOIN job_levels jl ON l.id = jl.level_id
           JOIN jobs j ON jl.job_id = j.id
           WHERE j.is_active = TRUE AND j.salary_min IS NOT NULL${where}
           GROUP BY l.name
           ORDER BY avg_min DESC`,
          params
        ),
        // 7. Levels breakdown (experience)
        db.query(
          `SELECT l.name as level, COUNT(DISTINCT j.id) as job_count
           FROM levels l
           LEFT JOIN job_levels jl ON l.id = jl.level_id
           LEFT JOIN jobs j ON jl.job_id = j.id AND j.is_active = TRUE${where ? ' AND ' + where.replace(' AND ', '') : ''}
           GROUP BY l.name, l.id
           ORDER BY job_count DESC`,
          params
        ),
        // 8. Active companies
        db.query(
          `SELECT COUNT(DISTINCT c.id) as count
           FROM companies c
           JOIN jobs j ON c.id = j.company_id
           WHERE j.is_active = TRUE${where}`,
          params
        ),
      ]);
      const totalJobs = parseInt(totalResult.rows[0].total);

      const response = {
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
      };
      cache.set(cacheKey, response, 300); // 5 phút
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI Insights — Groq reads real DB data and analyzes (multi-filter)
  // ═══════════════════════════════════════════════════════════════════════════
  async getAIInsights(req, res, next) {
    try {
      const { where, params } = this._buildFilters(req.query);
      const { role_id, location_id, level_id, skill_id } = req.query;

      // ⚡ Cache AI insights 15 phút (tránh gọi Groq API lặp lại)
      const aiCacheKey = `analytics:ai:${JSON.stringify(req.query)}`;
      const cached = cache.get(aiCacheKey);
      if (cached) return res.json(cached);

      // Gather data summary for AI
      const [totalRes, topSkillsRes, topLocRes, salaryRes] = await Promise.all([
        db.query(`SELECT COUNT(*) as total FROM jobs j WHERE j.is_active = TRUE${where}`, params),
        db.query(`SELECT s.name, COUNT(DISTINCT j.id) as count
                   FROM skills s JOIN job_skills js ON s.id = js.skill_id
                   JOIN jobs j ON js.job_id = j.id
                   WHERE j.is_active = TRUE${where}
                   GROUP BY s.name ORDER BY count DESC LIMIT 10`, params),
        db.query(`SELECT loc.city as name, COUNT(j.id) as count
                   FROM locations loc JOIN jobs j ON loc.id = j.location_id
                   WHERE j.is_active = TRUE${where}
                   GROUP BY loc.city ORDER BY count DESC LIMIT 5`, params),
        db.query(`SELECT AVG(j.salary_min) as avg_min, AVG(j.salary_max) as avg_max
                   FROM jobs j WHERE j.is_active = TRUE AND j.salary_min IS NOT NULL${where}`, params),
      ]);

      // Build context label from active filters
      const filterLabels = [];
      if (role_id) {
        const r = await db.query('SELECT name FROM roles WHERE id = $1', [parseInt(role_id)]);
        if (r.rows[0]) filterLabels.push(`vai trò "${r.rows[0].name}"`);
      }
      if (location_id) {
        const r = await db.query('SELECT city FROM locations WHERE id = $1', [parseInt(location_id)]);
        if (r.rows[0]) filterLabels.push(`tại "${r.rows[0].city}"`);
      }
      if (level_id) {
        const r = await db.query('SELECT name FROM levels WHERE id = $1', [parseInt(level_id)]);
        if (r.rows[0]) filterLabels.push(`cấp bậc "${r.rows[0].name}"`);
      }
      if (skill_id) {
        const r = await db.query('SELECT name FROM skills WHERE id = $1', [parseInt(skill_id)]);
        if (r.rows[0]) filterLabels.push(`kỹ năng "${r.rows[0].name}"`);
      }
      const contextLabel = filterLabels.length > 0 ? `cho ${filterLabels.join(', ')}` : 'toàn thị trường IT';

      const totalJobs = parseInt(totalRes.rows[0].total);
      const topSkills = topSkillsRes.rows.map(r => `${r.name} (${r.count} jobs)`).join(', ');
      const topLocations = topLocRes.rows.map(r => `${r.name} (${r.count} jobs)`).join(', ');
      const avgMin = salaryRes.rows[0].avg_min ? Math.round(parseFloat(salaryRes.rows[0].avg_min)).toLocaleString() : 'N/A';
      const avgMax = salaryRes.rows[0].avg_max ? Math.round(parseFloat(salaryRes.rows[0].avg_max)).toLocaleString() : 'N/A';

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
        const result = { status: 'success', data: parsed };
        cache.set(aiCacheKey, result, 900); // 15 phút
        return res.json(result);
      }

      const fallback = { status: 'success', data: { insights: [text] } };
      cache.set(aiCacheKey, fallback, 900);
      res.json(fallback);
    } catch (err) {
      console.error('AI Insights error:', err);
      // Graceful fallback — don't crash the page
      res.json({ status: 'success', data: { insights: ['⚠️ Không thể kết nối AI lúc này. Vui lòng thử lại sau.'] } });
    }
  }
}

module.exports = new AnalyticsController();
