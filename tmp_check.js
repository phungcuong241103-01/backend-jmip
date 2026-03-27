require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Check if role_skills table exists
    const roleSkills = tables.rows.find(r => r.table_name === 'role_skills');
    console.log('role_skills exists:', !!roleSkills);
    
    // Test the getMarketStats queries
    console.log('\n--- Testing getMarketStats queries ---');
    const totalJobs = await pool.query('SELECT COUNT(*) FROM jobs');
    console.log('Total jobs:', totalJobs.rows[0].count);
    
    const topSkills = await pool.query(`SELECT s.name, COUNT(js.job_id) as count FROM skills s JOIN job_skills js ON s.id = js.skill_id GROUP BY s.name ORDER BY count DESC LIMIT 5`);
    console.log('Top skills:', topSkills.rows);
    
    const totalJobSkills = await pool.query('SELECT COUNT(*) FROM job_skills');
    console.log('Total job_skills:', totalJobSkills.rows[0].count);
    
    const locationStats = await pool.query(`SELECT loc.city as name, COUNT(j.id) as count FROM locations loc JOIN jobs j ON loc.id = j.location_id GROUP BY loc.city ORDER BY count DESC`);
    console.log('Location stats:', locationStats.rows);
    
    const salaryStats = await pool.query(`SELECT r.name as role, AVG(j.salary_min) as avg_min, AVG(j.salary_max) as avg_max FROM roles r JOIN jobs j ON r.id = j.role_id WHERE j.salary_min IS NOT NULL GROUP BY r.name ORDER BY avg_min DESC LIMIT 5`);
    console.log('Salary stats:', salaryStats.rows);
    
    const totalSkills = await pool.query('SELECT COUNT(*) FROM skills');
    console.log('Total skills:', totalSkills.rows[0].count);
    
    const activeCompanies = await pool.query('SELECT COUNT(*) FROM companies');
    console.log('Active companies:', activeCompanies.rows[0].count);
    
    console.log('\n--- All getMarketStats queries passed! ---');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
}
check();
