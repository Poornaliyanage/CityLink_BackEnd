import pool from '../config/database.js';

const BusOwner = {
  // ✅ Get all bus owners
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM bus_owners');
    return rows;
  },

  // ✅ Get bus owner by user_id
  getByUserId: async (user_id) => {
    const [rows] = await pool.query('SELECT * FROM bus_owners WHERE user_id = ?', [user_id]);
    return rows[0];
  },

  // ✅ Create new bus owner
  create: async (data) => {
    const { user_id, company_name } = data;

    const [result] = await pool.query(
      `INSERT INTO bus_owners (user_id, company_name) VALUES (?, ?)`,
      [user_id, company_name]
    );

    return result.insertId; // returns the new record’s ID
  },

  // ✅ Update bus owner details
  update: async (user_id, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(user_id);

    const [result] = await pool.query(
      `UPDATE bus_owners SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );

    return result.affectedRows;
  },

  // ✅ Delete bus owner (if needed)
  delete: async (user_id) => {
    const [result] = await pool.query('DELETE FROM bus_owners WHERE user_id = ?', [user_id]);
    return result.affectedRows;
  }
};

export default BusOwner;
