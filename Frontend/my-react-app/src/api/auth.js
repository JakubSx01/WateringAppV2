import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL;

const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Pobieranie roślin z bazy danych
export const fetchPlants = async () => {
  return await axios.get(`${API_URL}plants/`);
};

// Pobieranie roślin użytkownika
export const fetchUserPlants = async () => {
  return await axios.get(`${API_URL}user-plants/`, { headers: getAuthHeader() });
};

// Dodanie rośliny do użytkownika
export const addPlantToUser = async (plantId) => {
  return await axios.post(`${API_URL}user-plants/`, { plant_id: plantId }, { headers: getAuthHeader() });
};

// Podlewanie rośliny
export const waterPlant = async (plantId) => {
  return await axios.post(`${API_URL}user-plants/${plantId}/water/`, {}, { headers: getAuthHeader() });
};

// Upload nowej rośliny z plikiem (zdjęciem)
export const uploadPlant = async (plantData) => {
  const formData = new FormData();
  for (let key in plantData) {
    formData.append(key, plantData[key]);
  }
  return await axios.post(`${API_URL}plants/`, formData, { headers: getAuthHeader() });
};

export const registerUser = async (userData) => {
  return await axios.post(`${API_URL}register/`, userData);
};

export const loginUser = async (credentials) => {
  const response = await axios.post(`${API_URL}token/`, credentials);
  if (response.data.access) {
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
  }
  return response.data;
};
