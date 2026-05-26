const fs = require('fs');
const path = require('path');
const { pool, initDB } = require('./config/db');

// Función auxiliar para determinar el MimeType a partir de la extensión
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
  }
}

// Función para convertir una imagen local a Base64
function fileToBase64(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Archivo no encontrado en disco: ${filePath}`);
    return null;
  }
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  const mimeType = getMimeType(filePath);
  return `data:${mimeType};base64,${base64Data}`;
}

async function migrate() {
  console.log('🚀 Iniciando migración de imágenes locales a Base64 en la base de datos...');
  
  let conn;
  try {
    // Inicializar base de datos y crear tablas si no existen
    console.log('Inicializando tablas de la base de datos...');
    await initDB();
    console.log('✅ Base de datos inicializada.');

    conn = await pool.getConnection();

    // Asegurar que las columnas soportan strings de largo Base64 (LONGTEXT)
    console.log('Asegurando LONGTEXT en las columnas de imágenes...');
    await conn.query('ALTER TABLE usuarios MODIFY COLUMN foto LONGTEXT DEFAULT NULL');
    await conn.query('ALTER TABLE productos MODIFY COLUMN imagen_url LONGTEXT DEFAULT NULL');
    await conn.query('ALTER TABLE producto_variantes MODIFY COLUMN imagen_url LONGTEXT DEFAULT NULL');
    console.log('✅ Columnas migradas a LONGTEXT.');

    // 1. Migrar tabla: productos
    console.log('\n--- Migrando tabla: productos ---');
    const [productos] = await conn.query('SELECT id, nombre, imagen_url FROM productos');
    let prodCount = 0;
    for (const prod of productos) {
      if (prod.imagen_url && typeof prod.imagen_url === 'string' && !prod.imagen_url.startsWith('data:')) {
        const filename = path.basename(prod.imagen_url);
        const filePath = path.join(__dirname, 'uploads', filename);
        console.log(`Procesando producto ID ${prod.id} (${prod.nombre}): "${prod.imagen_url}"`);
        
        const base64Str = fileToBase64(filePath);
        if (base64Str) {
          await conn.query('UPDATE productos SET imagen_url = ? WHERE id = ?', [base64Str, prod.id]);
          console.log(`✅ Producto ID ${prod.id} migrado exitosamente.`);
          prodCount++;
        }
      }
    }
    console.log(`Total productos migrados: ${prodCount}`);

    // 2. Migrar tabla: producto_variantes
    console.log('\n--- Migrando tabla: producto_variantes ---');
    const [variantes] = await conn.query('SELECT id, color_nombre, imagen_url FROM producto_variantes');
    let varCount = 0;
    for (const variant of variantes) {
      if (variant.imagen_url && typeof variant.imagen_url === 'string' && !variant.imagen_url.startsWith('data:')) {
        const filename = path.basename(variant.imagen_url);
        const filePath = path.join(__dirname, 'uploads', filename);
        console.log(`Procesando variante ID ${variant.id} (${variant.color_nombre}): "${variant.imagen_url}"`);
        
        const base64Str = fileToBase64(filePath);
        if (base64Str) {
          await conn.query('UPDATE producto_variantes SET imagen_url = ? WHERE id = ?', [base64Str, variant.id]);
          console.log(`✅ Variante ID ${variant.id} migrada exitosamente.`);
          varCount++;
        }
      }
    }
    console.log(`Total variantes migradas: ${varCount}`);

    // 3. Migrar tabla: usuarios (fotos de perfil)
    console.log('\n--- Migrando tabla: usuarios ---');
    const [usuarios] = await conn.query('SELECT id, nombre, foto FROM usuarios');
    let userCount = 0;
    for (const user of usuarios) {
      if (user.foto && typeof user.foto === 'string' && !user.foto.startsWith('data:')) {
        const filename = path.basename(user.foto);
        const filePath = path.join(__dirname, 'uploads', filename);
        console.log(`Procesando usuario ID ${user.id} (${user.nombre}): "${user.foto}"`);
        
        const base64Str = fileToBase64(filePath);
        if (base64Str) {
          await conn.query('UPDATE usuarios SET foto = ? WHERE id = ?', [base64Str, user.id]);
          console.log(`✅ Usuario ID ${user.id} migrado exitosamente.`);
          userCount++;
        }
      }
    }
    console.log(`Total usuarios migrados: ${userCount}`);

    console.log('\n✨ ¡Proceso de migración terminado exitosamente!');

  } catch (err) {
    console.error('❌ Error crítico durante la migración:', err);
  } finally {
    if (conn) conn.release();
    pool.end();
  }
}

migrate();
