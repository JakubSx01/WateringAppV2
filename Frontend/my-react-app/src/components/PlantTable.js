import React from 'react';
import '../styles/PlantTable.css';
import { formatDate } from '../utils/dateUtils';
import { getImageUrl } from '../utils/imageUtils';

// Add onShowDetails prop
const PlantTable = ({ plants, onWater, onShowDetails }) => {
  if (!plants || plants.length === 0) {
    return <p>Nie masz jeszcze żadnych roślin.</p>;
  }

  // Prevent default action or bubbling if needed when clicking button
   const handleButtonClick = (e, userPlantId) => {
    e.stopPropagation(); // Stop event from bubbling up to the row
    onWater(userPlantId);
  };

  // Function to call onShowDetails when row is clicked
  const handleRowClick = (userPlant) => {
    if (onShowDetails) {
      onShowDetails(userPlant);
    }
  };

  return (
    <div className="table-container">
      <table className="plant-table">
        <thead>
          <tr>
            <th>Zdjęcie</th>
            <th>Nazwa rośliny</th>
            <th>Ilość wody (ml)</th>
            <th>Ostatnie podlanie</th>
            <th>Następne podlanie</th>
            <th>Akcja</th>
          </tr>
        </thead>
        <tbody>
          {plants.map((userPlant) => (
            // Add onClick to the table row
            <tr key={userPlant.id} onClick={() => handleRowClick(userPlant)} className="plant-table-row">
              <td>
                <img
                  src={getImageUrl(userPlant.plant.image)}
                  alt={userPlant.plant.name}
                  className="plant-table-image"
                  onError={(e) => { e.target.onerror = null; e.target.src='/placeholder-plant.png'; }}
                />
              </td>
              <td>{userPlant.plant.name}</td>
              <td>{userPlant.plant.water_amount_ml} ml</td>
              <td>{formatDate(userPlant.last_watered_at)}</td>
              <td>{formatDate(userPlant.next_watering_date)}</td>
              <td>
                {/* Add stopPropagation to button's onClick */}
                <button onClick={(e) => handleButtonClick(e, userPlant.id)} className="button water-button-table">
                  Podlej
                </button>
                 {/* Optional: Add a dedicated "Details" button/link */}
                 {/* <button onClick={(e) => { e.stopPropagation(); onShowDetails(userPlant); }} className="button button-secondary details-button-table">Szczegóły</button> */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlantTable;