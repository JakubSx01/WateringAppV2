// Frontend/my-react-app/src/components/PlantCard.js
import React from 'react';
import '../styles/PlantCard.css';
import { formatDate } from '../utils/dateUtils';
import { getImageUrl } from '../utils/imageUtils';

const PlantCard = ({ plant: userPlant, onWater, onShowDetails }) => {
    const handleCardClick = () => {
        console.log("Kliknięto kartę:", userPlant); // Dodaj logowanie
        if (onShowDetails) {
            onShowDetails(userPlant);
        }
    };

    const handleButtonClick = (e) => {
        e.stopPropagation();
        onWater(userPlant.id);
    };

    return (
        <div className="plant-card" onClick={handleCardClick}>
            <div className="plant-card-image-container">
                <img
                    src={getImageUrl(userPlant.plant.image)}
                    alt={userPlant.plant.name}
                    className="plant-card-image"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-plant.png'; }}
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
                <button onClick={handleButtonClick} className="button water-button-card">
                    Podlej
                </button>
            </div>
        </div>
    );
};

export default PlantCard;