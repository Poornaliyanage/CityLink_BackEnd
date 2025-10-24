import pool from '../config/database.js';

const ConductorBus = {
  // ✅ Get all active conductor-bus assignments
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM conductor_bus WHERE is_active = 1');
    return rows;
  },

  // ✅ Get assignment by ID
  getById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM conductor_bus WHERE id = ?', [id]);
    return rows[0];
  },

  // ✅ Assign a conductor to a bus
  create: async (data) => {
    const { conductor_id, bus_id, assigned_by, is_active = 1 } = data;

    const [result] = await pool.query(
      `INSERT INTO conductor_bus 
        (conductor_id, bus_id, assigned_by, is_active, assigned_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [conductor_id, bus_id, assigned_by, is_active]
    );

    return result.insertId; // Return new assignment ID
  },

  // ✅ Update assignment details (e.g., deactivate, reassign)
  update: async (id, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE conductor_bus 
       SET ${fields.join(', ')}, assigned_at = NOW() 
       WHERE id = ?`,
      values
    );

    return result.affectedRows;
  },

  // ✅ Soft delete / deactivate assignment
  deactivate: async (id) => {
    const [result] = await pool.query(
      `UPDATE conductor_bus 
       SET is_active = 0, assigned_at = NOW() 
       WHERE id = ?`,
      [id]
    );

    return result.affectedRows;
  }
};

export default ConductorBus;
