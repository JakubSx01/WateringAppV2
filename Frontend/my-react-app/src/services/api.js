// Frontend/my-react-app/src/services/api.js
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api/',
});

// Interceptor for automatically adding JWT token and handling FormData Content-Type
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token'); // Use 'token' key
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']; // Let browser set boundary
    } else if (!config.headers['Content-Type']) {
       config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  error => Promise.reject(error)
);

// Handle token expiration (Response Interceptor)
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (originalRequest._retry) {
        console.log("API Interceptor: Retry failed, rejecting.");
        return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry &&
        !originalRequest.url.includes('/token/') && !originalRequest.url.includes('/register/')) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken'); // Use 'refreshToken' key

      if (refreshToken) {
        try {
          console.log("API Interceptor: Attempting token refresh...");
          const response = await axios.post(`${api.defaults.baseURL}token/refresh/`, {
            refresh: refreshToken
          }, {
             headers: { 'Content-Type': 'application/json', 'Authorization': '' }
          });
          const newAccessToken = response.data.access;
          console.log("API Interceptor: Token refreshed successfully.");

          localStorage.setItem('token', newAccessToken); // Use 'token' key

          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          return api(originalRequest);
        } catch (refreshError) {
          console.error("API Interceptor: Refresh token failed:", refreshError.response?.data || refreshError.message);
          localStorage.removeItem('token'); // Use 'token' key
          localStorage.removeItem('refreshToken'); // Use 'refreshToken' key
          delete api.defaults.headers.common['Authorization'];
          if (window.location.pathname !== '/login') {
             console.log("API Interceptor: Redirecting to login due to refresh failure.");
             window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
         console.log("API Interceptor: No refresh token found, logging out and redirecting to login.");
         localStorage.removeItem('token'); // Use 'token' key
         localStorage.removeItem('refreshToken'); // Use 'refreshToken' key
         delete api.defaults.headers.common['Authorization'];
         if (window.location.pathname !== '/login') {
            window.location.href = '/login';
         }
      }
    }
    return Promise.reject(error);
  }
);

// --- User & Public Plant API functions ---
/**
 * Fetches all available plant definitions from the global database (filtered by backend for status=APPROVED for non-staff).
 */
export const fetchAllPlants = async () => {
  return await api.get('plants/'); // Hits PlantViewSet (gets APPROVED only for users, all for staff/admin via same view)
};

/**
 * Adds a new plant definition to the global database (requires moderation).
 * This function is for users proposing a plant. It hits the standard endpoint
 * where the viewset/serializer ensures status is set to PENDING and proposer is recorded.
 * @param {FormData} plantData - FormData object containing plant details (name, species, etc., and potentially image file)
 */
export const addNewPlantDefinition = async (plantData) => {
    return await api.post('plants/', plantData); // Hits PlantViewSet create (sets status=PENDING)
};

/**
 * Deletes a specific user plant from the current user's collection.
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
  return await api.post('user-plants/', { plant_id: plantId });
};

/**
 * Waters a specific user plant for the current user.
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
  const response = await api.post('token/', credentials);
  if (response.data.access) {
    localStorage.setItem('token', response.data.access);
    localStorage.setItem('refreshToken', response.data.refresh);
  }
  return response.data;
};

/**
 * Registers a new user.
 * @param {object} userData - { username, email, password, password2 }
 */
export const registerUser = async (userData) => {
    return await api.post('register/', userData);
};

/**
 * Fetches details of the currently authenticated user.
 */
export const fetchCurrentUser = async () => {
     return await api.get('user/me/');
};


// --- Admin/Moderator API functions (using /api/admin/ prefix) ---

/**
 * Fetches ALL plant definitions (including pending/rejected). Admin/Moderator only.
 */
export const fetchAllPlantDefinitions = async () => {
    return await api.get('admin/plants/'); // Hits AdminPlantViewSet (gets all)
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
 * @param {object | FormData} plantData - Updated plant data.
 */
export const updatePlantDefinition = async (plantId, plantData) => {
     return await api.patch(`admin/plants/${plantId}/`, plantData);
};

/**
 * Deletes a plant definition. Admin/Moderator only.
 * @param {number} plantId - The ID of the Plant definition.
 */
export const deletePlantDefinition = async (plantId) => {
    return await api.delete(`admin/plants/${plantId}/`);
};

/**
 * Fetches ALL UserPlant instances, optionally filtered by user. Admin/Moderator only.
 * @param {number} [userId] - Optional. Filter by user ID.
 */
export const fetchAllUserPlants = async (userId = null) => {
    let url = 'admin/user-plants/';
    if (userId !== null && userId !== undefined) {
         url += `?user=${userId}`;
    }
    return await api.get(url);
};

/**
 * Creates a UserPlant instance for a specific user. Admin/Moderator only.
 * @param {object} userPlantData - { user: userId, plant_id: plantId, ... }
 */
export const createAnyUserPlant = async (userPlantData) => {
     return await api.post('admin/user-plants/', userPlantData);
};

/**
 * Updates a UserPlant instance. Admin/Moderator only.
 * @param {number} userPlantId - The ID of the UserPlant instance.
 * @param {object} userPlantData - Updated user plant data.
 */
export const updateAnyUserPlant = async (userPlantId, userPlantData) => {
     return await api.patch(`admin/user-plants/${userPlantId}/`, userPlantData);
};

/**
 * Deletes a UserPlant instance. Admin/Moderator only.
 * @param {number} userPlantId - The ID of the UserPlant instance.
 */
export const deleteAnyUserPlant = async (userPlantId) => {
     return await api.delete(`admin/user-plants/${userPlantId}/`);
};

/**
 * Waters a specific UserPlant instance (for any user). Admin/Moderator only.
 * @param {number} userPlantId - The ID of the UserPlant instance.
 */
export const waterAnyUserPlant = async (userPlantId) => {
     return await api.post(`admin/user-plants/${userPlantId}/water/`);
};

/**
 * Fetches ALL users. Admin/Moderator only.
 */
export const fetchAllUsers = async () => {
    return await api.get('admin/users/');
};

/**
 * Creates a new user via admin panel. Admin only.
 * @param {object} userData - User data (username, email, etc., but NOT password).
 */
export const createNewUser = async (userData) => {
    return await api.post('admin/users/', userData);
};

/**
 * Updates user details via admin panel. Admin/Moderator depending on fields.
 * @param {number} userId - The ID of the user to update.
 * @param {object} userData - Updated user data.
 */
export const updateUserDetails = async (userId, userData) => {
    return await api.patch(`admin/users/${userId}/`, userData);
};

/**
 * Deletes a user via admin panel. Admin only.
 * @param {number} userId - The ID of the user to delete.
 */
export const deleteUser = async (userId) => {
    return await api.delete(`admin/users/${userId}/`);
};

/**
 * Sets a user's password via admin panel. Admin only.
 * @param {number} userId - The ID of the user.
 * @param {object} passwordData - { new_password, confirm_password }.
 */
export const setUserPassword = async (userId, passwordData) => {
  // --- FIX: Change hyphen to underscore ---
  return await api.post(`admin/users/${userId}/set_password/`, passwordData);
};

export default api;