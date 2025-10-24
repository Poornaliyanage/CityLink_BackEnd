import pool from '../config/database.js';

const BusLocation = {
  // ✅ Get all bus locations
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM bus_locations');
    return rows;
  },

  // ✅ Get latest location for a specific bus
  getLatestByBusId: async (bus_id) => {
    const [rows] = await pool.query(
      'SELECT * FROM bus_locations WHERE bus_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [bus_id]
    );
    return rows[0];
  },

  // ✅ Get all locations for a specific bus (optional for tracking history)
  getByBusId: async (bus_id) => {
    const [rows] = await pool.query(
      'SELECT * FROM bus_locations WHERE bus_id = ? ORDER BY recorded_at DESC',
      [bus_id]
    );
    return rows;
  },

  // ✅ Add a new bus location
  create: async (data) => {
    const { bus_id, latitude, longitude } = data;

    const [result] = await pool.query(
      `INSERT INTO bus_locations (bus_id, latitude, longitude, recorded_at)
       VALUES (?, ?, ?, NOW())`,
      [bus_id, latitude, longitude]
    );

    return result.insertId; // Return new location_id
  },

  // ✅ Delete old location records (optional, for cleanup)
  deleteOld: async (bus_id, beforeDate) => {
    const [result] = await pool.query(
      `DELETE FROM bus_locations WHERE bus_id = ? AND recorded_at < ?`,
      [bus_id, beforeDate]
    );
    return result.affectedRows;
  }
};

export default BusLocation;
