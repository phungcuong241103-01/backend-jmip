const db = require('../config/db');

class LevelsController {
  async getAll(req, res, next) {
    try {
      const result = await db.query('SELECT * FROM levels ORDER BY id ASC');
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await db.query('SELECT * FROM levels WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Level not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LevelsController();
