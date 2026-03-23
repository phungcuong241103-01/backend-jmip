const db = require('../config/db');

class CompaniesController {
  async getAll(req, res, next) {
    try {
      const result = await db.query('SELECT * FROM companies ORDER BY name ASC');
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await db.query('SELECT * FROM companies WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Company not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CompaniesController();
