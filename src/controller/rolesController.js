const db = require('../config/db');
const cache = require('../config/cache');

class RolesController {
  async getAll(req, res, next) {
    try {
      const cached = cache.get('meta:roles');
      if (cached) return res.json(cached);

      const result = await db.query('SELECT * FROM roles ORDER BY name ASC');
      cache.set('meta:roles', result.rows, 3600); // 1 giờ
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await db.query('SELECT * FROM roles WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Role not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RolesController();
