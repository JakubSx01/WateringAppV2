import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // Upewnij się, że importujesz poprawnie skonfigurowany axios instance
import PlantTable from '../components/PlantTable'; // Importuj nowy komponent
import PlantCardGrid from '../components/PlantCardGrid'; // Importuj nowy komponent
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' lub 'table'
  const navigate = useNavigate();

  // Funkcja do pobierania roślin użytkownika
  const fetchUserPlants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('user-plants/');
      setPlants(response.data);
    } catch (err) {
      console.error('Błąd pobierania roślin', err);
      setError('Nie udało się pobrać roślin. Spróbuj ponownie później.');
      if (err.response && err.response.status === 401) {
        // Token wygasł lub jest nieprawidłowy
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken'); // Usuń również refresh token
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]); // Dodajemy navigate jako zależność

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return; // Zakończ useEffect, jeśli nie ma tokenu
    }
    fetchUserPlants();
  }, [navigate, fetchUserPlants]); // Użyj fetchUserPlants w zależnościach

  // Funkcja do obsługi podlewania
  const handleWaterPlant = async (plantId) => {
      try {
          await api.post(`user-plants/${plantId}/water/`);
          // Po udanym podlaniu, odśwież listę roślin, aby zaktualizować daty
          fetchUserPlants();
          alert('Roślina podlana!'); // Opcjonalne powiadomienie
      } catch (err) {
          console.error('Błąd podczas podlewania rośliny', err);
          setError('Nie udało się podlać rośliny.');
           if (err.response && err.response.status === 401) {
               localStorage.removeItem('token');
               localStorage.removeItem('refreshToken');
               navigate('/login');
           }
      }
  };


  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Twoje rośliny</h2>
        <div className="view-toggle-buttons">
          <button
            onClick={() => setViewMode('card')}
            className={`button view-button ${viewMode === 'card' ? 'active' : ''}`}
            disabled={loading}
          >
            Widok Kart
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`button view-button ${viewMode === 'table' ? 'active' : ''}`}
            disabled={loading}
          >
            Widok Tabeli
          </button>
        </div>
        <button className="button logout-button-dashboard" onClick={handleLogout}>Wyloguj</button>
      </div>

      {loading && <div className="loading">Ładowanie...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <div className="plants-section">
          {viewMode === 'card' ? (
            <PlantCardGrid plants={plants} onWater={handleWaterPlant} />
          ) : (
            <PlantTable plants={plants} onWater={handleWaterPlant} />
          )}
        </div>
      )}

      {/* TODO: Dodać sekcję do dodawania nowych roślin */}
      {/* <div className="add-plant-section">
        <h3>Dodaj nową roślinę do swojej kolekcji</h3>
        {/* Tutaj można umieścić formularz lub przycisk otwierający modal */}
      {/*</div> */}
    </div>
  );
};

export default Dashboard;