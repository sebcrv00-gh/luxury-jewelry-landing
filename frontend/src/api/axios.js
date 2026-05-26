import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://luxury-jewelry-api.onrender.com/api' : 'http://localhost:3001/api'),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export const getImageUrl = (path) => {
  if (!path) return '';

  // Si es una cadena Base64, la devolvemos directamente sin procesar
  if (typeof path === 'string' && path.startsWith('data:')) {
    return path;
  }

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Log de diagnóstico visible para el usuario (siempre al inicio)
  if (!isLocal) {
    console.log(`[Luxury Debug] Analizando ruta: "${path}"`);
  }

  // 1. Si la ruta ya es absoluta y NO es de localhost, devolverla tal cual
  if (path.startsWith('http') && !path.includes('localhost:3001')) {
    return path;
  }
  
  // 1.5. Si es un asset estático del frontend (imágenes de prueba/catálogo en carpeta public)
  if (path.startsWith('/images/') || path.startsWith('images/')) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  const backendBase = isLocal ? 'http://localhost:3001' : 'https://luxury-jewelry-api.onrender.com';
  
  // 2. Limpiar prefijos de localhost si existen (común en bases de datos migradas)
  let cleanPath = path.replace('http://localhost:3001/', '');
  
  // 3. Quitar barra inicial si la tiene
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

  // 4. Asegurar que apunte a la carpeta uploads si no es una ruta pública absoluta
  // Si no empieza con 'uploads/' y no es un blob de preview local
  if (!cleanPath.startsWith('uploads/') && !cleanPath.startsWith('blob:')) {
    cleanPath = `uploads/${cleanPath}`;
  }
  
  const finalUrl = `${backendBase}/${cleanPath}`;
  
  if (!isLocal) {
    console.log(`[Luxury Debug] URL Generada Final: ${finalUrl}`);
  }

  return finalUrl;
};

export default api;
