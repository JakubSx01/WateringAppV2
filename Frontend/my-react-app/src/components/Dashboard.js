import { useEffect, useState } from 'react';
import { fetchUserPlants, waterPlant } from '../api/auth';
import UserPlantItem from './UserPlantItem';
import AddPlantForm from './AddPlantForm';

const Dashboard = () => {
  const [plants, setPlants] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access_token'));

  const loadPlants = async () => {
    try {
      const response = await fetchUserPlants();
      setPlants(response.data);
    } catch {
      setIsLoggedIn(false);
      window.location.href = '/login';
    }
  };

  const handleWaterPlant = async (plantId) => {
    await waterPlant(plantId);
    loadPlants();  // Odśwież dane po podlaniu
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  useEffect(() => {
    if (isLoggedIn) loadPlants();
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <h1>Musisz się zalogować, aby uzyskać dostęp do Dashboardu.</h1>;
  }

  return (
    <div>
      <h1>Twoje Rośliny</h1>
      <ul>
        {plants.map(plant => (
          <UserPlantItem key={plant.id} plant={plant} onWater={handleWaterPlant} />
        ))}
      </ul>
      <AddPlantForm onPlantAdded={loadPlants} />
      <button onClick={handleLogout}>Wyloguj</button>
    </div>
  );
};

export default Dashboard;
