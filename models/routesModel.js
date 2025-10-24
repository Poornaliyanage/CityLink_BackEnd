import pool from '../config/database.js';

const Route = {
  // ✅ Get all routes
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM routes');
    return rows;
  },

  // ✅ Get route by ID
  getById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM routes WHERE route_id = ?', [id]);
    return rows[0];
  },

  // ✅ Update route details
  update: async (id, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE routes SET ${fields.join(', ')} WHERE route_id = ?`,
      values
    );

    return result.affectedRows;
  }
};

export default Route;
