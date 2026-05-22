require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { initDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const addressRoutes = require('./routes/addressRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const contactRoutes = require('./routes/contactRoutes');
const recoveryRoutes = require('./routes/passwordRecoveryRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (como apps móviles o curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'clave_secreta_luxury',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Archivos estáticos (imágenes subidas)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Rutas API ────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/recovery', recoveryRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Iniciar ──────────────────────────────────────────────
async function start() {
  app.listen(PORT, async () => {
    console.log(`\n🚀 Luxury Jewelry API corriendo en http://localhost:${PORT}`);
    console.log(`📦 Inicializando base de datos en segundo plano...`);
    try {
      await initDB();
      console.log(`✅ Base de datos inicializada correctamente y lista.`);
      console.log(`📦 Endpoints disponibles:`);
      console.log(`   POST   /api/auth/register`);
      console.log(`   POST   /api/auth/login`);
      console.log(`   POST   /api/auth/logout`);
      console.log(`   GET    /api/auth/me`);
      console.log(`   PUT    /api/auth/profile`);
      console.log(`   GET    /api/products`);
      console.log(`   GET    /api/products/admin/all (admin)`);
      console.log(`   GET    /api/products/:id`);
      console.log(`   POST   /api/products (admin)`);
      console.log(`   PUT    /api/products/:id (admin)`);
      console.log(`   DELETE /api/products/:id (admin)`);
      console.log(`   POST   /api/orders`);
      console.log(`   GET    /api/orders`);
      console.log(`   GET    /api/orders/:id`);
      console.log(`   GET    /api/orders/admin/all (admin)\n`);
    } catch (err) {
      console.error('❌ Error crítico al inicializar la base de datos:', err);
      console.warn('⚠️ El servidor continuará ejecutándose para permitir el diagnóstico de la base de datos y evitar caídas por puerto.');
    }
  });
}

start();
