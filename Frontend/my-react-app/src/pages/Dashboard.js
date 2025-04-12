// Frontend/my-react-app/src/pages/Dashboard.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PlantTable from '../components/PlantTable';
import PlantCardGrid from '../components/PlantCardGrid';
import AvailablePlants from '../components/AvailablePlants';
import AddPlantForm from '../components/AddPlantForm';
import PlantDetailModal from '../components/PlantDetailModal';
// --- FIX: Import the 'api' instance itself along with the functions ---
import api, {
    fetchUserPlants,
    fetchAllPlants,
    addPlantToUserCollection,
    waterUserPlant,
    deleteUserPlant,
} from '../services/api'; // Correct import path
import '../styles/Dashboard.css';

const Dashboard = () => {
    const [userPlants, setUserPlants] = useState([]);
    const [availablePlants, setAvailablePlants] = useState(null); // Keep null initially
    const [loadingUserPlants, setLoadingUserPlants] = useState(true);
    const [loadingAvailablePlants, setLoadingAvailablePlants] = useState(true);

    // --- Separate Error States ---
    const [userPlantsError, setUserPlantsError] = useState(''); // Error for user's plants section
    const [availablePlantsError, setAvailablePlantsError] = useState(''); // Error for available plants list / adding to collection
    const [addFormError, setAddFormError] = useState(''); // Error specifically for the AddPlantForm

    const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
    const [selectedPlantForDetail, setSelectedPlantForDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false); // Toggle for AddPlantForm visibility
    const navigate = useNavigate();

    // --- Logout Function ---
    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        // --- FIX: Now 'api' is defined due to the import ---
        if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
             delete api.defaults.headers.common['Authorization']; // Clear default header
        }
        navigate('/'); // Redirect to home or login
    }, [navigate]); // navigate is the dependency

    // --- Data Fetching Functions ---
    const fetchUserPlantsData = useCallback(async () => {
        setLoadingUserPlants(true);
        setUserPlantsError(''); // Clear previous error
        try {
            const response = await fetchUserPlants();
            setUserPlants(response.data || []); // Ensure it's always an array
        } catch (err) {
            console.error('Błąd pobierania roślin użytkownika:', err.response?.data || err.message);
            setUserPlantsError('Nie udało się pobrać Twoich roślin. Spróbuj odświeżyć stronę.');
            if (err.response?.status === 401) { // Check specific status code
                handleLogout(); // Logout on authentication failure
            }
        } finally {
            setLoadingUserPlants(false);
        }
    }, [handleLogout]); // Dependency on handleLogout

    const fetchAvailablePlantsData = useCallback(async () => {
        setLoadingAvailablePlants(true);
        setAvailablePlantsError(''); // Clear previous error
        try {
            const response = await fetchAllPlants();
            setAvailablePlants(response.data || []); // Ensure it's always an array
        } catch (err) {
            console.error('Błąd pobierania dostępnych roślin:', err.response?.data || err.message);
            setAvailablePlantsError('Nie udało się pobrać listy dostępnych roślin.');
             if (err.response?.status === 401) {
                // If fetching available plants fails due to auth, logout too
                 handleLogout();
             }
        } finally {
            setLoadingAvailablePlants(false);
        }
    }, [handleLogout]); // Dependency on handleLogout

    // --- Initial Data Load Effect ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return; // Stop execution if no token
        }
        // Reset errors on load
        setUserPlantsError('');
        setAvailablePlantsError('');
        setAddFormError('');

        fetchUserPlantsData();
        fetchAvailablePlantsData();
        // Run only once on mount, dependencies ensure fetch functions are stable
    }, [navigate, fetchUserPlantsData, fetchAvailablePlantsData]);

    // --- Action Handlers ---
    const handleWaterPlant = async (userPlantId) => {
        setUserPlantsError(''); // Clear error before action
        const originalPlants = [...userPlants]; // Store original state for potential rollback
        // Optimistic UI update (optional, makes it feel faster)
        setUserPlants(prevPlants => prevPlants.map(p =>
            p.id === userPlantId ? { ...p, next_watering_date: 'Podlewanie...' } : p // Indicate loading state
        ));

        try {
            await waterUserPlant(userPlantId);
            fetchUserPlantsData(); // Refresh data from server to get accurate next watering date
        } catch (err) {
            console.error('Błąd podczas podlewania rośliny:', err.response?.data || err.message);
            setUserPlantsError('Nie udało się podlać rośliny. Spróbuj ponownie.');
            setUserPlants(originalPlants); // Rollback optimistic update on error
            if (err.response?.status === 401) {
                handleLogout();
            }
        }
    };

    const handleAddToCollection = async (plantId) => {
        setAvailablePlantsError(''); // Clear error before action
        try {
            await addPlantToUserCollection(plantId);
            fetchUserPlantsData(); // Refresh user's plants list
        } catch (err) {
            console.error('Błąd dodawania rośliny do kolekcji:', err.response?.data || err.message);
            let errMsg = 'Nie udało się dodać rośliny do kolekcji.';
            if (err.response?.data?.non_field_errors?.[0]?.includes('unique constraint')) {
                errMsg = 'Masz już tę roślinę w swojej kolekcji.';
            } else if (err.response?.data?.plant_id?.[0]?.includes('Invalid pk')) {
                errMsg = 'Wybrana roślina nie istnieje w bazie danych.';
            } else if (err.response?.status === 401) {
                 handleLogout();
                 return;
            } else if (err.response?.status === 400) {
                 errMsg = 'Błąd zapytania podczas dodawania rośliny.'
            }
            setAvailablePlantsError(errMsg);
        }
    };

     const handleDeletePlant = async (userPlantId) => {
        // Confirmation moved to PlantTable/PlantCard component for direct interaction
        setUserPlantsError(''); // Clear error
        const originalPlants = [...userPlants];

        // Optimistic UI update: remove immediately
        setUserPlants(prevPlants => prevPlants.filter(p => p.id !== userPlantId));

        try {
            await deleteUserPlant(userPlantId);
        } catch (err) {
            console.error('Błąd podczas usuwania rośliny:', err.response?.data || err.message);
            setUserPlantsError('Nie udało się usunąć rośliny.');
            setUserPlants(originalPlants); // Rollback on error
            if (err.response?.status === 401) {
                handleLogout();
            }
        }
    };


    const handlePlantDefinitionAdded = () => {
        setAddFormError(''); // Clear form-specific error
        setShowAddForm(false); // Hide form on success
        fetchAvailablePlantsData(); // Refresh the list of available plants
    };

    // --- Detail Modal Handlers ---
    const handleShowUserPlantDetails = (userPlant) => {
        setSelectedPlantForDetail(userPlant);
        setIsDetailModalOpen(true);
    };

    const handleShowAvailablePlantDetails = (plantDefinition) => {
        setSelectedPlantForDetail({ plant: plantDefinition });
        setIsDetailModalOpen(true);
    };

    const handleCloseDetails = () => {
        setIsDetailModalOpen(false);
        setSelectedPlantForDetail(null);
    };

    // --- Derived State ---
    const userOwnedPlantIds = React.useMemo(() => new Set(userPlants.map(up => up.plant.id)), [userPlants]);
    const isLoading = loadingUserPlants || loadingAvailablePlants;


    // --- Render Logic ---
    return (
        <div className="dashboard-container">

            {/* --- User's Plants Section --- */}
            <div className="dashboard-section user-plants-section">
                 <div className="dashboard-header">
                    <h2>Twoje rośliny ({userPlants.length})</h2>
                    {!loadingUserPlants && userPlants.length > 0 && (
                        <div className="view-toggle-buttons">
                            <button
                                onClick={() => setViewMode('card')}
                                className={`button view-button ${viewMode === 'card' ? 'active' : ''}`}
                                disabled={loadingUserPlants}
                            >
                                Karty
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`button view-button ${viewMode === 'table' ? 'active' : ''}`}
                                disabled={loadingUserPlants}
                            >
                                Tabela
                            </button>
                        </div>
                    )}
                </div>

                {userPlantsError && <div className="error-message">{userPlantsError}</div>}
                {loadingUserPlants && <div className="loading">Ładowanie Twoich roślin...</div>}

                {!loadingUserPlants && !userPlantsError && userPlants.length === 0 && (
                    <p style={{ textAlign: 'center', margin: '20px 0' }}>Nie masz jeszcze żadnych roślin w swojej kolekcji. Dodaj je z listy poniżej!</p>
                )}
                {!loadingUserPlants && userPlants.length > 0 && (
                     <div className="plants-display-section" style={{ marginTop: '20px' }}>
                        {viewMode === 'card' ? (
                            <PlantCardGrid
                                plants={userPlants}
                                onWater={handleWaterPlant}
                                onShowDetails={handleShowUserPlantDetails}
                                onDelete={handleDeletePlant}
                            />
                        ) : (
                            <PlantTable
                                plants={userPlants}
                                onWater={handleWaterPlant}
                                onShowDetails={handleShowUserPlantDetails}
                                onDelete={handleDeletePlant}
                            />
                        )}
                    </div>
                )}
            </div> {/* End User's Plants Section */}


            {/* --- Available Plants & Add New Plant Section --- */}
            <div className="dashboard-section available-plants-add-section">
                <h2 className="section-title">Dostępne Rośliny / Dodaj Nową do Bazy</h2>

                 {availablePlantsError && <div className="error-message">{availablePlantsError}</div>}
                 {loadingAvailablePlants && <div className="loading">Ładowanie dostępnych roślin...</div>}

                 {!loadingAvailablePlants && availablePlants !== null && (
                     <AvailablePlants
                        plants={availablePlants}
                        onAddToCollection={handleAddToCollection}
                        userPlantIds={userOwnedPlantIds}
                        onShowDetails={handleShowAvailablePlantDetails}
                    />
                 )}
                 {!loadingAvailablePlants && availablePlants === null && !availablePlantsError && (
                    <p>Nie udało się załadować dostępnych roślin.</p>
                 )}

                 <hr className="section-separator" />
                 <div className="toggle-form-section">
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="button button-secondary toggle-add-form-button"
                        disabled={isLoading}
                    >
                       {showAddForm ? 'Ukryj Formularz Dodawania Rośliny do Bazy' : 'Dodaj Nową Roślinę do Bazy'}
                    </button>
                 </div>

                 {showAddForm && (
                     <div className="add-plant-form-wrapper">
                        {addFormError && <div className="error-message">{addFormError}</div>}
                        <AddPlantForm
                            onPlantAdded={handlePlantDefinitionAdded}
                            onError={setAddFormError}
                        />
                     </div>
                 )}
            </div> {/* End Available Plants & Add New Plant Section */}


            {/* --- Plant Detail Modal --- */}
            {isDetailModalOpen && selectedPlantForDetail && (
                <PlantDetailModal
                    plantData={selectedPlantForDetail}
                    onClose={handleCloseDetails}
                />
            )}

        </div> // End Dashboard Container
    );
};

export default Dashboard;