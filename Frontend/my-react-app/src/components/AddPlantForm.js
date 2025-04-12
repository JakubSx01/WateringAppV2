// Frontend/my-react-app/src/components/AddPlantForm.js
import React, { useState } from 'react';
import { addNewPlantDefinition } from '../services/api'; // Correct import path
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
        onError(''); // Clear previous errors

        // Basic frontend validation (can be more sophisticated)
        if (!formData.name || !formData.water_amount_ml || !formData.watering_frequency_days) {
            onError('Pola: Nazwa, Ilość Wody (ml) i Częstotliwość Podlewania (dni) są wymagane.');
            setLoading(false);
            return;
        }
         // Validate numeric fields are positive
        if (Number(formData.water_amount_ml) <= 0 || Number(formData.watering_frequency_days) <= 0) {
             onError('Ilość wody i częstotliwość podlewania muszą być większe od zera.');
             setLoading(false);
             return;
        }
        if (formData.preferred_temperature && isNaN(Number(formData.preferred_temperature))) {
             onError('Preferowana temperatura musi być liczbą.');
             setLoading(false);
             return;
        }


        const dataToSend = new FormData();

        // Append required fields
        dataToSend.append('name', formData.name.trim()); // Trim whitespace
        dataToSend.append('water_amount_ml', Number(formData.water_amount_ml));
        dataToSend.append('watering_frequency_days', Number(formData.watering_frequency_days));

        // Append optional fields only if they have a non-empty value
        if (formData.species && formData.species.trim()) {
            dataToSend.append('species', formData.species.trim());
        }
        if (formData.sunlight) {
            dataToSend.append('sunlight', formData.sunlight);
        }
        if (formData.soil_type) {
            dataToSend.append('soil_type', formData.soil_type);
        }
        // Append optional number only if it's a valid number
        if (formData.preferred_temperature && !isNaN(Number(formData.preferred_temperature))) {
            dataToSend.append('preferred_temperature', Number(formData.preferred_temperature));
        }
        if (formData.image) {
            dataToSend.append('image', formData.image);
        }

        // Debug: Log FormData contents
        console.log("Wysyłanie danych FormData do /api/plants/:");
        for (let [key, value] of dataToSend.entries()) {
             // For File objects, log the name and type
             if (value instanceof File) {
                 console.log(`${key}: File(name=${value.name}, size=${value.size}, type=${value.type})`);
             } else {
                 console.log(`${key}: ${value} (Type: ${typeof value})`);
             }
         }


        try {
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
            onPlantAdded(); // Callback on success
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
                    // Join messages, limit length if necessary
                    errorMessage = `Błąd walidacji: ${detailedMessages.join('; ')}`;
                } else if (error.response.status >= 500) {
                     errorMessage = 'Wystąpił błąd serwera. Spróbuj ponownie później.';
                }
                 // Consider specific status codes
                else if (error.response.status === 400) {
                     errorMessage = 'Nieprawidłowe zapytanie. Sprawdź wysłane dane.';
                } else if (error.response.status === 401 || error.response.status === 403) {
                     errorMessage = 'Brak autoryzacji do wykonania tej operacji.';
                }

            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = 'Nie udało się połączyć z serwerem. Sprawdź swoje połączenie internetowe.';
            } else {
                // Something happened in setting up the request that triggered an Error
                errorMessage = `Wystąpił błąd aplikacji: ${error.message}`;
            }
            onError(errorMessage); // Pass the final error message back
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-plant-form-container">
            <h3 className="add-plant-form-title">Dodaj Nową Roślinę do Bazy Danych</h3>
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
                    {loading ? 'Dodawanie...' : 'Dodaj Roślinę do Bazy'}
                </button>
            </form>
        </div>
    );
};

export default AddPlantForm;