import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL;

// Tworzymy instancję axios z bazowym URL i domyślnymi nagłówkami
const api = axios.create({
  baseURL: `${API_URL}plants/`,
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
