import { useState } from 'react';
import { addNewPlant, addPlantToUser } from '../api/auth';

const AddPlantForm = ({ onPlantAdded }) => {
  const [plantData, setPlantData] = useState({
    name: '',
    species: '',
    water_amount_ml: '',
    watering_frequency_days: ''
  });

  const [selectedPlantId, setSelectedPlantId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPlantData({ ...plantData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addNewPlant(plantData);
      alert('Roślina dodana do bazy!');
      setPlantData({ name: '', species: '', water_amount_ml: '', watering_frequency_days: '' });
      onPlantAdded(); // Odświeżenie listy roślin
    } catch (error) {
      console.error('Błąd dodawania rośliny:', error);
    }
  };

  const handleAddToUser = async () => {
    if (!selectedPlantId) return;
    try {
      await addPlantToUser(selectedPlantId);
      alert('Roślina przypisana do użytkownika!');
      onPlantAdded(); // Odświeżenie listy roślin
    } catch (error) {
      console.error('Błąd przypisania rośliny:', error);
    }
  };

  return (
    <div>
      <h3>Dodaj nową roślinę do bazy:</h3>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" placeholder="Nazwa rośliny" value={plantData.name} onChange={handleChange} required />
        <input type="text" name="species" placeholder="Gatunek" value={plantData.species} onChange={handleChange} />
        <input type="number" name="water_amount_ml" placeholder="Ilość wody (ml)" value={plantData.water_amount_ml} onChange={handleChange} required />
        <input type="number" name="watering_frequency_days" placeholder="Częstotliwość podlewania (dni)" value={plantData.watering_frequency_days} onChange={handleChange} required />
        <button type="submit">Dodaj roślinę</button>
      </form>

      <h3>Przypisz roślinę do użytkownika:</h3>
      <input type="number" placeholder="ID rośliny" value={selectedPlantId || ''} onChange={(e) => setSelectedPlantId(e.target.value)} />
      <button onClick={handleAddToUser}>Przypisz roślinę</button>
    </div>
  );
};

export default AddPlantForm;
