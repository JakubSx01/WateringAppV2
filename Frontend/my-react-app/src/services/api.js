import axios from 'axios';

// Create axios instance with base URL and default headers
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor for automatically adding JWT token if stored in localStorage
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      // Ensure Content-Type is set correctly for FormData
      if (config.data instanceof FormData) {
        // Let browser set Content-Type for FormData
        delete config.headers['Content-Type'];
      } else {
        config.headers['Content-Type'] = 'application/json';
      }
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Handle token expiration
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    // Check for token expiration (status 401) and if it's not a retry request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark as retry
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          // Request a new access token using the refresh token
          const response = await axios.post('http://127.0.0.1:8000/api/token/refresh/', {
            refresh: refreshToken
          });
          const newAccessToken = response.data.access;

          // Store the new token
          localStorage.setItem('token', newAccessToken);

          // Update the Authorization header for the original request
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          // Resend the original request with the new token
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Refresh token failed:", refreshError);
          // If refresh fails, logout the user
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          // Redirect to login, ensuring it doesn't cause infinite loops
          if (window.location.pathname !== '/login') {
             window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
         console.log("No refresh token found, redirecting to login.");
         localStorage.removeItem('token');
         // Redirect to login
         if (window.location.pathname !== '/login') {
            window.location.href = '/login';
         }
      }
    }
    // For other errors, just reject
    return Promise.reject(error);
  }
);
/**
 * Fetches all available plant definitions from the global database.
 */
export const fetchAllPlants = async () => {
  return await api.get('plants/');
};

/**
 * Adds a new plant definition to the global database.
 * Requires backend PlantViewSet to handle POST.
 * @param {FormData} plantData - FormData object containing plant details (name, species, etc., and potentially image file)
 */
export const addNewPlantDefinition = async (plantData) => {
  // Use FormData because we might include an image file
  return await api.post('plants/', plantData);
};

/**
 * Adds an existing plant (by its ID) to the current user's collection.
 * @param {number} plantId - The ID of the plant definition to add.
 */
export const addPlantToUserCollection = async (plantId) => {
  return await api.post('user-plants/', { plant_id: plantId });
};

/**
 * Waters a specific user plant.
 * @param {number} userPlantId - The ID of the UserPlant instance.
 */
export const waterUserPlant = async (userPlantId) => {
    return await api.post(`user-plants/${userPlantId}/water/`);
};

/**
 * Fetches plants belonging to the current user.
 */
export const fetchUserPlants = async () => {
    return await api.get('user-plants/');
};

/**
 * Logs in a user.
 * @param {object} credentials - { username, password }
 */
export const loginUser = async (credentials) => {
    return await api.post('token/', credentials);
};

/**
 * Registers a new user.
 * @param {object} userData - { username, email, password, password2 }
 */
export const registerUser = async (userData) => {
    return await api.post('register/', userData);
};


export default api; // Export the configured instance as default