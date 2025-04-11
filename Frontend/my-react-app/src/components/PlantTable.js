import React from 'react';
import '../styles/PlantTable.css'; // Utworzymy ten plik CSS później

// Prosta funkcja do formatowania daty
const formatDate = (dateString) => {
  if (!dateString) return 'Brak danych';
  try {
    const date = new Date(dateString);
    // Sprawdź, czy data jest poprawna
    if (isNaN(date.getTime())) {
        return 'Nieprawidłowa data';
    }
    // Użyj toLocaleDateString dla lokalnego formatu daty
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Błąd daty';
  }
};

// Funkcja do budowania URL obrazka
const getImageUrl = (imageUrlFromApi) => {
    if (!imageUrlFromApi) {
        // Zwróć ścieżkę do placeholdera w folderze /public
        return '/placeholder-plant.png';
    }
    // API zwraca już pełny, poprawny URL, więc po prostu go zwracamy
    return imageUrlFromApi;
};

const PlantTable = ({ plants, onWater }) => {
  if (!plants || plants.length === 0) {
    return <p>Nie masz jeszcze żadnych roślin.</p>;
  }

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
            <tr key={userPlant.id}>
              <td>
                <img
                  src={getImageUrl(userPlant.plant.image)}
                  alt={userPlant.plant.name}
                  className="plant-table-image"
                  onError={(e) => { e.target.onerror = null; e.target.src='/placeholder-plant.png'; }} // Fallback w razie błędu ładowania
                />
              </td>
              <td>{userPlant.plant.name}</td>
              <td>{userPlant.plant.water_amount_ml} ml</td>
              <td>{formatDate(userPlant.last_watered_at)}</td>
              <td>{formatDate(userPlant.next_watering_date)}</td>
              <td>
                <button onClick={() => onWater(userPlant.id)} className="button water-button-table">
                  Podlej
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlantTable;