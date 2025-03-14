import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const registerUser = async (userData) => {
  return await axios.post(`${API_URL}/register/`, userData);
};

export const loginUser = async (credentials) => {
  const response = await axios.post(`${API_URL}/token/`, credentials);
  if (response.data.access) {
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
  }
  return response.data;
};

export const fetchUserPlants = async () => {
  const token = localStorage.getItem('access_token');
  return await axios.get(`${API_URL}/user-plants/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const waterPlant = async (plantId) => {
  return await axios.post(`${API_URL}/user-plants/${plantId}/water/`, {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
  });
};

export const addNewPlant = async (plantData) => {
  return await axios.post(`${API_URL}/plants/`, plantData, {
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
  });
};

export const addPlantToUser = async (plantId) => {
  const token = localStorage.getItem('access_token');
  return await axios.post(`${API_URL}/user-plants/`, 
    { plant_id: plantId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
