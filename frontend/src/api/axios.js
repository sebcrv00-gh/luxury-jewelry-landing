import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export const getImageUrl = (path) => {
  if (!path) return '';
  
  // Si la ruta ya es absoluta y no es localhost, la devolvemos tal cual
  if (path.startsWith('http') && !path.includes('localhost:3001')) {
    return path;
  }
  
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const backendBase = isLocal ? 'http://localhost:3001' : 'https://luxury-jewelry-api.onrender.com';
  
  // Limpiar la ruta si viene como URL absoluta de localhost desde la DB
  let cleanPath = path.replace('http://localhost:3001/', '');
  cleanPath = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;
  
  return `${backendBase}/${cleanPath}`;
};

export default api;
