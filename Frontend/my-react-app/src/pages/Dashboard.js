// Frontend/my-react-app/src/pages/Dashboard.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserPlants, fetchAllPlants, addPlantToUserCollection, waterUserPlant } from '../services/api'; // Upewnij się, że importujesz waterUserPlant
import PlantTable from '../components/PlantTable';
import PlantCardGrid from '../components/PlantCardGrid';
import AvailablePlants from '../components/AvailablePlants';
import AddPlantForm from '../components/AddPlantForm';
import PlantDetailModal from '../components/PlantDetailModal';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const [userPlants, setUserPlants] = useState([]);
    const [availablePlants, setAvailablePlants] = useState(null);
    const [loadingUserPlants, setLoadingUserPlants] = useState(true);
    const [loadingAvailablePlants, setLoadingAvailablePlants] = useState(true);
    // --- Rozdzielone stany błędów ---
    const [userPlantError, setUserPlantError] = useState(null);
    const [collectionError, setCollectionError] = useState(null);
    const [formError, setFormError] = useState('');
    // --- Koniec rozdzielonych stanów błędów ---
    const [viewMode, setViewMode] = useState('card');
    const [selectedPlantForDetail, setSelectedPlantForDetail] = useState(null); // Może zawierać { plant, last_watered_at... } LUB { plant }
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const navigate = useNavigate();

    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        navigate('/');
    }, [navigate]);

    const fetchUserPlantsData = useCallback(async () => {
        setLoadingUserPlants(true);
        setUserPlantError(null); // Czyść błąd przed próbą
        try {
            const response = await fetchUserPlants();
            setUserPlants(response.data);
        } catch (err) {
            console.error('Błąd pobierania roślin użytkownika', err);
            setUserPlantError('Nie udało się pobrać Twoich roślin. Spróbuj ponownie później.'); // Ustaw odpowiedni błąd
            if (err.response && err.response.status === 401) {
                handleLogout();
            }
        } finally {
            setLoadingUserPlants(false);
        }
    }, [handleLogout]);

    const fetchAvailablePlantsData = useCallback(async () => {
        setLoadingAvailablePlants(true);
        setCollectionError(null); // Czyść błąd przed próbą
        try {
            const response = await fetchAllPlants();
            setAvailablePlants(response.data);
        } catch (err) {
            console.error('Błąd pobierania dostępnych roślin', err);
            setCollectionError('Nie udało się pobrać listy dostępnych roślin.'); // Ustaw odpowiedni błąd
        } finally {
            setLoadingAvailablePlants(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        // Czyść wszystkie błędy przy ładowaniu dashboardu
        setUserPlantError(null);
        setCollectionError(null);
        setFormError('');
        fetchUserPlantsData();
        fetchAvailablePlantsData();
    }, [navigate, fetchUserPlantsData, fetchAvailablePlantsData]); // Zależności są OK

    const handleWaterPlant = async (userPlantId) => {
        setUserPlantError(null); // Czyść błąd
        try {
            await waterUserPlant(userPlantId);
            fetchUserPlantsData();
            console.log('Roślina podlana!');
        } catch (err) {
            console.error('Błąd podczas podlewania rośliny', err);
            setUserPlantError('Nie udało się podlać rośliny.'); // Ustaw odpowiedni błąd
            if (err.response && err.response.status === 401) {
                handleLogout();
            }
        }
    };

    const handleAddToCollection = async (plantId) => {
        setCollectionError(null); // Czyść błąd
        try {
            await addPlantToUserCollection(plantId);
            console.log('Roślina dodana do Twojej kolekcji!');
            fetchUserPlantsData(); // Odśwież listę użytkownika
            // Opcjonalnie: odśwież listę dostępnych, jeśli chcesz zaktualizować przyciski 'disabled' natychmiast
            // fetchAvailablePlantsData();
        } catch (err) {
            console.error('Błąd dodawania rośliny do kolekcji', err.response?.data || err.message);
            let errMsg = 'Nie udało się dodać rośliny do kolekcji.';
             if (err.response?.data?.non_field_errors?.[0]?.includes('unique constraint')) {
                errMsg = 'Masz już tę roślinę w swojej kolekcji.';
            } else if (err.response?.status === 401) {
                handleLogout();
                return;
            }
            setCollectionError(errMsg); // Ustaw odpowiedni błąd
        }
    };

    const handlePlantDefinitionAdded = () => {
        console.log('Nowa roślina dodana do globalnej bazy danych!');
        setFormError('');
        setShowAddForm(false);
        fetchAvailablePlantsData();
    };

    // Handler dla szczegółów rośliny użytkownika (UserPlant)
    const handleShowUserPlantDetails = (userPlant) => {
        console.log("Pokazywanie szczegółów UserPlant:", userPlant); // Dodaj logowanie
        setSelectedPlantForDetail(userPlant); // Przekaż cały obiekt UserPlant
        setIsDetailModalOpen(true);
    };

    // NOWY Handler dla szczegółów dostępnej rośliny (Plant)
    const handleShowAvailablePlantDetails = (plant) => {
        console.log("Pokazywanie szczegółów dostępnej rośliny:", plant); // Dodaj logowanie
        setSelectedPlantForDetail({ plant: plant }); // Przekaż obiekt w strukturze { plant: Plant }
        setIsDetailModalOpen(true);
    };

    const handleCloseDetails = () => {
        setIsDetailModalOpen(false);
        setSelectedPlantForDetail(null);
    };

    const userOwnedPlantIds = userPlants.map(up => up.plant.id);
    const isLoading = loadingUserPlants || loadingAvailablePlants;

    return (
        <div className="dashboard-container">

            {/* --- User's Plants Section --- */}
            <div className="dashboard-section user-plants-section">
                 <div className="dashboard-header">
                    <h2>Twoje rośliny</h2>
                    <div className="view-toggle-buttons">
                       {/* Przyciski widoku bez zmian */}
                        <button onClick={() => setViewMode('card')} className={`button view-button ${viewMode === 'card' ? 'active' : ''}`} disabled={loadingUserPlants}>Widok Kart</button>
                        <button onClick={() => setViewMode('table')} className={`button view-button ${viewMode === 'table' ? 'active' : ''}`} disabled={loadingUserPlants}>Widok Tabeli</button>
                    </div>
                </div>
                {/* Wyświetlaj błąd TYLKO dla tej sekcji */}
                {userPlantError && <div className="error-message">{userPlantError}</div>}
                {loadingUserPlants && <div className="loading">Ładowanie Twoich roślin...</div>}
                {/* Reszta logiki wyświetlania roślin użytkownika bez zmian */}
                {!loadingUserPlants && !userPlantError && userPlants.length === 0 && (
                    <p>Nie masz jeszcze żadnych roślin w swojej kolekcji.</p>
                )}
                {!loadingUserPlants && userPlants.length > 0 && (
                     <div className="plants-display-section">
                        {viewMode === 'card' ? (
                            <PlantCardGrid
                                plants={userPlants}
                                onWater={handleWaterPlant}
                                onShowDetails={handleShowUserPlantDetails} // Użyj handlera dla UserPlant
                            />
                        ) : (
                            <PlantTable
                                plants={userPlants}
                                onWater={handleWaterPlant}
                                onShowDetails={handleShowUserPlantDetails} // Użyj handlera dla UserPlant
                            />
                        )}
                    </div>
                )}
            </div>

            {/* --- Available Plants & Add New Plant Section --- */}
            <div className="dashboard-section available-plants-add-section">
                <h2 className="section-title">Przeglądaj i Dodawaj Rośliny</h2>
                {/* Wyświetlaj błąd TYLKO dla tej sekcji */}
                 {collectionError && <div className="error-message">{collectionError}</div>}
                 {loadingAvailablePlants && <div className="loading">Ładowanie dostępnych roślin...</div>}

                {/* Lista dostępnych roślin */}
                 {!loadingAvailablePlants && availablePlants && (
                    <AvailablePlants
                        plants={availablePlants}
                        onAddToCollection={handleAddToCollection}
                        userPlantIds={userOwnedPlantIds}
                        onShowDetails={handleShowAvailablePlantDetails} // Przekaż NOWY handler
                    />
                 )}
                 {!loadingAvailablePlants && !availablePlants && !collectionError && (
                    <p>Nie udało się załadować dostępnych roślin.</p>
                 )}
                 <hr className="section-separator" />
                 {/* Przycisk przełączania formularza bez zmian */}
                 <div className="toggle-form-section">
                    <button onClick={() => setShowAddForm(!showAddForm)} className="button button-secondary toggle-add-form-button" disabled={isLoading}>
                       {showAddForm ? 'Ukryj Formularz Dodawania' : 'Dodaj Nową Roślinę do Bazy'}
                    </button>
                 </div>
                 {/* Formularz dodawania bez zmian */}
                 {showAddForm && (
                     <div className="add-plant-form-wrapper">
                        {/* Wyświetlaj błąd TYLKO dla formularza */}
                        {formError && <div className="error-message">{formError}</div>}
                        <AddPlantForm
                            onPlantAdded={handlePlantDefinitionAdded}
                            onError={setFormError} // Użyj setFormError
                        />
                     </div>
                 )}
            </div>

            {/* --- Plant Detail Modal --- */}
            {/* Renderowanie modalu bez zmian, ale dostanie teraz różne struktury w selectedPlantForDetail */}
            {isDetailModalOpen && selectedPlantForDetail && (
                <PlantDetailModal
                    // Kluczowe: Przekazujemy obiekt, który ZAWSZE ma klucz 'plant'
                    // a opcjonalnie ma resztę pól UserPlant
                    plantData={selectedPlantForDetail}
                    onClose={handleCloseDetails}
                />
            )}
        </div>
    );
};

export default Dashboard;