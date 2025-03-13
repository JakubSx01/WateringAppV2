import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Dashboard = () => {
  const [plants, setPlants] = useState([]);

  useEffect(() => {
    // Przykład pobierania danych użytkownika (np. lista roślin)
    const fetchUserPlants = async () => {
      try {
        const response = await api.get('user-plants/');
        setPlants(response.data);
      } catch (error) {
        console.error('Błąd pobierania roślin', error);
      }
    };
    fetchUserPlants();
  }, []);

  return (
    <div>
      <h2>Twoje rośliny</h2>
      {plants.length === 0 ? (
        <p>Brak roślin, dodaj nowe!</p>
      ) : (
        <ul>
          {plants.map(plant => (
            <li key={plant.id}>{plant.plant.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
