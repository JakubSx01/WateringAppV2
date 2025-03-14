import { useState, useEffect } from 'react';
import { fetchPlants, uploadPlant, addPlantToUser } from '../api/auth';
const API_URL = process.env.REACT_APP_API_URL;

const AddPlantForm = ({ onPlantAdded }) => {
  const [plantData, setPlantData] = useState({
    name: '',
    species: '',
    water_amount_ml: '',
    watering_frequency_days: '',
    image: null
  });
  const [plants, setPlants] = useState([]);

  useEffect(() => {
    const loadPlants = async () => {
      const response = await fetchPlants();
      setPlants(response.data);
    };
    loadPlants();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setPlantData({ ...plantData, image: files[0] });
    } else {
      setPlantData({ ...plantData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await uploadPlant(plantData);
    onPlantAdded();
  };

  const handleAddToUser = async (plantId) => {
    await addPlantToUser(plantId);
    onPlantAdded();
  };

  return (
    <div>
      <h3>Dodaj nową roślinę:</h3>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" placeholder="Nazwa" onChange={handleChange} />
        <input type="text" name="species" placeholder="Gatunek" onChange={handleChange} />
        <input type="number" name="water_amount_ml" placeholder="Woda (ml)" onChange={handleChange} />
        <input type="number" name="watering_frequency_days" placeholder="Częstotliwość (dni)" onChange={handleChange} />
        <input type="file" name="image" onChange={handleChange} />
        <button type="submit">Dodaj roślinę</button>
      </form>

      <h3>Lista roślin z bazy danych:</h3>
      <div style={{ maxHeight: '300px', overflowY: 'scroll' }}>
        {plants.map((plant) => (
          <div key={plant.id}>
            <p>{plant.name} - {plant.species}</p>
            {plant.image && <img src={`${API_URL}/${plant.image}`} alt={plant.name} width="50" />} 
          </div>
        ))}
      </div>
    </div>
  );
};

export default AddPlantForm;
