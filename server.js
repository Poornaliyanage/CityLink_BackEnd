import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createUserTableIfNotExists, checkUserTable } from "./utils/dbCheck.js";
import pool from "./config/database.js"; // ✅ FIXED: imported pool at the top
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "exp://172.20.10.5:*"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Initialize database on startup
const initializeDatabase = async () => {
  await createUserTableIfNotExists();
  await checkUserTable();
};

// Routes
app.use("/api/auth", authRoutes);

// ✅ FIXED: SEAT RESERVATION ROUTES
app.get("/api/seat-reservation/start-locations", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT DISTINCT start_point FROM routes");
    // Extract just the start_point values into a string array
    const startLocations = rows.map(row => row.start_point.trim());
    
    res.json({ 
      success: true, 
      startLocations: startLocations // Changed from 'data' to 'startLocations'
    });
  } catch (error) {
    console.error("Error fetching start locations:", error);
    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

app.get("/api/seat-reservation/end-locations", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT DISTINCT end_point FROM routes");
    // Extract just the end_point values into a string array
    const endLocations = rows.map(row => row.end_point.trim());
    
    res.json({ 
      success: true, 
      endLocations: endLocations // Changed from 'data' to 'endLocations'
    });
  } catch (error) {
    console.error("Error fetching end locations:", error);
    res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message,
    });
  }
});

// Health check route
app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT 1 as db_status");
    res.status(200).json({
      success: true,
      message: "CityLink API is running!",
      database: "Connected ✅",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: "CityLink API is running!",
      database: "Disconnected ❌",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      error: error.message,
    });
  }
});

// Backend API endpoint - e.g., routes/seatReservation.js

// app.post('/api/seat-reservation/search-buses', async (req, res) => {
//   try {
//     const { from, to, date, numberOfSeats, service } = req.body;

//     // Validate inputs
//     if (!from || !to || !date || !numberOfSeats || !service) {
//       return res.status(400).json({ 
//         message: 'All fields are required' 
//       });
//     }

//     // Fixed query - removed b.permit_no
//     const query = `
//       SELECT 
//         b.bus_id,
//         b.registration_number,
//         b.seat_count,
//         b.service,
//         r.route_id,
//         r.route_name,
//         r.route_number,
//         r.start_point,
//         r.end_point,
//         r.price,
//         r.distance,
//         (b.seat_count - COALESCE(booked_seats.count, 0)) as availableSeats
//       FROM buses b
//       INNER JOIN routes r ON b.route_id = r.route_id
//       LEFT JOIN (
//         SELECT bus_id, COUNT(*) as count
//         FROM bookings
//         WHERE travel_date = ? 
//         AND status IN ('confirmed', 'pending')
//         GROUP BY bus_id
//       ) booked_seats ON b.bus_id = booked_seats.bus_id
//       WHERE r.start_point = ?
//       AND r.end_point = ?
//       AND b.service = ?
//       AND b.is_active = 1
//       AND (b.seat_count - COALESCE(booked_seats.count, 0)) >= ?
//       ORDER BY r.price ASC
//     `;

//     const [buses] = await pool.query(query, [date, from, to, service, numberOfSeats]);

//     if (buses.length === 0) {
//       return res.status(404).json({
//         message: 'No available buses found for the selected route and date',
//         availableBuses: []
//       });
//     }

//     // Format the response - removed permit_no
//     const availableBuses = buses.map(bus => ({
//       bus_id: bus.bus_id,
//       registration_number: bus.registration_number,
//       service: bus.service,
//       route_name: bus.route_name,
//       route_number: bus.route_number,
//       start_point: bus.start_point,
//       end_point: bus.end_point,
//       price: bus.price,
//       distance: bus.distance,
//       totalSeats: bus.seat_count,
//       availableSeats: bus.availableSeats
//     }));

//     res.status(200).json({
//       message: 'Buses found successfully',
//       availableBuses,
//       searchCriteria: {
//         from,
//         to,
//         date,
//         numberOfSeats,
//         service
//       }
//     });

//   } catch (error) {
//     console.error('Error searching buses:', error);
//     res.status(500).json({ 
//       message: 'Internal server error while searching buses' 
//     });
//   }
// });

// app.post('/api/seat-reservation/search-buses', async (req, res) => {
//   try {
//     const { from, to, date, numberOfSeats, service } = req.body;

//     console.log("🔍 SEARCH REQUEST:", { from, to, date, numberOfSeats, service });

//     // Validate inputs
//     if (!from || !to || !date || !numberOfSeats || !service) {
//       return res.status(400).json({ 
//         message: 'All fields are required' 
//       });
//     }

//     // Check if routes exist for the given from/to
//     const [routes] = await pool.query(
//       "SELECT * FROM routes WHERE start_point = ? AND end_point = ?",
//       [from, to]
//     );
//     console.log("📍 MATCHING ROUTES:", routes);

//     if (routes.length === 0) {
//       console.log("❌ No routes found for:", from, "→", to);
//       return res.status(404).json({
//         message: 'No routes found for the selected cities',
//         availableBuses: []
//       });
//     }

//     // Check if buses exist for this route and service
//     const [busesCheck] = await pool.query(
//       `SELECT b.*, r.start_point, r.end_point 
//        FROM buses b 
//        INNER JOIN routes r ON b.route_id = r.route_id 
//        WHERE r.start_point = ? AND r.end_point = ? AND b.service = ? AND b.is_active = 1`,
//       [from, to, service]
//     );
//     console.log("🚌 MATCHING BUSES:", busesCheck);

//     // Your main query (fixed - removed permit_no)
//     const query = `
//       SELECT 
//         b.bus_id,
//         b.registration_number,
//         b.seat_count,
//         b.service,
//         r.route_id,
//         r.route_name,
//         r.route_number,
//         r.start_point,
//         r.end_point,
//         r.price,
//         r.distance,
//         (b.seat_count - COALESCE(booked_seats.count, 0)) as availableSeats
//       FROM buses b
//       INNER JOIN routes r ON b.route_id = r.route_id
//       LEFT JOIN (
//         SELECT bus_id, COUNT(*) as count
//         FROM bookings
//         WHERE travel_date = ? 
//         AND status IN ('confirmed', 'pending')
//         GROUP BY bus_id
//       ) booked_seats ON b.bus_id = booked_seats.bus_id
//       WHERE r.start_point = ?
//       AND r.end_point = ?
//       AND b.service = ?
//       AND b.is_active = 1
//       AND (b.seat_count - COALESCE(booked_seats.count, 0)) >= ?
//       ORDER BY r.price ASC
//     `;

//     console.log("📊 EXECUTING MAIN QUERY...");
//     const [buses] = await pool.query(query, [date, from, to, service, numberOfSeats]);
//     console.log("✅ QUERY RESULTS:", buses);

//     if (buses.length === 0) {
//       console.log("❌ No available buses after applying all filters");
//       return res.status(404).json({
//         message: 'No available buses found for the selected route and date',
//         availableBuses: []
//       });
//     }

//     // Format the response
//     const availableBuses = buses.map(bus => ({
//       bus_id: bus.bus_id,
//       registration_number: bus.registration_number,
//       service: bus.service,
//       route_name: bus.route_name,
//       route_number: bus.route_number,
//       start_point: bus.start_point,
//       end_point: bus.end_point,
//       price: bus.price,
//       distance: bus.distance,
//       totalSeats: bus.seat_count,
//       availableSeats: bus.availableSeats
//     }));

//     console.log("🎉 SUCCESS: Found", availableBuses.length, "buses");
//     res.status(200).json({
//       message: 'Buses found successfully',
//       availableBuses,
//       searchCriteria: {
//         from,
//         to,
//         date,
//         numberOfSeats,
//         service
//       }
//     });

//   } catch (error) {
//     console.error('❌ Error searching buses:', error);
//     res.status(500).json({ 
//       message: 'Internal server error while searching buses' 
//     });
//   }
// });

app.post('/api/seat-reservation/search-buses', async (req, res) => {
  try {
    const { from, to, date, numberOfSeats, service } = req.body;

    console.log("🔍 SEARCH REQUEST:", { from, to, date, numberOfSeats, service });

    // Validate inputs
    if (!from || !to || !date || !numberOfSeats || !service) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    // Check if routes exist for the given from/to
    const [routes] = await pool.query(
      "SELECT * FROM routes WHERE start_point = ? AND end_point = ?",
      [from, to]
    );
    console.log("📍 MATCHING ROUTES:", routes);

    if (routes.length === 0) {
      console.log("❌ No routes found for:", from, "→", to);
      return res.status(404).json({
        message: 'No routes found for the selected cities',
        availableBuses: []
      });
    }

    // Check if buses exist for this route and service
    const [busesCheck] = await pool.query(
      `SELECT b.*, r.start_point, r.end_point 
       FROM buses b 
       INNER JOIN routes r ON b.route_id = r.route_id 
       WHERE r.start_point = ? AND r.end_point = ? AND b.service = ? AND b.is_active = 1`,
      [from, to, service]
    );
    console.log("🚌 MATCHING BUSES:", busesCheck);

    // Updated query to match your actual table structure
    const query = `
      SELECT 
        b.bus_id,
        b.registration_number,
        b.seat_count,
        b.service,
        r.route_id,
        r.route_name,
        r.route_number,
        r.start_point,
        r.end_point,
        r.price,
        r.distance,
        (b.seat_count - COALESCE(booked_seats.count, 0)) as availableSeats
      FROM buses b
      INNER JOIN routes r ON b.route_id = r.route_id
      LEFT JOIN (
        SELECT bus_id, COUNT(*) as count
        FROM bookings
        WHERE travel_date = ? 
        AND status IN ('confirmed', 'pending')
        GROUP BY bus_id
      ) booked_seats ON b.bus_id = booked_seats.bus_id
      WHERE r.start_point = ?
      AND r.end_point = ?
      AND b.service = ?
      AND b.is_active = 1
      AND (b.seat_count - COALESCE(booked_seats.count, 0)) >= ?
      ORDER BY r.price ASC
    `;

    console.log("📊 EXECUTING MAIN QUERY...");
    const [buses] = await pool.query(query, [date, from, to, service, numberOfSeats]);
    console.log("✅ QUERY RESULTS:", buses);

    if (buses.length === 0) {
      console.log("❌ No available buses after applying all filters");
      return res.status(404).json({
        message: 'No available buses found for the selected route and date',
        availableBuses: []
      });
    }

    // Format the response - removed permit_no since it doesn't exist
    const availableBuses = buses.map(bus => ({
      bus_id: bus.bus_id,
      registration_number: bus.registration_number,
      service: bus.service,
      route_name: bus.route_name,
      route_number: bus.route_number,
      start_point: bus.start_point,
      end_point: bus.end_point,
      price: bus.price,
      distance: bus.distance,
      totalSeats: bus.seat_count,
      availableSeats: bus.availableSeats
    }));

    console.log("🎉 SUCCESS: Found", availableBuses.length, "buses");
    res.status(200).json({
      message: 'Buses found successfully',
      availableBuses,
      searchCriteria: {
        from,
        to,
        date,
        numberOfSeats,
        service
      }
    });

  } catch (error) {
    console.error('❌ Error searching buses:', error);
    res.status(500).json({ 
      message: 'Internal server error while searching buses',
      error: error.message 
    });
  }
});



// Database info route (for debugging)
app.get("/api/db-info", async (req, res) => {
  try {
    const [users] = await pool.execute("SELECT COUNT(*) as user_count FROM users");
    const [tables] = await pool.execute("SHOW TABLES");
    res.json({
      success: true,
      database: process.env.DB_NAME,
      user_count: users[0].user_count,
      tables: tables.map((t) => Object.values(t)[0]),
      connection: "Active",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to CityLink Backend API",
    version: "1.0.0",
    database: "FreeSQLDatabase.com",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        profile: "GET /api/auth/me",
      },
      seat_reservation: {
        start_locations: "GET /api/seat-reservation/start-locations",
        end_locations: "GET /api/seat-reservation/end-locations?start_point=XYZ",
      },
      utility: {
        health: "GET /api/health",
        db_info: "GET /api/db-info",
      },
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error Stack:", err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "404",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 CityLink server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log(`📊 Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();
