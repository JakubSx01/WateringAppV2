// Frontend/my-react-app/src/components/PlantTable.js
import React from 'react';
import '../styles/PlantTable.css';
import { formatDate } from '../utils/dateUtils';
import { getImageUrl } from '../utils/imageUtils';

// Add onShowDetails prop
const PlantTable = ({ plants, onWater, onShowDetails, onDelete }) => {
  if (!plants || plants.length === 0) {
    return <p>Nie masz jeszcze żadnych roślin w swojej kolekcji.</p>; // Updated message
  }

  // Prevent default action or bubbling if needed when clicking button
   const handleWaterClick = (e, userPlantId) => {
    e.stopPropagation(); // Stop event from bubbling up to the row
    onWater(userPlantId);
  };

  const handleDeleteClick = (e, userPlantId) => {
    e.stopPropagation(); // Stop event from bubbling up to the row
    if (window.confirm('Czy na pewno chcesz usunąć tę roślinę ze swojej kolekcji?')) { // Add confirmation here
        onDelete(userPlantId);
    }
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
            {/* Add data-label for potential responsive stacking */}
            <th data-label="Zdjęcie">Zdjęcie</th>
            <th data-label="Nazwa">Nazwa</th>
            <th data-label="Ilość wody (ml)">Ilość wody (ml)</th>
            <th data-label="Ostatnie podlanie">Ostatnie podlanie</th>
            <th data-label="Następne podlanie">Następne podlanie</th>
            <th data-label="Akcje">Akcje</th>
          </tr>
        </thead>
        <tbody>
          {plants.map((userPlant) => (
            // Add onClick to the table row
            <tr key={userPlant.id} onClick={() => handleRowClick(userPlant)} className="plant-table-row">
              <td data-label="Zdjęcie"> {/* Add data-label */}
                <img
                  src={getImageUrl(userPlant.plant.image)}
                  alt={userPlant.plant.name}
                  className="plant-table-image"
                  // Add placeholder on error
                  onError={(e) => { e.target.onerror = null; e.target.src='/placeholder-plant.png'; }}
                />
              </td>
              <td data-label="Nazwa">{userPlant.plant.name}</td> {/* Add data-label */}
              <td data-label="Ilość wody (ml)">{userPlant.plant.water_amount_ml} ml</td> {/* Add data-label */}
              <td data-label="Ostatnie podlanie">{formatDate(userPlant.last_watered_at)}</td> {/* Add data-label */}
              <td data-label="Następne podlanie">{formatDate(userPlant.next_watering_date)}</td> {/* Add data-label */}
              <td data-label="Akcje"> {/* Add data-label */}
                {/* Add stopPropagation to button's onClick */}
                <button onClick={(e) => handleWaterClick(e, userPlant.id)} className="button water-button-table">
                  Podlej
                </button>
                <button onClick={(e) => handleDeleteClick(e, userPlant.id)} className="button button-danger delete-button-table">
                  Usuń
                </button>
                 {/* Optional: Details button example */}
                 {/* <button onClick={(e) => { e.stopPropagation(); onShowDetails(userPlant); }} className="button details-button-table">Szczegóły</button> */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlantTable;