require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { initDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:5173',
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

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Iniciar ──────────────────────────────────────────────
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`\n🚀 Luxury Jewelry API corriendo en http://localhost:${PORT}`);
      console.log(`📦 Endpoints disponibles:`);
      console.log(`   POST   /api/auth/register`);
      console.log(`   POST   /api/auth/login`);
      console.log(`   POST   /api/auth/logout`);
      console.log(`   GET    /api/auth/me`);
      console.log(`   PUT    /api/auth/profile`);
      console.log(`   GET    /api/products`);
      console.log(`   GET    /api/products/:id`);
      console.log(`   POST   /api/products (admin)\n`);
    });
  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err);
    process.exit(1);
  }
}

start();
