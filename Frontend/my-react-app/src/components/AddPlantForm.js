// Frontend/my-react-app/src/components/AddPlantForm.js
import React, { useState } from 'react';
import { addNewPlantDefinition } from '../services/api';
import '../styles/AddPlantForm.css';

// Zaktualizowane opcje gleby z KLUCZAMI jako value
const soilTypeOptions = [
    { value: '', label: 'Wybierz typ gleby...' },
    { value: 'universal', label: 'Uniwersalna' },             // value: 'universal'
    { value: 'sandy', label: 'Piaszczysta' },                 // value: 'sandy'
    { value: 'peat', label: 'Torfowa' },                      // value: 'peat'
    { value: 'clay', label: 'Gliniasta' },                    // value: 'clay'
    { value: 'loamy', label: 'Próchnicza' },                  // value: 'loamy'
    { value: 'chalky', label: 'Wapienna' },                   // value: 'chalky'
    // { value: 'other', label: 'Inna' }, # Jeśli dodałeś w modelu
];

// Zaktualizowane opcje światła z KLUCZAMI jako value
const sunlightOptions = [
    { value: '', label: 'Wybierz nasłonecznienie...' },
    { value: 'full_sun', label: 'Pełne słońce' },             // value: 'full_sun'
    { value: 'partial_shade', label: 'Półcień' },            // value: 'partial_shade'
    { value: 'bright_indirect', label: 'Jasne rozproszone' }, // value: 'bright_indirect'
    { value: 'shade', label: 'Cień' },                       // value: 'shade'
];


const AddPlantForm = ({ onPlantAdded, onError }) => {
    const [formData, setFormData] = useState({
        name: '', species: '', water_amount_ml: '', watering_frequency_days: '',
        sunlight: '', soil_type: '', preferred_temperature: '', image: null,
    });
    const [loading, setLoading] = useState(false);

    // ... handleChange i handleSubmit bez zmian ...
    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            setFormData({ ...formData, [name]: files[0] });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        onError('');

        if (!formData.name || !formData.water_amount_ml || !formData.watering_frequency_days) {
            onError('Nazwa, ilość wody i częstotliwość podlewania są wymagane.');
            setLoading(false);
            return;
        }

        const dataToSend = new FormData();
         Object.keys(formData).forEach(key => {
            // Przekazuj tylko wartości, które nie są null ani pustym stringiem, LUB jeśli to obrazek
            if ((formData[key] !== null && formData[key] !== '') || key === 'image') {
                // Specjalna obsługa dla liczb - tylko jeśli nie są puste
                if ((key === 'water_amount_ml' || key === 'watering_frequency_days' || key === 'preferred_temperature') && formData[key] !== '') {
                    dataToSend.append(key, Number(formData[key]));
                }
                // Specjalna obsługa dla obrazka - tylko jeśli nie jest null
                else if (key === 'image' && formData[key] !== null) {
                    dataToSend.append(key, formData[key]);
                }
                // Pozostałe pola (stringi) - tylko jeśli nie są puste
                else if (key !== 'image' && (key !== 'water_amount_ml' && key !== 'watering_frequency_days' && key !== 'preferred_temperature') && formData[key] !== '') {
                    dataToSend.append(key, formData[key]);
                }
            }
        });

        // Debug: Zobacz co wysyłasz
        // for (let [key, value] of dataToSend.entries()) {
        //     console.log(`${key}: ${value}`);
        // }


        try {
            await addNewPlantDefinition(dataToSend);
            setFormData({ // Resetuj formularz
                name: '', species: '', water_amount_ml: '', watering_frequency_days: '',
                sunlight: '', soil_type: '', preferred_temperature: '', image: null,
            });
            if (document.getElementById('image-input')) {
                document.getElementById('image-input').value = '';
            }
            onPlantAdded();
        } catch (error) {
            console.error('Błąd dodawania nowej rośliny:', error.response?.data || error.message);
            let errorMessage = 'Nie udało się dodać rośliny. Sprawdź połączenie lub dane.';
            if (error.response?.data) {
                const errors = error.response.data;
                // Poprawiony sposób obsługi błędów walidacji DRF
                const messages = Object.entries(errors).map(([field, msgs]) => {
                    // Jeśli msgs to tablica, połącz je; inaczej weź bezpośrednio
                     const message = Array.isArray(msgs) ? msgs.join(' ') : msgs;
                     // Użyj bardziej opisowej nazwy pola jeśli to możliwe (np. z labelki, trudne tutaj)
                     return `${field}: ${message}`;
                }).join('; ');

                if (messages) errorMessage = `Błąd walidacji: ${messages}`;
            }
            onError(errorMessage);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="add-plant-form-container">
            <h3 className="add-plant-form-title">Dodaj Nową Roślinę do Bazy Danych</h3>
            <form onSubmit={handleSubmit} className="add-plant-form">
                {/* Name, Water Amount, Frequency, Species - bez zmian */}
                 <div className="form-group">
                    <label htmlFor="name">Nazwa Rośliny*</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="form-input" required />
                </div>
                <div className="form-group">
                    <label htmlFor="water_amount_ml">Ilość Wody (ml)*</label>
                    <input type="number" id="water_amount_ml" name="water_amount_ml" value={formData.water_amount_ml} onChange={handleChange} className="form-input" required min="1" />
                </div>
                <div className="form-group">
                    <label htmlFor="watering_frequency_days">Częstotliwość Podlewania (dni)*</label>
                    <input type="number" id="watering_frequency_days" name="watering_frequency_days" value={formData.watering_frequency_days} onChange={handleChange} className="form-input" required min="1" />
                </div>
                <div className="form-group">
                    <label htmlFor="species">Gatunek</label>
                    <input type="text" id="species" name="species" value={formData.species} onChange={handleChange} className="form-input" />
                 </div>

                {/* Zaktualizowany select dla Sunlight */}
                <div className="form-group">
                    <label htmlFor="sunlight">Nasłonecznienie</label>
                    <select id="sunlight" name="sunlight" value={formData.sunlight} onChange={handleChange} className="form-input">
                         {sunlightOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Zaktualizowany select dla Soil Type */}
                <div className="form-group">
                    <label htmlFor="soil_type">Typ Gleby</label>
                    <select id="soil_type" name="soil_type" value={formData.soil_type} onChange={handleChange} className="form-input">
                        {soilTypeOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Preferred Temperature, Image - bez zmian */}
                 <div className="form-group">
                    <label htmlFor="preferred_temperature">Preferowana Temperatura (°C)</label>
                    <input type="number" id="preferred_temperature" name="preferred_temperature" value={formData.preferred_temperature} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="image-input">Zdjęcie Rośliny</label>
                    <input type="file" id="image-input" name="image" onChange={handleChange} className="form-input" accept="image/*" />
                </div>

                <button type="submit" className="button" disabled={loading}>
                    {loading ? 'Dodawanie...' : 'Dodaj Roślinę do Bazy'}
                </button>
            </form>
        </div>
    );
};

export default AddPlantForm;