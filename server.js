import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  createUserTableIfNotExists,
  checkUserTable,
  createBusesTableIfNotExists,
  createRoutesTableIfNotExists,
  createConductorBusTableIfNotExists,
} from "./utils/dbCheck.js";
import pool from "./config/database.js"; // ✅ FIXED: imported pool at the top
import authRoutes from "./routes/auth.js";
import auth from './middleware/auth.js'; // common alternative
import QRCode from 'qrcode';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));

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
  await createRoutesTableIfNotExists();
  await createBusesTableIfNotExists();
  await createConductorBusTableIfNotExists();
};

//genrating the QR code
// configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// helper: generate PNG Buffer from payload string
async function generateQrPngBuffer(payload) {
  // payload should be a string, we keep it short e.g. "bookingId_userId"
  return QRCode.toBuffer(String(payload), { type: 'png', width: 400, margin: 1 });
}

// helper: upload a buffer to Cloudinary and return result (secure_url)
function uploadBufferToCloudinary(buffer, publicId = null, folder = 'booking_qr') {
  return new Promise((resolve, reject) => {
    const opts = {
      folder,
      resource_type: 'image',
      ...(publicId ? { public_id: publicId, unique_filename: false } : {}),
    };

    const uploadStream = cloudinary.uploader.upload_stream(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result); // contains secure_url, public_id, etc.
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}


// Routes
app.use("/api/auth", authRoutes);

app.post("/api/buses/addWithRoute", async (req, res) => {
  const {
    registration_number,
    permit_link,
    seat_count,
    owner_id,
    start_point,
    end_point,
    service,
    conductor_phone,
    is_active,
  } = req.body;

  // Validate input 
  if (!permit_link || !owner_id || !start_point || !end_point || !conductor_phone) { return res.json({ success: false, message: "All valid details are required", }); } 
  //if (!start_point || !end_point) { return res.json({ success: false, message: "Start and End points are required", }); }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1️⃣ Check if route already exists
    const [existingRoute] = await conn.execute(
      "SELECT route_id FROM routes WHERE start_point = ? AND end_point = ?",
      [start_point, end_point]
    );

    let route_id;
    if (existingRoute.length > 0) {
      route_id = existingRoute[0].route_id;
      console.log("✅ Existing route found:", route_id);
    } else {
      const route_name = `${start_point} - ${end_point}`;
      console.log("🆕 Creating new route:", route_name);      
      const [routeResult] = await conn.execute(
        "INSERT INTO routes (route_name, start_point, end_point) VALUES (?, ?, ?)",
        [route_name, start_point, end_point]
      );
      route_id = routeResult.insertId;
      console.log("✅ New route created with ID:", route_id);
    }

    // 2️⃣ Add new bus
    const [busResult] = await conn.execute(
      `INSERT INTO buses 
        (registration_number, permit_link, seat_count, owner_id, route_id, service, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        registration_number,
        permit_link,
        seat_count,
        owner_id,
        route_id,
        service,
        is_active,
      ]
    );

    const bus_id = busResult.insertId;
    console.log("✅ Bus added successfully with ID:", bus_id);

    // 3️⃣ Link conductor to bus
    const [conductorRows] = await conn.execute(
      "SELECT user_id, phone_no, role FROM users WHERE phone_no = ? AND role = 'Conductor' AND is_active = 1",
      [conductor_phone]
    );

    if (conductorRows.length === 0) {
      throw new Error("Conductor not found or inactive");
    }

    const conductor_id = conductorRows[0].user_id;

    await conn.execute(
      "INSERT INTO conductor_bus (bus_id, conductor_id) VALUES (?, ?)",
      [bus_id, conductor_id]
    );

    await conn.commit();
    res.json({ success: true, message: "Bus added successfully!" });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Error adding bus:", err);
    res.status(500).json({
      success: false,
      message: "Server error while adding bus",
      error: err.message,
    });
  } finally {
    conn.release();
  }
});

app.get("/api/buses", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT b.*, r.route_name, r.start_point, r.end_point
      FROM buses b
      LEFT JOIN routes r ON b.route_id = r.route_id
      ORDER BY b.created_at DESC
    `);
    res.json({ success: true, buses: rows });
  } catch (error) {
    console.error("Error fetching buses:", error);
    res.status(500).json({ success: false, message: "Error fetching buses" });
  }
});

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
        AND status = 'Active'

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

// GET bookings for a user (secure - requires auth) for show the user's bookings
app.get("/api/bookings/user/:userId", auth, async (req, res) => {
  const { userId } = req.params;
  console.log("Fetching bookings for user: bckkkk", userId);


  try {
    const [rows] = await pool.query(
      `SELECT 
         b.booking_id,
         b.user_id,
         b.bus_id,
         b.seat_number,
         b.travel_date,
         b.price,
         b.status,
         b.qr_code,
         bus.registration_number,
         bus.service,
         r.route_name,
         r.start_point,
         r.end_point
       FROM bookings b
       JOIN buses bus ON b.bus_id = bus.bus_id
       JOIN routes r ON bus.route_id = r.route_id
       WHERE b.user_id = ?
       ORDER BY b.travel_date DESC`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No bookings found for this user" });
    }

    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error("Error fetching user bookings:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// GET booked seats for a bus on a specific date
app.get("/api/bookings/:busId", async (req, res) => {
  const { busId } = req.params;
  const { date } = req.query;

  if (!busId || !date) {
    return res.status(400).json({ message: "Bus ID and date are required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT seat_number FROM bookings WHERE bus_id = ? AND travel_date = ? AND status = 'Active'",
      [busId, date]
    );

    const bookedSeats = rows.map(row => row.seat_number);
    res.json(bookedSeats);
  } catch (err) {
    console.error("Error fetching booked seats:", err);
    res.status(500).json({ message: "Failed to fetch booked seats", error: err.message });
  }
});


// New secured POST route
// Correct:
// secure booking route (requires `auth` middleware earlier imported)
app.post("/api/bookings", auth, async (req, res) => {
  const userId = req.user?.user_id;
  const { busId, seats, travelDate, price, from, to, service } = req.body;

  console.log("POST /api/bookings body:", req.body);
  console.log("req.user:", req.user);

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: user not found" });
  }
  if (!busId || !Array.isArray(seats) || seats.length === 0 || !travelDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const conn = await pool.getConnection();
  try {
    // Insert bookings inside a transaction, collect inserted IDs
    await conn.beginTransaction();
    const insertedBookingIds = [];

    for (const seatNumber of seats) {
      // prevent double-booking
      const [existing] = await conn.query(
        "SELECT 1 FROM bookings WHERE bus_id = ? AND seat_number = ? AND travel_date = ? AND status = 'Active'",
        [busId, seatNumber, travelDate]
      );
      if (existing.length > 0) {
        throw new Error(`Seat ${seatNumber} is already booked`);
      }

      const [result] = await conn.query(
        "INSERT INTO bookings (user_id, bus_id, seat_number, travel_date, price, status) VALUES (?, ?, ?, ?, ?, 'Active')",
        [userId, busId, seatNumber, travelDate, price ?? null]
      );

      // record booking id for QR generation
      insertedBookingIds.push(result.insertId);
    }

    // Commit DB inserts now so booking IDs are persistent
    await conn.commit();

    // Now generate QR + upload + update DB per inserted booking
    // (do this after commit to avoid long-running transaction on network calls)
    for (const bookingId of insertedBookingIds) {
      try {
        // Build QR payload from bookingId and userId per your requirement
        const qrPayload = `${bookingId}_${userId}`;

        // Generate PNG buffer
        const pngBuffer = await generateQrPngBuffer(qrPayload);

        // optional deterministic public id so you can overwrite/retrieve easily
        const publicId = `booking_${bookingId}`;

        // Upload to Cloudinary
        const uploadRes = await uploadBufferToCloudinary(pngBuffer, publicId, 'booking_qr');

        const qrUrl = uploadRes.secure_url; // the HTTPS link

        // Update booking row with the QR URL
        await pool.query("UPDATE bookings SET qr_code = ? WHERE booking_id = ?", [qrUrl, bookingId]);

        console.log(`QR uploaded for booking ${bookingId}: ${qrUrl}`);
      } catch (qrErr) {
        console.error(`Failed to generate/upload QR for booking ${bookingId}:`, qrErr);
        // decide: continue to next booking (we do), or report failure to caller.
        // bookings exist even if the QR upload failed; you may retry later.
      }
    }

    res.status(201).json({
      success: true,
      message: "Seats booked successfully",
      bookingIds: insertedBookingIds,
    });
  } catch (err) {
    // rollback if we failed during insertion
    try { await conn.rollback(); } catch (e) {}
    console.error("Error creating booking(s):", err);
    res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// GET booking detail by booking id (secure - requires auth)
app.get('/api/bookings/detail/:bookingId', auth, async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) return res.status(400).json({ message: 'Missing bookingId' });

  try {
    const [rows] = await pool.query(
      `SELECT 
         b.booking_id,
         b.user_id,
         b.bus_id,
         b.seat_number,
         b.travel_date,
         b.price,
         b.qr_code,
         u.name AS passenger_name,
         u.phone_no AS passenger_phone,
         bus.registration_number AS bus_registration,
         bus.service AS bus_service,
         r.route_name,
         r.route_number
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.user_id
       LEFT JOIN buses bus ON b.bus_id = bus.bus_id
       LEFT JOIN routes r ON bus.route_id = r.route_id
       WHERE b.booking_id = ?
       LIMIT 1`,
      [bookingId]
    );

    if (!rows || rows.length === 0) {
         console.log("Fetching booking for ID:", bookingId);
      return res.status(404).json({ message: 'Booking not found' });
   

    }

    const row = rows[0];
    res.json({
      booking_id: row.booking_id,
      user_id: row.user_id,
      seat_number: row.seat_number,
      travel_date: row.travel_date,
      price: row.price,
      qr_code: row.qr_code,
      passenger: {
        name: row.passenger_name,
        phone: row.passenger_phone
      },
      bus: {
        registration_number: row.bus_registration,
        service: row.bus_service
      },
      route: {
        name: row.route_name,
        number: row.route_number
      }
    });
  } catch (err) {
    console.error('Error fetching booking detail:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

 // Mark a booking as Completed (secure)
app.post("/api/bookings/:bookingId/complete", auth, async (req, res) => {
  const { bookingId } = req.params;
  const caller = req.user; // set by auth middleware

  if (!bookingId) {
    return res.status(400).json({ success: false, message: "Missing bookingId" });
  }

  try {
    // Optional role check: only allow conductors/admins to mark as completed
    // Uncomment or adjust as you need:
    if (!['Conductor','Admin'].includes(caller.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Only mark if currently Active (prevents re-marking canceled/completed)
    const [result] = await pool.query(
      "UPDATE bookings SET status = 'Completed' WHERE booking_id = ? AND status = 'Active'",
      [bookingId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: "Booking not found or not in an Active state"
      });
    }

    console.log(`Booking ${bookingId} marked as Completed by user ${caller.user_id}`);

    res.json({
      success: true,
      message: "Booking status updated to Completed",
      bookingId: Number(bookingId)
    });
  } catch (err) {
    console.error("Error updating booking status:", err);
    res.status(500).json({ success: false, message: "Server error" });
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
