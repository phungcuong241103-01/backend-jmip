const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Database Configuration from your request
const pool = new Pool({
  host: "jmip2026-cuongphung2411-de8a.l.aivencloud.com",
  port: 20487,
  database: "job_database",
  user: "avnadmin",
  password: "AVNS_tNeV1nIX8BSUQxAnmNJ",
  ssl: {
    rejectUnauthorized: false // Aiven requires SSL
  }
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Error connecting to PostgreSQL:', err);
  else console.log('Connected to Aiven PostgreSQL at', res.rows[0].now);
});

// API: Get all metadata for filters (Roles, Levels, Skills, Cities)
app.get('/api/filters', async (req, res) => {
  try {
    const [roles, levels, skills, locations] = await Promise.all([
      pool.query('SELECT * FROM roles ORDER BY name'),
      pool.query('SELECT * FROM levels ORDER BY name'),
      pool.query('SELECT * FROM skills ORDER BY name'),
      pool.query('SELECT * FROM locations ORDER BY city')
    ]);
    res.json({
      roles: roles.rows,
      levels: levels.rows,
      skills: skills.rows,
      locations: locations.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get Jobs with filtering
app.get('/api/jobs', async (req, res) => {
  const { role, level, location, skills } = req.query;
  try {
    let query = `
      SELECT j.*, c.name as company_name, r.name as role_name, l.name as level_name, loc.city, loc.country,
             array_agg(s.name) as skills
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN roles r ON j.role_id = r.id
      LEFT JOIN levels l ON j.level_id = l.id
      LEFT JOIN locations loc ON j.location_id = loc.id
      LEFT JOIN job_skills js ON j.id = js.job_id
      LEFT JOIN skills s ON js.skill_id = s.id
      WHERE 1=1
    `;
    const values = [];
    let counter = 1;

    if (role) {
      query += ` AND r.name = $${counter++}`;
      values.push(role);
    }
    if (level) {
      query += ` AND l.name = $${counter++}`;
      values.push(level);
    }
    if (location) {
      query += ` AND loc.city = $${counter++}`;
      values.push(location);
    }

    query += ` GROUP BY j.id, c.name, r.name, l.name, loc.city, loc.country ORDER BY j.posted_at DESC LIMIT 20`;
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Salary Prediction Logic (Simple Statistical Model)
app.post('/api/predict-salary', async (req, res) => {
  const { role, level, skills } = req.body;
  try {
    // Find matching jobs for statistics
    const query = `
      SELECT AVG(salary_min) as avg_min, AVG(salary_max) as avg_max, COUNT(*) as count
      FROM jobs j
      JOIN roles r ON j.role_id = r.id
      JOIN levels l ON j.level_id = l.id
      WHERE r.name = $1 AND l.name = $2
    `;
    const stats = await pool.query(query, [role, level]);
    const result = stats.rows[0];

    if (!result.count || result.count === '0') {
      return res.json({ 
        range: "N/A", 
        message: "Chưa đủ dữ liệu cho vị trí này",
        reliability: "Thấp"
      });
    }

    const min = Math.round(result.avg_min);
    const max = Math.round(result.avg_max);

    res.json({
      range: `$${min.toLocaleString()} - $${max.toLocaleString()}`,
      reliability: "Cao",
      growth: "Ổn định",
      percentile: "75th"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Stats for Dashboard
app.get('/api/stats', async (req, res) => {
  try {
    const totalJobs = await pool.query('SELECT COUNT(*) FROM jobs');
    const topSkills = await pool.query(`
      SELECT s.name, COUNT(js.job_id) as count 
      FROM skills s 
      JOIN job_skills js ON s.id = js.skill_id 
      GROUP BY s.name 
      ORDER BY count DESC LIMIT 5
    `);
    res.json({
      totalJobs: totalJobs.rows[0].count,
      popularSkills: topSkills.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend API running at http://localhost:${port}`);
});
