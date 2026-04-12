const db = require('../config/db');
const Groq = require('groq-sdk');

class JobService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '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' });
  }

  async getAllMetadata() {
    const queries = [
      db.query('SELECT id, name FROM roles ORDER BY name'),
      db.query('SELECT id, name FROM levels ORDER BY name'),
      db.query(`
        SELECT s.id, s.name, COUNT(js.job_id) as count 
        FROM skills s 
        LEFT JOIN job_skills js ON s.id = js.skill_id 
        LEFT JOIN jobs j ON js.job_id = j.id AND j.is_active = TRUE
        GROUP BY s.id, s.name 
        ORDER BY count DESC, name ASC
      `),
      db.query('SELECT id, city FROM locations ORDER BY city')
    ];
    const [roles, levels, skills, locations] = await Promise.all(queries);
    return {
      roles: roles.rows,
      levels: levels.rows,
      skills: skills.rows,
      locations: locations.rows
    };
  }

  async findJobs(filters) {
    const { role, level, location, page = 1, limit = 50, search = '', skills } = filters;
    const offset = (page - 1) * limit;
    
    let baseJoins = `
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN job_levels jl_filter ON j.id = jl_filter.job_id
      LEFT JOIN levels l ON jl_filter.level_id = l.id
      LEFT JOIN locations loc ON j.location_id = loc.id
    `;
    let baseWhere = `WHERE j.is_active = TRUE`;
    const values = [];
    let counter = 1;

    if (role) {
      baseWhere += ` AND EXISTS (
        SELECT 1 FROM role_skills rs_f
        JOIN roles r_f ON rs_f.role_id = r_f.id
        JOIN job_skills js_f ON rs_f.skill_id = js_f.skill_id
        WHERE js_f.job_id = j.id AND r_f.name = $${counter++}
      )`;
      values.push(role);
    }
    if (level) {
      baseWhere += ` AND l.name = $${counter++}`;
      values.push(level);
    }
    if (location) {
      baseWhere += ` AND loc.city = $${counter++}`;
      values.push(location);
    }
    if (search) {
      baseWhere += ` AND (j.title ILIKE $${counter} OR c.name ILIKE $${counter})`;
      values.push(`%${search}%`);
      counter++;
    }
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
      if (skillsArray.length > 0) {
        baseWhere += ` AND EXISTS (
          SELECT 1 FROM job_skills js2 
          JOIN skills s2 ON js2.skill_id = s2.id 
          WHERE js2.job_id = j.id AND s2.name = ANY($${counter++})
        )`;
        values.push(skillsArray);
      }
    }

    // Count total matches
    const countResult = await db.query(`
      SELECT COUNT(DISTINCT j.id) 
      FROM jobs j 
      ${baseJoins} 
      ${baseWhere}
    `, values);
    const totalItems = parseInt(countResult.rows[0].count);

    // Fetch paginated results
    let query = `
      SELECT j.*, c.name as company_name,
             (SELECT r_sub.name FROM role_skills rs_sub
              JOIN roles r_sub ON rs_sub.role_id = r_sub.id
              JOIN job_skills js_sub ON rs_sub.skill_id = js_sub.skill_id
              WHERE js_sub.job_id = j.id
              GROUP BY r_sub.name ORDER BY COUNT(*) DESC LIMIT 1) as role_name,
             loc.city,
             COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') as skills,
             COALESCE(array_agg(DISTINCT l.name) FILTER (WHERE l.name IS NOT NULL), '{}') as level_names
      FROM jobs j
      ${baseJoins}
      LEFT JOIN job_skills js ON j.id = js.job_id
      LEFT JOIN skills s ON js.skill_id = s.id
      ${baseWhere}
      GROUP BY j.id, c.name, loc.city
      ORDER BY j.posted_at DESC
      LIMIT $${counter++} OFFSET $${counter++}
    `;
    values.push(limit, offset);

    const result = await db.query(query, values);
    
    return {
      jobs: result.rows,
      pagination: {
        totalItems,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / limit),
        limit: parseInt(limit)
      }
    };
  }

  async predictSalary(data) {
    const { role, level, skills = [] } = data;
    const query = `
      SELECT AVG(salary_min) as avg_min, AVG(salary_max) as avg_max, COUNT(*) as count
      FROM jobs j
      JOIN role_skills rs ON TRUE
      JOIN roles r ON rs.role_id = r.id
      JOIN job_skills js ON rs.skill_id = js.skill_id AND js.job_id = j.id
      JOIN job_levels jl ON j.id = jl.job_id
      JOIN levels l ON jl.level_id = l.id
      WHERE j.is_active = TRUE AND r.name = $1 AND l.name = $2
    `;
    const stats = await db.query(query, [role, level]);
    const dbResult = stats.rows[0];

    // Market estimates if data is sparse
    const marketBaselines = {
      'Frontend Developer': { 'Junior': [800, 1200], 'Middle': [1500, 2500], 'Senior': [2800, 4500] },
      'Backend Developer': { 'Junior': [900, 1300], 'Middle': [1600, 2800], 'Senior': [3000, 5000] },
      'Fullstack Developer': { 'Junior': [1000, 1500], 'Middle': [1800, 3200], 'Senior': [3500, 6000] },
      'Data Engineer': { 'Junior': [1100, 1600], 'Middle': [2000, 3500], 'Senior': [4000, 7000] },
      'DevOps Engineer': { 'Junior': [1200, 1800], 'Middle': [2200, 4000], 'Senior': [4500, 8000] },
      'AI Engineer': { 'Junior': [1500, 2200], 'Middle': [3000, 5000], 'Senior': [6000, 12000] }
    };

    let finalRange;
    let reliability = "Cao";
    let growth = "Tăng trưởng mạnh (+15%)";

    if (!dbResult.count || dbResult.count === '0' || !dbResult.avg_min) {
      const baseline = marketBaselines[role]?.[level] || [1200, 2500];
      finalRange = `$${baseline[0].toLocaleString()} - $${baseline[1].toLocaleString()}`;
      reliability = "Trung bình (Dựa trên thị trường)";
      growth = "Ổn định";
    } else {
      finalRange = `$${Math.round(dbResult.avg_min).toLocaleString()} - $${Math.round(dbResult.avg_max).toLocaleString()}`;
    }

    // Use AI to refine if possible
    if (this.groq) {
      try {
        const prompt = `Bạn là chuyên gia nhân sự và headhunter. Với vị trí ${role} cấp bậc ${level} và kỹ năng [${skills.join(', ')}], hãy đưa ra dự đoán mức lương thực tế tại Việt Nam năm 2026. Dữ liệu database của tôi cho thấy khoảng: ${finalRange}. Nếu khoảng này không hợp lý với bộ kỹ năng, hãy điều chỉnh. Trả về format JSON: {"range": "$min - $max", "reliability": "Cao/Trung bình", "growth": "Xu hướng thị trường"}. Chỉ trả về JSON.`;
        const response = await this.groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }]
        });
        const responseText = response.choices[0].message.content;
        const jsonMatch = responseText.match(/\{.*\}/s);
        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0]);
          return { ...aiResult, percentile: "75th" };
        }
      } catch (err) {
        console.error('AI prediction failed, falling back to DB/Expert logic', err);
      }
    }

    return {
      range: finalRange,
      reliability: reliability,
      growth: growth,
      percentile: "75th"
    };
  }

  async getMarketStats() {
    const totalJobs = await db.query('SELECT COUNT(*) FROM jobs WHERE is_active = TRUE');
    
    // Top skills with counts and percentage calculation
    const topSkillsResult = await db.query(`
      SELECT s.name, COUNT(js.job_id) as count 
      FROM skills s 
      JOIN job_skills js ON s.id = js.skill_id 
      JOIN jobs j ON js.job_id = j.id
      WHERE j.is_active = TRUE
      GROUP BY s.name 
      ORDER BY count DESC
    `);

    // Get total job_skills rows for accurate percentage
    const totalJobSkills = await db.query('SELECT COUNT(*) FROM job_skills js JOIN jobs j ON js.job_id = j.id WHERE j.is_active = TRUE');
    const totalJobSkillsCount = parseInt(totalJobSkills.rows[0].count);
    
    const totalCount = parseInt(totalJobs.rows[0].count);
    const popularSkills = topSkillsResult.rows.map(row => ({
      ...row,
      percentage: totalJobSkillsCount > 0 ? Math.round((parseInt(row.count) / totalJobSkillsCount) * 100) : 0
    }));

    // Stats by location
    const locationStats = await db.query(`
      SELECT loc.city as name, COUNT(j.id) as count
      FROM locations loc
      JOIN jobs j ON loc.id = j.location_id
      WHERE j.is_active = TRUE
      GROUP BY loc.city
      ORDER BY count DESC
    `);

    // Average salary by role (qua role_skills → job_skills)
    const salaryStats = await db.query(`
      SELECT r.name as role, AVG(j.salary_min) as avg_min, AVG(j.salary_max) as avg_max
      FROM roles r
      JOIN role_skills rs ON r.id = rs.role_id
      JOIN job_skills js ON rs.skill_id = js.skill_id
      JOIN jobs j ON js.job_id = j.id
      WHERE j.is_active = TRUE AND j.salary_min IS NOT NULL
      GROUP BY r.name
      ORDER BY avg_min DESC LIMIT 5
    `);

    // Total distinct skills count
    const totalSkillsCount = await db.query('SELECT COUNT(*) FROM skills');

    return {
      totalJobs: totalCount,
      totalSkills: parseInt(totalSkillsCount.rows[0].count),
      totalJobSkills: totalJobSkillsCount,
      popularSkills,
      locationStats: locationStats.rows,
      salaryStats: salaryStats.rows,
      growthRate: "+12.5%", // Mocked for now as we don't have historical data trends easily
      activeCompanies: await db.query('SELECT COUNT(DISTINCT c.id) FROM companies c JOIN jobs j ON c.id = j.company_id WHERE j.is_active = TRUE').then(res => res.rows[0].count)
    };
  }

  async suggestLearningPath(data) {
    const { role, skills = [] } = data;
    
    // Fallback direct expert advice mapping
    const expertAdvice = {
      'Frontend Developer': {
        mustHave: ['React', 'Next.js', 'TypeScript'],
        ui: ['Tailwind CSS', 'Bootstrap', 'Figma'],
        message: "Với Frontend, chỉ biết HTML/CSS là chưa đủ. Bạn cần làm chủ một UI Framework hiện đại như Tailwind CSS để tăng tốc độ phát triển. Ngoài ra, việc hiểu sâu về State Management (Redux/Zustand) và cách tối ưu performance là bắt buộc nếu muốn tiến xa."
      },
      'Backend Developer': {
        mustHave: ['Node.js', 'PostgreSQL', 'Redis'],
        cloud: ['Docker', 'AWS', 'Kubernetes'],
        message: "Làm Backend không chỉ là viết API. Bạn cần hiểu về hệ thống phân tán, caching (Redis) và cách triển khai CI/CD. Đừng chỉ học ngôn ngữ, hãy học cách kiến trúc hệ thống chịu tải cao."
      },
      'Fullstack Developer': {
        mustHave: ['React', 'Node.js', 'PostgreSQL'],
        message: "Fullstack là một con đường rộng. Thay vì học mỗi thứ một tí, hãy tập trung làm chủ một 'Stack' nhất định (ví dụ MERN hoặc PERN) trước khi mở rộng sang Cloud và DevOps."
      }
    };

    if (this.groq) {
      try {
        const prompt = `Bạn là một Senior Tech Lead và Mentor. Tôi muốn ứng tuyển vị trí ${role}. Tôi hiện có kỹ năng: [${skills.join(', ')}]. Hãy tư vấn THẲNG THẮN và THỰC TẾ nhất về những gì tôi thiếu. Ví dụ nếu là frontend thì cần Tailwind, Bootstrap hay gì đó cụ thể. Đừng trả lời chung chung. Trả về format JSON: {"message": "Lời khuyên chi tiết", "suggestions": ["Skill 1", "Skill 2"]}. Chỉ trả về JSON.`;
        const response = await this.groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }]
        });
        const responseText = response.choices[0].message.content;
        const jsonMatch = responseText.match(/\{.*\}/s);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (err) {
        console.error('AI advice failed, falling back to Expert logic', err);
      }
    }

    const advice = expertAdvice[role] || {
      mustHave: ['Problem Solving', 'System Design', 'English'],
      message: "Trong thị trường hiện nay, kỹ năng giải quyết vấn đề và khả năng tự học quan trọng hơn bất kỳ công cụ nào. Hãy tập trung vào việc hiểu bản chất cốt lõi của công nghệ bạn đang dùng."
    };

    const suggestions = advice.mustHave?.filter(s => !skills.includes(s)) || [];
    let finalMessage = advice.message;
    if (suggestions.length > 0) {
      finalMessage += ` Cụ thể, bạn nên bổ sung ngay: ${suggestions.join(', ')}.`;
    }

    return {
      message: finalMessage,
      suggestions: suggestions
    };
  }
}

module.exports = new JobService();
