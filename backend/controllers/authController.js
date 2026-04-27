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
  },

  // GET /api/auth/users
  async getAllUsers(req, res) {
    try {
      const users = await User.findAll();
      return res.json(users);
    } catch (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // PUT /api/auth/users/:id/vip
  async makeVip(req, res) {
    try {
      const { id } = req.params;
      const ok = await User.makeVip(id);
      if (!ok) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json({ ok: true, message: 'Cliente ascendido a VIP exitosamente' });
    } catch (err) {
      console.error('Error al hacer VIP:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // PUT /api/auth/users/:id/remove-vip
  async removeVip(req, res) {
    try {
      const { id } = req.params;
      const ok = await User.removeVip(id);
      if (!ok) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json({ ok: true, message: 'Estatus VIP revocado exitosamente' });
    } catch (err) {
      console.error('Error al revocar VIP:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // PUT /api/auth/change-password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Ambos campos son obligatorios' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
      }
      const user = await User.findByEmail(req.session.email);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');
      if (currentHash !== user.clave) {
        return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
      }

      const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
      await User.update(req.session.userId, { clave: newHash });
      return res.json({ ok: true, message: 'Contraseña actualizada exitosamente' });
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  }
};

module.exports = authController;
