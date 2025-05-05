// Frontend/my-react-app/src/components/AddPlantForm.js
import React, { useState } from 'react';
// Correct import path, should call standard endpoint POST /plants/
import { addNewPlantDefinition } from '../services/api';
import '../styles/AddPlantForm.css';

// Zaktualizowane opcje gleby z KLUCZAMI jako value
const soilTypeOptions = [
    { value: '', label: 'Wybierz typ gleby...' },
    { value: 'universal', label: 'Uniwersalna' },
    { value: 'sandy', label: 'Piaszczysta' },
    { value: 'peat', label: 'Torfowa' },
    { value: 'clay', label: 'Gliniasta' },
    { value: 'loamy', label: 'Próchnicza' },
    { value: 'chalky', label: 'Wapienna' },
];

// Zaktualizowane opcje światła z KLUCZAMI jako value
const sunlightOptions = [
    { value: '', label: 'Wybierz nasłonecznienie...' },
    { value: 'full_sun', label: 'Pełne słońce' },
    { value: 'partial_shade', label: 'Półcień' },
    { value: 'bright_indirect', label: 'Jasne rozproszone' },
    { value: 'shade', label: 'Cień' },
];


const AddPlantForm = ({ onPlantAdded, onError }) => {
    const [formData, setFormData] = useState({
        name: '', species: '', water_amount_ml: '', watering_frequency_days: '',
        sunlight: '', soil_type: '', preferred_temperature: '', image: null,
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            setFormData({ ...formData, [name]: files[0] });
        } else {
            // Handle empty optional number field -> store as empty string for now
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        onError(''); // Clear previous errors passed from parent

        // Basic frontend validation (can be more sophisticated)
        if (!formData.name.trim() || !String(formData.water_amount_ml).trim() || !String(formData.watering_frequency_days).trim()) {
            onError('Pola: Nazwa, Ilość Wody (ml) i Częstotliwość Podlewania (dni) są wymagane.');
            setLoading(false);
            return;
        }
         // Validate numeric fields are positive integers
        const waterAmount = Number(formData.water_amount_ml);
        const wateringFrequency = Number(formData.watering_frequency_days);

        if (!Number.isInteger(waterAmount) || waterAmount <= 0) {
             onError('Ilość wody (ml) musi być dodatnią liczbą całkowitą.');
             setLoading(false);
             return;
        }
         if (!Number.isInteger(wateringFrequency) || wateringFrequency <= 0) {
             onError('Częstotliwość podlewania (dni) musi być dodatnią liczbą całkowitą.');
             setLoading(false);
             return;
        }

        // Validate preferred temperature if provided
        const preferredTemperature = formData.preferred_temperature === '' ? null : Number(formData.preferred_temperature);
        if (formData.preferred_temperature !== '' && (preferredTemperature === null || isNaN(preferredTemperature))) {
             onError('Preferowana temperatura musi być liczbą.');
             setLoading(false);
             return;
        }


        const dataToSend = new FormData();

        // Append required fields (already validated)
        dataToSend.append('name', formData.name.trim());
        dataToSend.append('water_amount_ml', waterAmount);
        dataToSend.append('watering_frequency_days', wateringFrequency);

        // Append optional fields only if they have a non-empty value or are explicitly set
        if (formData.species && formData.species.trim()) {
            dataToSend.append('species', formData.species.trim());
        }
        if (formData.sunlight) { // select has default "" value, only send if a choice is made
            dataToSend.append('sunlight', formData.sunlight);
        }
        if (formData.soil_type) { // select has default "" value, only send if a choice is made
            dataToSend.append('soil_type', formData.soil_type);
        }
        // Append optional temperature only if it's a valid number (already checked and converted to null if empty string)
        if (preferredTemperature !== null) {
             dataToSend.append('preferred_temperature', preferredTemperature);
        }
        if (formData.image) {
            dataToSend.append('image', formData.image);
        }

        // Debug: Log FormData contents
        console.log("Wysyłanie danych FormData do /api/plants/ (propozycja):");
        for (let [key, value] of dataToSend.entries()) {
             // For File objects, log the name and type
             if (value instanceof File) {
                 console.log(`${key}: File(name=${value.name}, size=${value.size}, type=${value.type})`);
             } else {
                 console.log(`${key}: ${value} (Type: ${typeof value})`);
             }
         }


        try {
            // Use the addNewPlantDefinition function which calls api.post('plants/', ...)
            await addNewPlantDefinition(dataToSend);
            setFormData({ // Reset form
                name: '', species: '', water_amount_ml: '', watering_frequency_days: '',
                sunlight: '', soil_type: '', preferred_temperature: '', image: null,
            });
            // Reset file input visually
            const imageInput = document.getElementById('image-input');
            if (imageInput) {
                 imageInput.value = '';
            }
            onPlantAdded(); // Callback on success (toggles form visibility, shows success message)
        } catch (error) {
            console.error('Błąd dodawania nowej rośliny:', error.response?.data || error.message);
            let errorMessage = 'Nie udało się dodać rośliny. Sprawdź wprowadzone dane lub spróbuj ponownie później.'; // Default message

            if (error.response?.data) {
                const errors = error.response.data;
                let detailedMessages = [];

                // Handle DRF field errors (dictionary)
                if (typeof errors === 'object' && errors !== null && !Array.isArray(errors)) {
                     // Map backend field names to user-friendly names
                    const fieldNames = {
                        name: "Nazwa",
                        water_amount_ml: "Ilość wody (ml)",
                        watering_frequency_days: "Częstotliwość podlewania (dni)",
                        species: "Gatunek",
                        sunlight: "Nasłonecznienie",
                        soil_type: "Typ gleby",
                        preferred_temperature: "Temperatura (°C)",
                        image: "Zdjęcie",
                        detail: "Błąd ogólny", // Handle DRF detail field
                        non_field_errors: "Błąd ogólny", // Handle non-field errors
                    };

                    detailedMessages = Object.entries(errors).map(([field, msgs]) => {
                        const fieldLabel = fieldNames[field] || field; // Use mapped name or original field name
                        const message = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
                        return `${fieldLabel}: ${message}`;
                    });
                }
                // Handle non-field errors (often a list) or general error strings
                else if (Array.isArray(errors)) {
                     detailedMessages = errors.map(msg => String(msg));
                } else if (typeof errors === 'string') {
                    detailedMessages.push(errors);
                }

                if (detailedMessages.length > 0) {
                    errorMessage = `Błąd walidacji: ${detailedMessages.join('; ')}`;
                } else if (error.response.status >= 500) {
                     errorMessage = 'Wystąpił błąd serwera. Spróbuj ponownie później.';
                }
                 // Consider specific status codes
                else if (error.response.status === 400) {
                     if (detailedMessages.length === 0) { // Fallback if no specific field errors
                          errorMessage = 'Nieprawidłowe zapytanie. Sprawdź wysłane dane.';
                     }
                } else if (error.response.status === 401 || error.response.status === 403) {
                     // Should be authenticated to propose, but not necessarily staff/admin
                     errorMessage = 'Brak autoryzacji do wykonania tej operacji. Zaloguj się ponownie.';
                     if (errors.detail) errorMessage = errors.detail; // Use backend detail if available
                }

            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = 'Nie udało się połączyć z serwerem. Sprawdź swoje połączenie internetowe.';
            } else {
                // Something happened in setting up the request that triggered an Error
                errorMessage = `Wystąpił błąd aplikacji: ${error.message}`;
            }
            onError(errorMessage); // Pass the final error message back to parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-plant-form-container">
            <h3 className="add-plant-form-title">Zaproponuj Nową Roślinę do Globalnej Bazy</h3> {/* Updated Title */}
            <form onSubmit={handleSubmit} className="add-plant-form">
                 {/* Name Input */}
                 <div className="form-group">
                    <label htmlFor="name" className="form-label">Nazwa Rośliny*</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="form-input" required />
                </div>
                 {/* Species Input */}
                 <div className="form-group">
                    <label htmlFor="species" className="form-label">Gatunek</label>
                    <input type="text" id="species" name="species" value={formData.species} onChange={handleChange} className="form-input" />
                 </div>
                 {/* Water Amount Input */}
                <div className="form-group">
                    <label htmlFor="water_amount_ml" className="form-label">Ilość Wody (ml)*</label>
                    <input type="number" id="water_amount_ml" name="water_amount_ml" value={formData.water_amount_ml} onChange={handleChange} className="form-input" required min="1" step="1"/>
                </div>
                {/* Watering Frequency Input */}
                <div className="form-group">
                    <label htmlFor="watering_frequency_days" className="form-label">Częstotliwość Podlewania (dni)*</label>
                    <input type="number" id="watering_frequency_days" name="watering_frequency_days" value={formData.watering_frequency_days} onChange={handleChange} className="form-input" required min="1" step="1"/>
                </div>
                {/* Sunlight Select */}
                <div className="form-group">
                    <label htmlFor="sunlight" className="form-label">Nasłonecznienie</label>
                    <select id="sunlight" name="sunlight" value={formData.sunlight} onChange={handleChange} className="form-input">
                         {sunlightOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                {/* Soil Type Select */}
                <div className="form-group">
                    <label htmlFor="soil_type" className="form-label">Typ Gleby</label>
                    <select id="soil_type" name="soil_type" value={formData.soil_type} onChange={handleChange} className="form-input">
                        {soilTypeOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                 {/* Preferred Temperature Input */}
                 <div className="form-group">
                    <label htmlFor="preferred_temperature" className="form-label">Preferowana Temperatura (°C)</label>
                    <input type="number" id="preferred_temperature" name="preferred_temperature" value={formData.preferred_temperature} onChange={handleChange} className="form-input" step="any"/>
                </div>
                {/* Image Input */}
                <div className="form-group">
                    <label htmlFor="image-input" className="form-label">Zdjęcie Rośliny</label>
                    <input type="file" id="image-input" name="image" onChange={handleChange} className="form-input" accept="image/png, image/jpeg, image/gif" />
                </div>

                {/* Submit Button - Spans across grid columns in CSS */}
                <button type="submit" className="button" disabled={loading}>
                    {loading ? 'Wysyłanie...' : 'Zaproponuj Roślinę'} {/* Updated button text */}
                </button>
            </form>
        </div>
    );
};

export default AddPlantForm;