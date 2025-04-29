// Frontend/my-react-app/src/services/api.js
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api/', // Use env variable
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
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  error => Promise.reject(error)
);

// Handle token expiration (Response Interceptor - KEEP AS IS, this looks correct)
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    // Prevent infinite retry loops
    if (originalRequest._retry) {
        return Promise.reject(error);
    }

    // Check for token expiration (status 401) and if it's not a retry request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark as retry
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          console.log("Attempting token refresh...");
          const response = await axios.post(`${api.defaults.baseURL}token/refresh/`, { // Use api instance baseURL
            refresh: refreshToken
          }, { // Ensure refresh request doesn't use the expired token interceptor logic itself
             headers: { 'Content-Type': 'application/json' }
          });
          const newAccessToken = response.data.access;
          console.log("Token refreshed successfully.");

          // Store the new token
          localStorage.setItem('token', newAccessToken);

          // Update the Authorization header for the original request and the default
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          // Resend the original request with the new token
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Refresh token failed:", refreshError.response?.data || refreshError.message);
          // If refresh fails, logout the user
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          delete api.defaults.headers.common['Authorization']; // Remove default header
          // Redirect to login, ensuring it doesn't cause infinite loops
          // Use window.location.href to force a full page reload and clear React state/router history
          if (window.location.pathname !== '/login') {
             console.log("Redirecting to login due to refresh failure.");
             window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
         console.log("No refresh token found, logging out and redirecting to login.");
         localStorage.removeItem('token');
         localStorage.removeItem('refreshToken'); // Also remove refresh token
         delete api.defaults.headers.common['Authorization'];
         if (window.location.pathname !== '/login') {
            window.location.href = '/login';
         }
      }
    }
    // For other errors (like 403 Forbidden for permission issues), just reject
    return Promise.reject(error);
  }
);

// --- User & Public Plant API functions (Existing, maybe slight mods) ---
/**
 * Fetches all available plant definitions from the global database (filtered by backend).
 */
export const fetchAllPlants = async () => {
  return await api.get('plants/'); // Backend viewset will filter by status for non-staff
};

/**
 * Adds a new plant definition to the global database (requires moderation).
 * @param {FormData} plantData - FormData object containing plant details (name, species, etc., and potentially image file)
 */
export const addNewPlantDefinition = async (plantData) => {
  return await api.post('plants/', plantData); // Backend viewset will set status=PENDING
};

/**
 * Deletes a specific user plant.
 * @param {number} userPlantId - The ID of the UserPlant instance to delete.
 */
export const deleteUserPlant = async (userPlantId) => {
  return await api.delete(`user-plants/${userPlantId}/`); // User deletes their own
};

/**
 * Adds an existing plant (by its ID) to the current user's collection.
 * @param {number} plantId - The ID of the plant definition to add.
 */
export const addPlantToUserCollection = async (plantId) => {
  return await api.post('user-plants/', { plant_id: plantId }); // User adds to their collection
};

/**
 * Waters a specific user plant.
 * @param {number} userPlantId - The ID of the UserPlant instance.
 */
export const waterUserPlant = async (userPlantId) => {
    return await api.post(`user-plants/${userPlantId}/water/`); // User waters their own
};

/**
 * Fetches plants belonging to the current user.
 */
export const fetchUserPlants = async () => {
    return await api.get('user-plants/'); // User fetches their own
};

/**
 * Logs in a user.
 * @param {object} credentials - { username, password }
 */
export const loginUser = async (credentials) => {
  const response = await api.post('token/', credentials);
  if (response.data.access) {
    // Make sure these keys match what you retrieve with getItem elsewhere
    localStorage.setItem('token', response.data.access); // <-- Use 'token' key
    localStorage.setItem('refreshToken', response.data.refresh); // <-- Use 'refreshToken' key
  }
  return response.data; // Return the data payload
};

/**
 * Registers a new user.
 * @param {object} userData - { username, email, password, password2 }
 */
export const registerUser = async (userData) => {
    return await api.post('register/', userData);
};

// --- New User Data Fetch (needed after login to get roles) ---
export const fetchCurrentUser = async () => {
     return await api.get('user/me/'); // You need to add this endpoint on the backend
};


// --- New Admin/Moderator API functions ---

/**
 * Fetches ALL plant definitions (including pending/rejected). Admin/Moderator only.
 */
export const fetchAllPlantDefinitions = async () => {
    return await api.get('admin/plants/');
};

/**
 * Approves a pending plant definition. Admin/Moderator only.
 * @param {number} plantId - The ID of the Plant definition.
 */
export const approvePlantDefinition = async (plantId) => {
    return await api.post(`admin/plants/${plantId}/approve/`);
};

/**
 * Rejects a pending plant definition. Admin/Moderator only.
 * @param {number} plantId - The ID of the Plant definition.
 */
export const rejectPlantDefinition = async (plantId) => {
    return await api.post(`admin/plants/${plantId}/reject/`);
};

/**
 * Updates a plant definition. Admin/Moderator only.
 * @param {number} plantId - The ID of the Plant definition.
 * @param {object} plantData - Updated plant data. Can be FormData.
 */
export const updatePlantDefinition = async (plantId, plantData) => {
    // Note: If sending FormData with partial data, use PATCH
    const method = plantData instanceof FormData ? 'patch' : 'put'; // Assuming PUT for full update, PATCH for partial
    return await api({
        method: method,
        url: `admin/plants/${plantId}/`,
        data: plantData
    });
    // Or simply: return await api.put/patch(`admin/plants/${plantId}/`, plantData);
};

/**
 * Deletes a plant definition. Admin/Moderator only.
 * @param {number} plantId - The ID of the Plant definition.
 */
export const deletePlantDefinition = async (plantId) => {
    return await api.delete(`admin/plants/${plantId}/`);
};

/**
 * Fetches ALL UserPlant instances. Admin/Moderator only.
 */
export const fetchAllUserPlants = async () => {
    return await api.get('admin/user-plants/');
};

/**
 * Updates a UserPlant instance. Admin/Moderator only.
 * @param {number} userPlantId - The ID of the UserPlant instance.
 * @param {object} userPlantData - Updated user plant data (e.g., next_watering_date, plant_id).
 */
export const updateUserPlant = async (userPlantId, userPlantData) => {
     return await api.patch(`admin/user-plants/${userPlantId}/`, userPlantData); // Use patch for partial
};

/**
 * Deletes a UserPlant instance. Admin/Moderator only.
 * @param {number} userPlantId - The ID of the UserPlant instance.
 */
export const deleteAnyUserPlant = async (userPlantId) => {
     return await api.delete(`admin/user-plants/${userPlantId}/`);
};


/**
 * Fetches ALL users. Admin/Moderator only.
 */
export const fetchAllUsers = async () => {
    return await api.get('admin/users/');
};

/**
 * Creates a new user via admin panel. Admin only.
 * @param {object} userData - User data (username, email, etc., but NOT password initially).
 */
export const createNewUser = async (userData) => {
    return await api.post('admin/users/', userData); // AdminUserViewSet create
};

/**
 * Updates user details via admin panel. Admin/Moderator depending on fields.
 * @param {number} userId - The ID of the user to update.
 * @param {object} userData - Updated user data.
 */
export const updateUserDetails = async (userId, userData) => {
    return await api.patch(`admin/users/${userId}/`, userData); // AdminUserViewSet update
};

/**
 * Deletes a user via admin panel. Admin only.
 * @param {number} userId - The ID of the user to delete.
 */
export const deleteUser = async (userId) => {
    return await api.delete(`admin/users/${userId}/`); // AdminUserViewSet destroy
};

/**
 * Sets a user's password via admin panel. Admin only.
 * @param {number} userId - The ID of the user.
 * @param {object} passwordData - { new_password, confirm_password }.
 */
export const setUserPassword = async (userId, passwordData) => {
    return await api.post(`admin/users/${userId}/set-password/`, passwordData); // AdminUserViewSet set_password action
};


export default api; // Export the configured instance as default