import React from 'react';
import PlantCard from './PlantCard';
import '../styles/PlantCardGrid.css'; // Utworzymy ten plik CSS później

const PlantCardGrid = ({ plants, onWater }) => {
  if (!plants || plants.length === 0) {
    return <p>Nie masz jeszcze żadnych roślin.</p>;
  }

  return (
    <div className="plants-grid">
      {plants.map((userPlant) => (
        <PlantCard key={userPlant.id} plant={userPlant} onWater={onWater} />
      ))}
    </div>
  );
};

export default PlantCardGrid;