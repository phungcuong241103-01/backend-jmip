const db = require('../config/db');

class SkillsController {
  async getAll(req, res, next) {
    try {
      const result = await db.query('SELECT * FROM skills ORDER BY name ASC');
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await db.query('SELECT * FROM skills WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Skill not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SkillsController();
