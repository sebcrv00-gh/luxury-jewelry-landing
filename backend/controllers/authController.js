const crypto = require('crypto');
const User = require('../models/User');
const path = require('path');

const authController = {
  // POST /api/auth/register
  async register(req, res) {
    try {
      const { nombre, email, clave } = req.body;
      if (!nombre || !email || !clave) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
      }

      const claveHash = crypto.createHash('sha256').update(clave).digest('hex');

      try {
        const id = await User.create(nombre, email, claveHash);
        return res.json({ ok: true, message: 'Registro exitoso', id });
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Ese correo electrónico ya está registrado' });
        }
        throw err;
      }
    } catch (err) {
      console.error('Error en registro:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, clave } = req.body;
      if (!email || !clave) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
      }

      const usuario = await User.findByEmail(email);
      if (!usuario) {
        return res.status(404).json({ error: 'El usuario no existe' });
      }

      const claveHash = crypto.createHash('sha256').update(clave).digest('hex');
      if (claveHash !== usuario.clave) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }

      // Guardar sesión
      req.session.userId = usuario.id;
      req.session.nombre = usuario.nombre;
      req.session.email = usuario.email;
      req.session.rol = usuario.rol || 'cliente';

      return res.json({
        ok: true,
        user: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol || 'cliente',
          telefono: usuario.telefono,
          direccion: usuario.direccion,
          foto: usuario.foto
        }
      });
    } catch (err) {
      console.error('Error en login:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // POST /api/auth/logout
  async logout(req, res) {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: 'Error al cerrar sesión' });
      res.clearCookie('connect.sid');
      return res.json({ ok: true, message: 'Sesión cerrada' });
    });
  },

  // GET /api/auth/me
  async me(req, res) {
    try {
      if (!req.session || !req.session.userId) {
        return res.json({ user: null });
      }
      const user = await User.findById(req.session.userId);
      if (!user) return res.json({ user: null });
      return res.json({ user });
    } catch (err) {
      console.error('Error en /me:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // PUT /api/auth/profile
  async updateProfile(req, res) {
    try {
      const { nombre, email, telefono, direccion } = req.body;
      const data = { nombre, email, telefono, direccion };

      // Si subieron foto
      if (req.file) {
        data.foto = 'uploads/' + req.file.filename;
      }

      await User.update(req.session.userId, data);

      // Actualizar sesión
      if (nombre) req.session.nombre = nombre;
      if (email) req.session.email = email;

      const updatedUser = await User.findById(req.session.userId);
      return res.json({ ok: true, user: updatedUser });
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // DELETE /api/auth/profile
  async deleteAccount(req, res) {
    try {
      const id = req.session.userId;
      if (!id) return res.status(401).json({ error: 'No autorizado' });

      await User.delete(id);
      
      req.session.destroy((err) => {
        if (err) console.error('Error destruyendo sesión al borrar cuenta', err);
        res.clearCookie('connect.sid');
        return res.json({ ok: true, message: 'Cuenta eliminada permanentemente' });
      });
    } catch (err) {
      console.error('Error al borrar cuenta:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  }
};

module.exports = authController;
