// Frontend/my-react-app/src/components/PlantCardGrid.js
import React from 'react';
import PlantCard from './PlantCard';
import '../styles/PlantCardGrid.css';

// Upewnij się, że onShowDetails jest tutaj przekazywane
const PlantCardGrid = ({ plants, onWater, onShowDetails }) => {
  if (!plants || plants.length === 0) {
    return <p>Nie masz jeszcze żadnych roślin.</p>;
  }

  return (
    <div className="plants-grid">
      {plants.map((userPlant) => (
        <PlantCard
            key={userPlant.id}
            plant={userPlant}
            onWater={onWater}
            onShowDetails={onShowDetails} // <-- Upewnij się, że ta linia istnieje i przekazuje prop
        />
      ))}
    </div>
  );
};

export default PlantCardGrid;