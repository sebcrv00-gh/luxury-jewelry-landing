import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const backendBase = isLocal ? 'http://localhost:3001' : 'https://luxury-jewelry-api.onrender.com';
  
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${backendBase}/${cleanPath}`;
};

export default api;
