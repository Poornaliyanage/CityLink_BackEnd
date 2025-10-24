import pool from '../config/database.js';

const User = {
  // ✅ Get all active users
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM users WHERE is_active = 1');
    return rows;
  },

  // ✅ Get user by ID
  getById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);
    return rows[0];
  },

  // ✅ Get user by email (useful for login)
  getByEmail: async (email) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  },

  // ✅ Create (Register) new user
  create: async (data) => {
    const {
      name,
      email,
      password,
      google_id = null,
      auth_type = 'Email',
      role = 'User',
      NIC = null,
      phone_no = null,
      is_active = 1
    } = data;

    const [result] = await pool.query(
      `INSERT INTO users 
       (name, email, password, google_id, auth_type, role, NIC, phone_no, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, email, password, google_id, auth_type, role, NIC, phone_no, is_active]
    );

    return result.insertId; // Return the new user’s ID
  },

  // ✅ Update user details
  update: async (id, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE user_id = ?`,
      values
    );

    return result.affectedRows;
  },

  // ✅ Soft delete (deactivate user)
  deactivate: async (id) => {
    const [result] = await pool.query(
      'UPDATE users SET is_active = 0, updated_at = NOW() WHERE user_id = ?',
      [id]
    );
    return result.affectedRows;
  }
};

export default User;
