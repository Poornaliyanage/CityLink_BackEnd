import pool from '../config/database.js';

const Booking = {
  // ✅ Get all bookings
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM bookings');
    return rows;
  },

  // ✅ Get booking by ID
  getById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM bookings WHERE booking_id = ?', [id]);
    return rows[0];
  },

  // ✅ Create (Add) a new booking
  create: async (data) => {
    const {
      user_id,
      bus_id,
      seat_number,
      qr_code = null,
      travel_date,
      status = 'Active',
      price
    } = data;

    const [result] = await pool.query(
      `INSERT INTO bookings 
        (user_id, bus_id, seat_number, qr_code, booking_date, travel_date, status, price)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [user_id, bus_id, seat_number, qr_code, travel_date, status, price]
    );

    return result.insertId; // Return new booking ID
  },

  // ✅ Update booking details
  update: async (id, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE bookings 
       SET ${fields.join(', ')}, booking_date = NOW() 
       WHERE booking_id = ?`,
      values
    );

    return result.affectedRows;
  },

  // ✅ Cancel / deactivate a booking
  cancel: async (id) => {
    const [result] = await pool.query(
      `UPDATE bookings 
       SET status = 'Cancelled', booking_date = NOW() 
       WHERE booking_id = ?`,
      [id]
    );

    return result.affectedRows;
  }
};

export default Booking;
