const crypto = require('crypto');
const { pool, initDB } = require('./config/db');

async function seed() {
  try {
    await initDB(); // Asegurar que la BD y tablas existan

    const admins = [
      { nombre: 'Felipe Cervera', email: 'fcervera84@gmail.com', clave: 'LuxuryAdmin2026!', rol: 'admin' },
      { nombre: 'Gerencia Luxury', email: 'luxuryjewellry95@gmail.com', clave: 'LuxuryAdmin2026!', rol: 'admin' }
    ];

    for (const admin of admins) {
      const hash = crypto.createHash('sha256').update(admin.clave).digest('hex');
      try {
        await pool.query('INSERT INTO usuarios (nombre, email, clave, rol) VALUES (?, ?, ?, ?)', 
          [admin.nombre, admin.email, hash, admin.rol]);
        console.log(`✅ Admin creado exitosamente: ${admin.email} | Clave asignada: ${admin.clave}`);
      } catch(err) {
        if (err.code === 'ER_DUP_ENTRY') {
          // Si ya existe, actualizamos su contraseña para que puedas entrar
          await pool.query('UPDATE usuarios SET clave = ?, rol = ? WHERE email = ?', [hash, admin.rol, admin.email]);
          console.log(`🔄 El admin ${admin.email} ya existía. Se forzó actualización de contraseña a: ${admin.clave}`);
        } else {
          console.error(err);
        }
      }
    }
  } catch (err) {
    console.error('Error al inicializar la BD:', err);
  } finally {
    process.exit(0);
  }
}

seed();
