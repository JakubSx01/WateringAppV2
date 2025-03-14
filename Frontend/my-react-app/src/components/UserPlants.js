import { useEffect, useState } from 'react';
import { getUserPlants, logoutUser } from '../api/auth';

const UserPlants = () => {
  const [plants, setPlants] = useState([]);

  useEffect(() => {
    const fetchPlants = async () => {
      const response = await getUserPlants();
      setPlants(response.data);
    };
    fetchPlants();
  }, []);

  const handleLogout = () => {
    logoutUser();
    window.location.href = '/login';
  };

  return (
    <div>
      <h1>Twoje Rośliny</h1>
      <ul>
        {plants.map((plant) => (
          <li key={plant.id}>{plant.plant.name}</li>
        ))}
      </ul>
      <button onClick={handleLogout}>Wyloguj</button>
    </div>
  );
};

const UserPlantItem = ({ plant, onWater }) => (
  <li>
    {plant.plant.name} - {plant.next_watering_date}
    <button onClick={() => onWater(plant.id)}>Podlej roślinę</button>
  </li>
);

export default UserPlantItem;
