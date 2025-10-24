import pool from '../config/database.js';

const Bus = {
  // ✅ Get all active buses
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM buses WHERE is_active = 1');
    return rows;
  },

  // ✅ Get bus by ID
  getById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM buses WHERE bus_id = ?', [id]);
    return rows[0];
  },

  // ✅ Create (Add) a new bus
  create: async (data) => {
    const {
      permit_link,
      seat_count = 0,
      owner_id,
      route_id,
      service,
      registration_number,
      is_active = 1
    } = data;

    const [result] = await pool.query(
      `INSERT INTO buses 
        (permit_link, seat_count, owner_id, route_id, service, registration_number, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [permit_link, seat_count, owner_id, route_id, service, registration_number, is_active]
    );

    return result.insertId; // Return new bus ID
  },

  // ✅ Update bus details
  update: async (id, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE buses 
       SET ${fields.join(', ')}, created_at = NOW() 
       WHERE bus_id = ?`,
      values
    );

    return result.affectedRows;
  },

  // ✅ Soft delete / deactivate a bus
  deactivate: async (id) => {
    const [result] = await pool.query(
      `UPDATE buses 
       SET is_active = 0, created_at = NOW() 
       WHERE bus_id = ?`,
      [id]
    );

    return result.affectedRows;
  }
};

export default Bus;
