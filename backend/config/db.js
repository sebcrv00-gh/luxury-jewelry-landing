const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
});

/**
 * Inicializa la base de datos: crea la BD y tablas si no existen.
 */
async function initDB() {
  // Conexión temporal sin BD para crearla
  const tempConn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
  });

  await tempConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await tempConn.end();

  // Crear tablas
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        clave VARCHAR(255) NOT NULL,
        rol VARCHAR(50) DEFAULT 'cliente',
        telefono VARCHAR(50) DEFAULT NULL,
        direccion VARCHAR(255) DEFAULT NULL,
        foto VARCHAR(255) DEFAULT NULL
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        sku VARCHAR(20) UNIQUE,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        precio DECIMAL(12,2) NOT NULL,
        stock INT DEFAULT 0,
        categoria VARCHAR(100),
        imagen_url VARCHAR(255),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Base de datos y tablas verificadas');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
