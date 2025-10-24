import { pool } from '../config/database.js';

export const checkUserTable = async () => {
  try {
    const [rows] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND TABLE_SCHEMA = '${process.env.DB_NAME}'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 Users Table Structure:');
    console.table(rows);
    
    return rows;
  } catch (error) {
    console.error('❌ Error checking users table:', error.message);
    return null;
  }
};

export const createUserTableIfNotExists = async () => {
  try {
    // First check if table exists and has correct structure
    const [tables] = await pool.execute(
      `SHOW TABLES LIKE 'users'`
    );

    if (tables.length > 0) {
      console.log('✅ Users table already exists');
      
      // Check if we need to alter the table structure
      const [columns] = await pool.execute(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' 
        AND TABLE_SCHEMA = '${process.env.DB_NAME}'
      `);
      
      // Check if phone_no needs to be altered from int to varchar
      const phoneColumn = columns.find(col => col.COLUMN_NAME === 'phone_no');
      if (phoneColumn && phoneColumn.DATA_TYPE === 'int') {
        console.log('🔄 Altering phone_no column from int to varchar...');
        await pool.execute(`
          ALTER TABLE users 
          MODIFY phone_no VARCHAR(15) NOT NULL
        `);
        console.log('✅ phone_no column altered successfully');
      }
      
      return; // Table exists, no need to create
    }

    // Create table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255),
        google_id VARCHAR(255) NULL,
        auth_type ENUM('email', 'google') DEFAULT 'email',
        role ENUM('Passenger', 'Conductor', 'Bus Owner') NOT NULL,
        NIC VARCHAR(20) NOT NULL,
        phone_no VARCHAR(15) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_nic (NIC),
        INDEX idx_phone (phone_no)
      )
    `;
    
    await pool.execute(createTableSQL);
    console.log('✅ Users table created successfully');
  } catch (error) {
    console.error('❌ Error with users table:', error.message);
  }
};

export const createRoutesTableIfNotExists = async () => {
  try {
    const [tables] = await pool.execute(`SHOW TABLES LIKE 'routes'`);
    if (tables.length > 0) {
      console.log("✅ Routes table already exists");
      return;
    }

    const createTableSQL = `
      CREATE TABLE routes (
        route_id INT AUTO_INCREMENT PRIMARY KEY,
        start_point VARCHAR(100) NOT NULL,
        end_point VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_route (start_point, end_point)
      )
    `;
    await pool.execute(createTableSQL);
    console.log("✅ Routes table created successfully");
  } catch (error) {
    console.error("❌ Error creating routes table:", error.message);
  }
};

/* ---------------- BUSES TABLE ---------------- */
export const checkBusesTable = async () => {
  try {
    const [rows] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'buses' 
      AND TABLE_SCHEMA = '${process.env.DB_NAME}'
      ORDER BY ORDINAL_POSITION
    `);
    console.log("📋 Buses Table Structure:");
    console.table(rows);
    return rows;
  } catch (error) {
    console.error("❌ Error checking buses table:", error.message);
    return null;
  }
};

export const createBusesTableIfNotExists = async () => {
  try {
    const [tables] = await pool.execute(`SHOW TABLES LIKE 'buses'`);
    if (tables.length > 0) {
      console.log("✅ Buses table already exists");
      return;
    }

    const createTableSQL = `
      CREATE TABLE buses (
        bus_id INT AUTO_INCREMENT PRIMARY KEY,
        registration_number VARCHAR(20),
        permit_link VARCHAR(255) NOT NULL,
   
        seat_count INT DEFAULT 0,
        owner_id INT NOT NULL,
        route_id INT NOT NULL,
        service ENUM('N', 'L', 'S', 'XL') DEFAULT 'N',
        
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_owner (owner_id),
        INDEX idx_route (route_id)
      )
    `;

    await pool.execute(createTableSQL);
    console.log("✅ Buses table created successfully");
  } catch (error) {
    console.error("❌ Error with buses table:", error.message);
  }
};

/* ---------------- CONDUCTOR_BUS TABLE ---------------- */
export const createConductorBusTableIfNotExists = async () => {
  try {
    const [tables] = await pool.execute(`SHOW TABLES LIKE 'conductor_bus'`);
    if (tables.length > 0) {
      console.log("✅ Conductor_Bus table already exists");
      return;
    }

    const createTableSQL = `
      CREATE TABLE conductor_bus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conductor_id INT NOT NULL,
        bus_id INT NOT NULL,
        assigned_by INT NULL,
        is_active TINYINT(1) DEFAULT 1,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_conductor (conductor_id),
        INDEX idx_bus (bus_id)
      )
    `;
    await pool.execute(createTableSQL);
    console.log("✅ Conductor_Bus table created successfully");
  } catch (error) {
    console.error("❌ Error creating conductor_bus table:", error.message);
  }
};
