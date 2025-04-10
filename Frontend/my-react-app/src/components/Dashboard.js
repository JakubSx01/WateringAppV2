// Frontend/my-react-app/src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [userPlants, setUserPlants] = useState([]);
  const [availablePlants, setAvailablePlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Sprawdzenie, czy użytkownik jest zalogowany
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Pobieranie danych
    const fetchData = async () => {
      setLoading(true);
      try {
        // Pobieranie roślin użytkownika
        const userPlantsResponse = await api.get('user-plants/');
        setUserPlants(userPlantsResponse.data);

        // Pobieranie wszystkich dostępnych roślin
        const plantsResponse = await api.get('plants/');
        setAvailablePlants(plantsResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Błąd pobierania danych:', err);
        setError('Nie udało się pobrać danych. Proszę spróbować ponownie.');
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleWatering = async (plantId) => {
    try {
      await api.post(`user-plants/${plantId}/water/`);
      // Odświeżenie listy roślin po podlaniu
      const response = await api.get('user-plants/');
      setUserPlants(response.data);
      alert('Roślina została podlana!');
    } catch (error) {
      console.error('Błąd podczas podlewania:', error);
      alert('Nie udało się podlać rośliny.');
    }
  };

  const addNewPlant = async (plantId) => {
    try {
      await api.post('user-plants/', { plant_id: plantId });
      // Odświeżenie listy roślin użytkownika
      const response = await api.get('user-plants/');
      setUserPlants(response.data);
      alert('Roślina została dodana do Twojej kolekcji!');
    } catch (error) {
      console.error('Błąd podczas dodawania rośliny:', error);
      alert('Nie udało się dodać rośliny.');
    }
  };

  if (loading) return <div className="loading">Ładowanie danych...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="dashboard-container">
      <section className="user-plants-section">
        <h2>Twoje rośliny</h2>
        {userPlants.length === 0 ? (
          <p>Nie masz jeszcze żadnych roślin. Dodaj nowe z dostępnej listy poniżej!</p>
        ) : (
          <div className="plants-grid">
            {userPlants.map(userPlant => (
              <div key={userPlant.id} className="plant-card">
                <h3>{userPlant.plant.name}</h3>
                {userPlant.plant.image && (
                  <img 
                    src={`http://127.0.0.1:8000${userPlant.plant.image}`} 
                    alt={userPlant.plant.name} 
                    className="plant-image" 
                  />
                )}
                <p>Gatunek: {userPlant.plant.species || 'Nieznany'}</p>
                <p>Następne podlewanie: {userPlant.next_watering_date || 'Nie ustawiono'}</p>
                <button 
                  onClick={() => handleWatering(userPlant.id)}
                  className="water-button"
                >
                  Podlej roślinę
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="available-plants-section">
        <h2>Dostępne rośliny</h2>
        <div className="plants-grid">
          {availablePlants.map(plant => (
            <div key={plant.id} className="plant-card">
              <h3>{plant.name}</h3>
              {plant.image && (
                <img 
                  src={`http://127.0.0.1:8000${plant.image}`} 
                  alt={plant.name} 
                  className="plant-image" 
                />
              )}
              <p>Gatunek: {plant.species || 'Nieznany'}</p>
              <p>Częstotliwość podlewania: co {plant.watering_frequency_days} dni</p>
              <p>Ilość wody: {plant.water_amount_ml} ml</p>
              <button 
                onClick={() => addNewPlant(plant.id)}
                className="add-button"
              >
                Dodaj do swoich roślin
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;