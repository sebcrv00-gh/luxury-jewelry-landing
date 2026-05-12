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

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ordenes (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT(11) NOT NULL,
        total DECIMAL(12,2) NOT NULL,
        costo_envio DECIMAL(12,2) DEFAULT 15000.00,
        estado VARCHAR(50) DEFAULT 'pendiente',
        nombre_envio VARCHAR(255) NOT NULL,
        telefono_envio VARCHAR(50) NOT NULL,
        direccion_envio VARCHAR(500) NOT NULL,
        ciudad_envio VARCHAR(100) NOT NULL,
        notas TEXT,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);

    // Migración: Agregar costo_envio si no existe
    try {
      const [columns] = await conn.query("SHOW COLUMNS FROM ordenes LIKE 'costo_envio'");
      if (columns.length === 0) {
        await conn.query('ALTER TABLE ordenes ADD COLUMN costo_envio DECIMAL(12,2) DEFAULT 15000.00 AFTER total');
      }
    } catch (err) {
      console.warn('⚠️ No se pudo verificar/agregar la columna costo_envio:', err.message);
    }

    await conn.query(`
      CREATE TABLE IF NOT EXISTS orden_items (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        orden_id INT(11) NOT NULL,
        producto_nombre VARCHAR(255) NOT NULL,
        producto_precio DECIMAL(12,2) NOT NULL,
        cantidad INT NOT NULL,
        subtotal DECIMAL(12,2) NOT NULL,
        FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT(11) NOT NULL,
        producto_id INT(11) NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_wish (usuario_id, producto_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS direcciones (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT(11) NOT NULL,
        etiqueta VARCHAR(50) DEFAULT 'Casa',
        nombre_completo VARCHAR(255) NOT NULL,
        telefono VARCHAR(50),
        direccion VARCHAR(500) NOT NULL,
        ciudad VARCHAR(100) NOT NULL,
        departamento VARCHAR(100),
        codigo_postal VARCHAR(20),
        es_principal TINYINT(1) DEFAULT 0,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS tickets_soporte (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT(11) NOT NULL,
        asunto VARCHAR(255) NOT NULL,
        mensaje TEXT NOT NULL,
        estado VARCHAR(50) DEFAULT 'abierto',
        orden_id INT(11) DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Base de datos y tablas verificadas');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
