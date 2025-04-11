// Frontend/my-react-app/src/components/AvailablePlants.js
import React, { useState } from 'react';
import '../styles/AvailablePlants.css';
import { getImageUrl } from '../utils/imageUtils';

// Dodaj prop onShowDetails
const AvailablePlants = ({ plants, onAddToCollection, userPlantIds, onShowDetails }) => {
    const [filter, setFilter] = useState('');

    if (!plants) {
        return <p>Ładowanie dostępnych roślin...</p>;
    }

    const handleFilterChange = (e) => {
        setFilter(e.target.value);
    };

    const filteredPlants = plants.filter(plant =>
        plant.name.toLowerCase().includes(filter.toLowerCase()) ||
        (plant.species && plant.species.toLowerCase().includes(filter.toLowerCase()))
    );

    const userPlantIdSet = new Set(userPlantIds);

    // Handler kliknięcia na element listy (cały <li>)
    const handleItemClick = (plant) => {
        if (onShowDetails) {
            onShowDetails(plant); // Przekaż obiekt plant
        }
    };

    // Handler kliknięcia na przycisk "Dodaj"
    const handleButtonClick = (e, plantId) => {
        e.stopPropagation(); // Zatrzymaj propagację, aby nie wywołać handleItemClick
        onAddToCollection(plantId);
    };

    return (
        <div className="available-plants-container">
            <h3 className="available-plants-title">Dostępne Rośliny w Bazie</h3>
            <input
                type="text"
                placeholder="Filtruj po nazwie lub gatunku..."
                value={filter}
                onChange={handleFilterChange}
                className="filter-input"
            />
            {filteredPlants.length > 0 ? (
                <ul className="available-plants-list">
                    {filteredPlants.map(plant => (
                        // Dodaj onClick do <li>
                        <li key={plant.id} className="available-plant-item" onClick={() => handleItemClick(plant)}>
                            <img
                                src={getImageUrl(plant.image)}
                                alt={plant.name}
                                className="available-plant-image"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-plant.png'; }}
                            />
                            <div className="available-plant-info">
                                <span className="available-plant-name">{plant.name}</span>
                                <span className="available-plant-species">{plant.species || 'Brak gatunku'}</span>
                            </div>
                            {/* Dodaj onClick z handleButtonClick do przycisku */}
                            <button
                                onClick={(e) => handleButtonClick(e, plant.id)}
                                className="button add-to-collection-button"
                                disabled={userPlantIdSet.has(plant.id)}
                            >
                                {userPlantIdSet.has(plant.id) ? 'W kolekcji' : 'Dodaj'} {/* Zmień tekst dla jasności */}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Nie znaleziono pasujących roślin lub brak roślin w bazie.</p>
            )}
        </div>
    );
};

export default AvailablePlants;