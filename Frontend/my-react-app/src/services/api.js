// Frontend/my-react-app/src/services/api.js
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
  // Set default Content-Type here
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor for automatically adding JWT token and handling FormData Content-Type
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Check if data is FormData AFTER potentially adding Authorization header
    if (config.data instanceof FormData) {
      // Let the browser set the Content-Type for FormData, removing the default
      delete config.headers['Content-Type'];
    } else {
      // Ensure JSON Content-Type is set for non-FormData requests
      // This might be redundant if default is set above, but ensures correctness
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  error => Promise.reject(error)
);

// Handle token expiration (Response Interceptor - KEEP AS IS)
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
          console.log("Attempting token refresh..."); // Add log
          const response = await axios.post('http://127.0.0.1:8000/api/token/refresh/', {
            refresh: refreshToken
          }, { // Ensure refresh request doesn't use the expired token interceptor logic itself
             headers: { 'Content-Type': 'application/json' }
          });
          const newAccessToken = response.data.access;
          console.log("Token refreshed successfully."); // Add log

          // Store the new token
          localStorage.setItem('token', newAccessToken);

          // Update the Authorization header for the original request
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`; // Update default for subsequent requests in this session
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          // Resend the original request with the new token
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Refresh token failed:", refreshError.response?.data || refreshError.message); // Log detailed error
          // If refresh fails, logout the user
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          delete api.defaults.headers.common['Authorization']; // Remove default header
          // Redirect to login, ensuring it doesn't cause infinite loops
          if (window.location.pathname !== '/login') {
             console.log("Redirecting to login due to refresh failure.");
             window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
         console.log("No refresh token found, logging out and redirecting to login.");
         localStorage.removeItem('token');
         delete api.defaults.headers.common['Authorization']; // Remove default header
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

// --- API function definitions (KEEP AS IS) ---
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
  return await api.post('plants/', plantData); // No specific headers needed here due to interceptor
};

/**
 * Deletes a specific user plant.
 * @param {number} userPlantId - The ID of the UserPlant instance to delete.
 */
export const deleteUserPlant = async (userPlantId) => {
  return await api.delete(`user-plants/${userPlantId}/`);
};

/**
 * Adds an existing plant (by its ID) to the current user's collection.
 * @param {number} plantId - The ID of the plant definition to add.
 */
export const addPlantToUserCollection = async (plantId) => {
  // Interceptor handles Content-Type: application/json
  return await api.post('user-plants/', { plant_id: plantId });
};

/**
 * Waters a specific user plant.
 * @param {number} userPlantId - The ID of the UserPlant instance.
 */
export const waterUserPlant = async (userPlantId) => {
    // POST request with no body data needed for this action
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
    // Interceptor handles Content-Type: application/json
    return await api.post('token/', credentials);
};

/**
 * Registers a new user.
 * @param {object} userData - { username, email, password, password2 }
 */
export const registerUser = async (userData) => {
    // Interceptor handles Content-Type: application/json
    return await api.post('register/', userData);
};


export default api; // Export the configured instance as default