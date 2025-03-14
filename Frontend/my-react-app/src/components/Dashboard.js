import { useEffect, useState } from 'react';
import { fetchUserPlants, waterPlant, fetchPlants, addPlantToUser, uploadPlant } from '../api/auth';

const Dashboard = () => {
  const [plants, setPlants] = useState([]);
  const [allPlants, setAllPlants] = useState([]);
  const [filteredPlants, setFilteredPlants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlantList, setShowPlantList] = useState(false);
  const [showAddPlantForm, setShowAddPlantForm] = useState(false);
  const [newPlantData, setNewPlantData] = useState({
    name: '',
    species: '',
    water_amount_ml: '',
    watering_frequency_days: '',
    image: null
  });
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

  const loadAllPlants = async () => {
    const response = await fetchPlants();
    setAllPlants(response.data);
    setFilteredPlants(response.data);
  };

  const handleWaterPlant = async (plantId) => {
    await waterPlant(plantId);
    loadPlants();
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  const handleAddPlantToUser = async (plantId) => {
    await addPlantToUser(plantId);
    loadPlants();
    setShowPlantList(false);
  };

  const handleFilter = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filtered = allPlants.filter(plant => 
      plant.name.toLowerCase().includes(query) || 
      (plant.species && plant.species.toLowerCase().includes(query))
    );
    setFilteredPlants(filtered);
  };

  const handleNewPlantChange = (e) => {
    const { name, value, files } = e.target;
    setNewPlantData({ ...newPlantData, [name]: files ? files[0] : value });
  };

  const handleNewPlantSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    for (const key in newPlantData) {
      formData.append(key, newPlantData[key]);
    }
    await uploadPlant(formData);
    loadAllPlants();
    setShowAddPlantForm(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadPlants();
      loadAllPlants();
    }
  }, [isLoggedIn]);

  // Obliczanie statusu nawodnienia
  const calculateWaterStatus = (plant) => {
    const lastWatered = new Date(plant.last_watered);
    const today = new Date();
    const daysSinceWatered = Math.floor((today - lastWatered) / (1000 * 60 * 60 * 24));
    const daysUntilWatering = plant.watering_frequency_days - daysSinceWatered;
    
    if (daysUntilWatering <= 0) {
      return { status: 'critical', text: 'Podlej teraz!' };
    } else if (daysUntilWatering <= 1) {
      return { status: 'warning', text: 'Podlej wkrótce' };
    } else {
      return { status: 'good', text: `Za ${daysUntilWatering} dni` };
    }
  };

  if (!isLoggedIn) {
    return <h1>Musisz się zalogować, aby uzyskać dostęp do Dashboardu.</h1>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Twoje Rośliny</h1>
        <div className="header-buttons">
          <button 
            className="add-plant-button" 
            onClick={() => setShowPlantList(!showPlantList)}
          >
            {showPlantList ? 'Zamknij listę' : 'Dodaj roślinę'}
          </button>
          <button className="logout-button" onClick={handleLogout}>Wyloguj</button>
        </div>
      </header>

      <div className="plants-grid">
        {plants.map(plant => {
          const waterStatus = calculateWaterStatus(plant);
          return (
            <div key={plant.id} className="plant-card">
              <div className="plant-image">
                {plant.image_url ? (
                  <img src={plant.image_url} alt={plant.name} />
                ) : (
                  <div className="placeholder-image">🌱</div>
                )}
              </div>
              <div className="plant-info">
                <h3>{plant.name}</h3>
                {plant.species && <p className="plant-species">{plant.species}</p>}
                <div className={`water-status water-${waterStatus.status}`}>
                  <span className="water-icon">💧</span>
                  <span>{waterStatus.text}</span>
                </div>
                <div className="plant-details">
                  <p>Woda: {plant.water_amount_ml} ml</p>
                  <p>Częstotliwość: co {plant.watering_frequency_days} dni</p>
                </div>
                <button 
                  className="water-button" 
                  onClick={() => handleWaterPlant(plant.id)}
                >
                  Podlej roślinę
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {plants.length === 0 && (
        <div className="empty-state">
          <p>Nie masz jeszcze żadnych roślin. Dodaj swoją pierwszą roślinę!</p>
        </div>
      )}

      {/* Modal z listą wszystkich roślin */}
      {showPlantList && (
        <div className="plant-list-modal">
          <div className="plant-list-content">
            <div className="plant-list-header">
              <h2>Wybierz roślinę</h2>
              <input
                type="text"
                placeholder="Wyszukaj po nazwie lub gatunku"
                value={searchQuery}
                onChange={handleFilter}
                className="search-input"
              />
              <button className="close-modal" onClick={() => setShowPlantList(false)}>×</button>
            </div>
            
            <div className="plant-list-container">
              {filteredPlants.length > 0 ? (
                <div className="plant-list">
                  {filteredPlants.map(plant => (
                    <div key={plant.id} className="plant-list-item">
                      <div className="plant-list-info">
                        {plant.image_url && <img src={plant.image_url} alt={plant.name} className="plant-thumbnail" />}
                        <div className="plant-list-details">
                          <h3>{plant.name}</h3>
                          {plant.species && <p>{plant.species}</p>}
                          <div className="plant-properties">
                            <span>Woda: {plant.water_amount_ml} ml</span>
                            <span>Podlewanie: co {plant.watering_frequency_days} dni</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        className="add-to-shelf-button" 
                        onClick={() => handleAddPlantToUser(plant.id)}
                      >
                        Dodaj do półki
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-results">Brak wyników wyszukiwania</p>
              )}
            </div>
            
            <div className="plant-list-footer">
              <button 
                className="add-new-plant" 
                onClick={() => {
                  setShowAddPlantForm(!showAddPlantForm);
                }}
              >
                {showAddPlantForm ? 'Anuluj' : 'Dodaj nową roślinę do bazy'}
              </button>
            </div>
            
            {showAddPlantForm && (
              <form className="add-plant-form" onSubmit={handleNewPlantSubmit}>
                <div className="form-group">
                  <label>Nazwa rośliny</label>
                  <input type="text" name="name" onChange={handleNewPlantChange} required />
                </div>
                <div className="form-group">
                  <label>Gatunek</label>
                  <input type="text" name="species" onChange={handleNewPlantChange} />
                </div>
                <div className="form-group">
                  <label>Ilość wody (ml)</label>
                  <input type="number" name="water_amount_ml" onChange={handleNewPlantChange} required />
                </div>
                <div className="form-group">
                  <label>Częstotliwość podlewania (dni)</label>
                  <input type="number" name="watering_frequency_days" onChange={handleNewPlantChange} required />
                </div>
                <div className="form-group">
                  <label>Zdjęcie</label>
                  <input type="file" name="image" onChange={handleNewPlantChange} />
                </div>
                <button type="submit" className="submit-button">Dodaj do bazy</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;