// Frontend/my-react-app/src/components/PlantDetailModal.js
import React from 'react';
import '../styles/PlantDetailModal.css';
import { getImageUrl } from '../utils/imageUtils';
import { formatDate } from '../utils/dateUtils';

const PlantDetailModal = ({ plantData, onClose }) => {
    if (!plantData || !plantData.plant) return null;

    const { plant } = plantData;
    const { last_watered_at, next_watering_date } = plantData;

    const displayValue = (value, suffix = '') => {
        return value !== null && value !== undefined ? `${value}${suffix}` : 'Brak danych';
    };

    // Zaktualizowana funkcja tłumacząca KLUCZE na Etykiety
    const displayChoice = (key, type) => {
        if (!key) return 'Brak danych';

        if (type === 'sunlight') {
            switch (key) {
                case 'full_sun': return 'Pełne słońce';
                case 'partial_shade': return 'Półcień';
                case 'bright_indirect': return 'Jasne rozproszone'; // Tłumaczenie nowego klucza
                case 'shade': return 'Cień';
                default: return key; // Zwróć klucz, jeśli nieznany
            }
        } else if (type === 'soil') {
            switch (key) {
                case 'universal': return 'Uniwersalna';
                case 'sandy': return 'Piaszczysta';
                case 'peat': return 'Torfowa';
                case 'clay': return 'Gliniasta';
                case 'loamy': return 'Próchnicza';
                case 'chalky': return 'Wapienna';
                // case 'other': return 'Inna'; // Jeśli dodałeś
                default: return key; // Zwróć klucz, jeśli nieznany
            }
        }
        return key; // Domyślnie zwróć klucz
    };


    const renderUserSpecificDetails = () => {
        // Sprawdzamy obecność kluczy specyficznych dla UserPlant
        if ('last_watered_at' in plantData || 'next_watering_date' in plantData) {
             return (
                <>
                    <hr />
                    <p><strong>Ostatnio podlana:</strong> {formatDate(last_watered_at)}</p>
                    <p><strong>Następne podlewanie:</strong> <span className="bold">{formatDate(next_watering_date)}</span></p>
                </>
            );
        }
        return null;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>×</button>
                <h2 className="modal-title">{plant.name}</h2>
                <div className="modal-body">
                    <div className="modal-image-container">
                        <img
                            src={getImageUrl(plant.image)}
                            alt={plant.name}
                            className="modal-image"
                            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-plant.png'; }}
                        />
                    </div>
                    <div className="modal-details">
                        <p><strong>Gatunek:</strong> {displayValue(plant.species)}</p>
                        <p><strong>Ilość wody:</strong> {displayValue(plant.water_amount_ml, ' ml')}</p>
                        <p><strong>Częstotliwość podlewania:</strong> co {displayValue(plant.watering_frequency_days, ' dni')}</p>
                         {/* Używamy displayChoice z odpowiednim typem */}
                        <p><strong>Nasłonecznienie:</strong> {displayChoice(plant.sunlight, 'sunlight')}</p>
                        <p><strong>Typ gleby:</strong> {displayChoice(plant.soil_type, 'soil')}</p>
                        <p><strong>Preferowana temperatura:</strong> {displayValue(plant.preferred_temperature, '°C')}</p>
                        {renderUserSpecificDetails()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlantDetailModal;