import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch user's plants
    const fetchUserPlants = async () => {
      try {
        const response = await api.get('user-plants/');
        setPlants(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Błąd pobierania roślin', error);
        if (error.response && error.response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          navigate('/login');
        }
        setLoading(false);
      }
    };
    
    fetchUserPlants();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Twój panel roślin</h2>
        <button className="button" onClick={handleLogout}>Wyloguj</button>
      </div>
      
      <div className="plants-section">
        <h3>Twoje rośliny</h3>
        {plants.length === 0 ? (
          <p>Brak roślin, dodaj nowe!</p>
        ) : (
          <ul className="plants-list">
            {plants.map(plant => (
              <li key={plant.id} className="plant-item">
                <h4>{plant.plant.name}</h4>
                <p>Data ostatniego podlania: {plant.last_watered || 'Brak danych'}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;