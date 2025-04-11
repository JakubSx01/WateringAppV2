import React from 'react';
import '../styles/PlantCard.css'; // Utworzymy ten plik CSS później

// Użyj tych samych funkcji pomocniczych co w PlantTable
const formatDate = (dateString) => {
  if (!dateString) return 'Brak danych';
   try {
    const date = new Date(dateString);
     if (isNaN(date.getTime())) {
        return 'Nieprawidłowa data';
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (error) {
     console.error("Error formatting date:", dateString, error);
     return 'Błąd daty';
  }
};

const getImageUrl = (imagePath) => {
    if (!imagePath) return '/placeholder-plant.png';
    const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';
    // Łączymy bezpośrednio, bo backend zwraca ścieżkę z /media/
    return `${baseUrl}${imagePath}`;
};


const PlantCard = ({ plant: userPlant, onWater }) => {
  return (
    <div className="plant-card">
      <div className="plant-card-image-container">
        <img
          src={getImageUrl(userPlant.plant.image)}
          alt={userPlant.plant.name}
          className="plant-card-image"
          onError={(e) => { e.target.onerror = null; e.target.src='/placeholder-plant.png'; }}
        />
      </div>
      <div className="plant-card-content">
        <h3 className="plant-card-name">{userPlant.plant.name}</h3>
        <div className="plant-card-details">
          <div className="detail-item">
            <span className="detail-label">Ostatnio podlana:</span>
            <span className="detail-value">{formatDate(userPlant.last_watered_at)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Ilość wody:</span>
            <span className="detail-value">{userPlant.plant.water_amount_ml} ml</span>
          </div>
        </div>
         <div className="plant-card-next-watering">
            <span className="detail-label">Następne podlewanie:</span>
            <span className="detail-value bold">{formatDate(userPlant.next_watering_date)}</span>
        </div>
        <button onClick={() => onWater(userPlant.id)} className="button water-button-card">
          Podlej
        </button>
      </div>
    </div>
  );
};

export default PlantCard;