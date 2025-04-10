import React, { useEffect, useState } from 'react';
import api from '../services/api';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [plants, setPlants] = useState([]);
  const [availablePlants, setAvailablePlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Pobieranie roślin użytkownika
    const fetchUserPlants = async () => {
      try {
        const response = await api.get('user-plants/');
        setPlants(response.data);
      } catch (error) {
        console.error('Błąd pobierania roślin użytkownika', error);
        setError('Nie udało się pobrać Twoich roślin. Sprawdź połączenie z internetem.');
      } finally {
        setLoading(false);
      }
    };

    // Pobieranie wszystkich dostępnych roślin
    const fetchAvailablePlants = async () => {
      try {
        const response = await api.get('plants/');
        setAvailablePlants(response.data);
      } catch (error) {
        console.error('Błąd pobierania dostępnych roślin', error);
      }
    };

    fetchUserPlants();
    fetchAvailablePlants();
  }, []);

  // Obliczanie dni do następnego podlania
  const calculateDaysToWater = (lastWatered, wateringFrequency) => {
    if (!lastWatered || !wateringFrequency) return 'Brak danych';
    
    const lastWateredDate = new Date(lastWatered);
    const today = new Date();
    const daysSinceLastWatered = Math.floor((today - lastWateredDate) / (1000 * 60 * 60 * 24));
    const daysToWater = wateringFrequency - daysSinceLastWatered;
    
    return daysToWater <= 0 ? 'Podlej teraz!' : `${daysToWater} dni`;
  };

  // Dodawanie nowej rośliny do półki użytkownika
  const handleAddPlant = async () => {
    if (!selectedPlant) {
      setError('Wybierz roślinę z listy');
      return;
    }

    try {
      const response = await api.post('user-plants/', {
        plant_id: selectedPlant,
        last_watered: new Date().toISOString().split('T')[0] // Dzisiejsza data jako dzień ostatniego podlania
      });
      
      // Dodaj nową roślinę do listy
      setPlants([...plants, response.data]);
      setSelectedPlant('');
      setError('');
    } catch (error) {
      console.error('Błąd dodawania rośliny', error);
      setError('Nie udało się dodać rośliny. Spróbuj ponownie.');
    }
  };

  // Podlewanie rośliny
  const handleWaterPlant = async (plantId) => {
    try {
      await api.patch(`user-plants/${plantId}/water/`);
      
      // Aktualizacja daty ostatniego podlania w interfejsie
      setPlants(plants.map(plant => 
        plant.id === plantId 
          ? {...plant, last_watered: new Date().toISOString().split('T')[0]}
          : plant
      ));
    } catch (error) {
      console.error('Błąd podczas podlewania', error);
      setError('Nie udało się zaktualizować statusu podlewania.');
    }
  };

  // Usuwanie rośliny z półki użytkownika
  const handleRemovePlant = async (plantId) => {
    try {
      await api.delete(`user-plants/${plantId}/`);
      setPlants(plants.filter(plant => plant.id !== plantId));
    } catch (error) {
      console.error('Błąd usuwania rośliny', error);
      setError('Nie udało się usunąć rośliny.');
    }
  };

  if (loading) return <div className="loading">Ładowanie danych...</div>;

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Twoja Półka z Roślinami</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="add-plant-section">
        <h3>Dodaj nową roślinę</h3>
        <div className="add-plant-form">
          <select 
            value={selectedPlant} 
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="plant-select"
          >
            <option value="">Wybierz roślinę</option>
            {availablePlants.map(plant => (
              <option key={plant.id} value={plant.id}>
                {plant.name}
              </option>
            ))}
          </select>
          <button onClick={handleAddPlant} className="add-button">Dodaj do mojej półki</button>
        </div>
      </div>
      
      {plants.length === 0 ? (
        <p className="no-plants">Brak roślin, dodaj nowe!</p>
      ) : (
        <div className="plants-grid">
          {plants.map(plant => (
            <div key={plant.id} className="plant-card">
              {plant.plant?.image && (
                <img 
                  src={plant.plant.image} 
                  alt={plant.plant.name} 
                  className="plant-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-plant.jpg'; // Zastępczy obraz
                  }}
                />
              )}
              <div className="plant-info">
                <h3>{plant.plant?.name || 'Nieznana roślina'}</h3>
                <p><strong>Podlewanie:</strong> {plant.plant?.watering_frequency 
                  ? `Co ${plant.plant.watering_frequency} dni` 
                  : 'Brak danych'}</p>
                <p><strong>Ilość wody:</strong> {plant.plant?.water_amount || 'Brak danych'}</p>
                <p><strong>Ostatnie podlanie:</strong> {plant.last_watered || 'Brak danych'}</p>
                <p className="days-to-water">
                  <strong>Następne podlanie za:</strong> {calculateDaysToWater(plant.last_watered, plant.plant?.watering_frequency)}
                </p>
              </div>
              <div className="plant-actions">
                <button 
                  onClick={() => handleWaterPlant(plant.id)} 
                  className="water-button"
                >
                  Podlej teraz
                </button>
                <button 
                  onClick={() => handleRemovePlant(plant.id)} 
                  className="remove-button"
                >
                  Usuń roślinę
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;