// Frontend/my-react-app/src/services/api.js
import axios from 'axios';

// Tworzymy instancję axios z bazowym URL i domyślnymi nagłówkami
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor do automatycznego dołączania tokena JWT, jeśli jest zapisany w localStorage
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

export default api;