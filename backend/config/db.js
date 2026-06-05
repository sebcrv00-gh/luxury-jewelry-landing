const mysql = require('mysql2/promise');
require('dotenv').config();

function buildProductRef(name) {
  return String(name || 'producto')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'producto';
}

const connectionLimit =
  process.env.DB_CONNECTION_LIMIT && process.env.DB_CONNECTION_LIMIT !== ''
    ? parseInt(process.env.DB_CONNECTION_LIMIT, 10)
    : 3;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: (process.env.DB_PORT && process.env.DB_PORT !== "") ? parseInt(process.env.DB_PORT, 10) : 3306,
  waitForConnections: true,
  connectionLimit,
  maxIdle: Math.min(connectionLimit, 2),
  idleTimeout: 60000,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 10000,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Inicializa la base de datos: crea la BD y tablas si no existen.
 */
async function initDB() {
  // Conexión temporal sin BD para crearla
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: (process.env.DB_PORT && process.env.DB_PORT !== "") ? parseInt(process.env.DB_PORT, 10) : 3306,
    connectTimeout: 10000,
    ssl: {
      rejectUnauthorized: false
    }
  };

  console.log('--- Intentando conectar con: ---');
  console.log('Host:', dbConfig.host);
  console.log('User:', dbConfig.user);
  console.log('Port:', dbConfig.port);
  console.log('Database target:', process.env.DB_NAME);
  console.log('---------------------------------');

  let tempConn;
  try {
    tempConn = await mysql.createConnection(dbConfig);
    await tempConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await tempConn.end();
    console.log('✅ Verificación/Creación de Base de Datos exitosa o confirmada');
  } catch (err) {
    console.warn('⚠️ Advertencia: No se pudo verificar o crear la base de datos desde la conexión raíz.');
    console.warn('   Detalle:', err.message);
    console.warn('   Se intentará conectar directamente al pool. Si la base de datos ya existe, esto debería funcionar.');
    if (tempConn && tempConn.end) {
      try { await tempConn.end(); } catch (e) {}
    }
  }

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
        foto LONGTEXT DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        primer_envio_gratis_usado TINYINT(1) DEFAULT 0
      )
    `);

    try {
      const [createdAtColumn] = await conn.query("SHOW COLUMNS FROM usuarios LIKE 'creado_en'");
      if (createdAtColumn.length === 0) {
        await conn.query('ALTER TABLE usuarios ADD COLUMN creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER foto');
      }
    } catch (err) {
      console.warn('⚠️ No se pudo verificar/agregar la columna creado_en en usuarios:', err.message);
    }

    try {
      const [freeShippingColumn] = await conn.query("SHOW COLUMNS FROM usuarios LIKE 'primer_envio_gratis_usado'");
      if (freeShippingColumn.length === 0) {
        await conn.query("ALTER TABLE usuarios ADD COLUMN primer_envio_gratis_usado TINYINT(1) DEFAULT 0 AFTER creado_en");
      }
    } catch (err) {
      console.warn('⚠️ No se pudo verificar/agregar la columna primer_envio_gratis_usado en usuarios:', err.message);
    }

    await conn.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        sku VARCHAR(20) UNIQUE,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        precio DECIMAL(12,2) NOT NULL,
        stock INT DEFAULT 0,
        categoria VARCHAR(100),
        imagen_url LONGTEXT,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS producto_variantes (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        producto_id INT(11) NOT NULL,
        color_nombre VARCHAR(100) NOT NULL,
        color_codigo VARCHAR(20) DEFAULT NULL,
        imagen_url LONGTEXT DEFAULT NULL,
        stock INT DEFAULT 0,
        orden INT DEFAULT 0,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
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
        producto_id INT(11) DEFAULT NULL,
        producto_ref VARCHAR(255) DEFAULT NULL,
        producto_nombre VARCHAR(255) NOT NULL,
        producto_precio DECIMAL(12,2) NOT NULL,
        cantidad INT NOT NULL,
        subtotal DECIMAL(12,2) NOT NULL,
        FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE
      )
    `);

    try {
      const [productIdColumn] = await conn.query("SHOW COLUMNS FROM orden_items LIKE 'producto_id'");
      if (productIdColumn.length === 0) {
        await conn.query('ALTER TABLE orden_items ADD COLUMN producto_id INT(11) DEFAULT NULL AFTER orden_id');
      }
    } catch (err) {
      console.warn('⚠️ No se pudo verificar/agregar la columna producto_id en orden_items:', err.message);
    }

    try {
      const [productRefColumn] = await conn.query("SHOW COLUMNS FROM orden_items LIKE 'producto_ref'");
      if (productRefColumn.length === 0) {
        await conn.query('ALTER TABLE orden_items ADD COLUMN producto_ref VARCHAR(255) DEFAULT NULL AFTER producto_id');
      }
    } catch (err) {
      console.warn('⚠️ No se pudo verificar/agregar la columna producto_ref en orden_items:', err.message);
    }

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

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ticket_respuestas (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT(11) NOT NULL,
        author_type ENUM('cliente', 'admin') NOT NULL,
        author_id INT(11) DEFAULT NULL,
        mensaje TEXT NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ticket_respuestas_ticket (ticket_id),
        FOREIGN KEY (ticket_id) REFERENCES tickets_soporte(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES usuarios(id) ON DELETE SET NULL
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS resenas_producto (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT(11) NOT NULL,
        orden_id INT(11) NOT NULL,
        orden_item_id INT(11) NOT NULL,
        producto_id INT(11) DEFAULT NULL,
        producto_ref VARCHAR(255) NOT NULL,
        calificacion TINYINT NOT NULL,
        comentario TEXT NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_review_per_item (usuario_id, orden_item_id),
        INDEX idx_resenas_producto_ref (producto_ref),
        INDEX idx_resenas_producto_id (producto_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE,
        FOREIGN KEY (orden_item_id) REFERENCES orden_items(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS password_reset_codes (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_password_reset_email (email),
        INDEX idx_password_reset_expires (expires_at)
      )
    `);

    // Migración: Asegurar LONGTEXT para imágenes en tablas existentes
    try {
      await conn.query('ALTER TABLE usuarios MODIFY COLUMN foto LONGTEXT DEFAULT NULL');
      await conn.query('ALTER TABLE productos MODIFY COLUMN imagen_url LONGTEXT DEFAULT NULL');
      await conn.query('ALTER TABLE producto_variantes MODIFY COLUMN imagen_url LONGTEXT DEFAULT NULL');
      console.log('✅ Migración de columnas de imágenes a LONGTEXT completada.');
    } catch (err) {
      console.warn('⚠️ No se pudieron alterar las columnas de imágenes a LONGTEXT:', err.message);
    }

    try {
      const [legacyItems] = await conn.query(`
        SELECT oi.id, oi.producto_nombre, oi.producto_id, oi.producto_ref, p.id AS matched_product_id
        FROM orden_items oi
        LEFT JOIN productos p ON p.nombre = oi.producto_nombre
        WHERE oi.producto_id IS NULL OR oi.producto_ref IS NULL OR oi.producto_ref = ''
      `);

      for (const item of legacyItems) {
        const productId = item.matched_product_id || item.producto_id || null;
        const productRef = productId ? `db_${productId}` : buildProductRef(item.producto_nombre);
        await conn.query(
          'UPDATE orden_items SET producto_id = ?, producto_ref = ? WHERE id = ?',
          [productId, productRef, item.id]
        );
      }
    } catch (err) {
      console.warn('⚠️ No se pudieron completar las referencias legacy de orden_items:', err.message);
    }

    console.log('✅ Base de datos y tablas verificadas');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB, buildProductRef };
