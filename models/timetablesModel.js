import pool from '../config/database.js';

const Timetable = {
  // ✅ Get all timetable entries
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM timetables');
    return rows;
  },

  // ✅ Get timetable entry by ID
  getById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM timetables WHERE id = ?', [id]);
    return rows[0];
  },

  // ✅ Update time and location for a timetable entry
  updateTimeAndLocation: async (id, data) => {
    const { time, location } = data;
    const [result] = await pool.query(
      'UPDATE timetables SET time = ?, location = ?, updated_at = NOW() WHERE id = ?',
      [time, location, id]
    );
    return result.affectedRows;
  }
};

export default Timetable;
