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
    fetchUserPlants, // User's plants (standard endpoint)
    fetchAllPlants, // All APPROVED plants (standard endpoint)
    addNewPlantDefinition, // Used by users to PROPOSE a new plant (calls standard endpoint POST /plants/)
    addPlantToUserCollection, // Add APPROVED plant to user's collection (standard endpoint)
    waterUserPlant, // Water user's plant (standard endpoint)
    deleteUserPlant, // Delete user's plant (standard endpoint)
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
    }, [navigate]);

    // --- Data Fetching Functions ---
    const fetchUserPlantsData = useCallback(async () => {
        setLoadingUserPlants(true);
        setUserPlantsError(''); // Clear previous error
        try {
            const response = await fetchUserPlants(); // Calls /api/user-plants/
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
    }, [handleLogout]);

    const fetchAvailablePlantsData = useCallback(async () => {
        setLoadingAvailablePlants(true);
        setAvailablePlantsError(''); // Clear previous error
        try {
            const response = await fetchAllPlants(); // Calls /api/plants/ (which filters by APPROVED)
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
    }, [handleLogout]);

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
        // Find the plant and update its display state
         setUserPlants(prevPlants => prevPlants.map(p =>
             p.id === userPlantId ? { ...p, next_watering_date: 'Podlewanie...' } : p // Indicate loading state
         ));


        try {
            // Use the standard user water endpoint
            await waterUserPlant(userPlantId); // Calls /api/user-plants/{id}/water/
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
            // Use the standard user add endpoint
            await addPlantToUserCollection(plantId); // Calls /api/user-plants/
            fetchUserPlantsData(); // Refresh user's plants list
        } catch (err) {
            console.error('Błąd dodawania rośliny do kolekcji:', err.response?.data || err.message);
            let errMsg = 'Nie udało się dodać rośliny do kolekcji.';
            // Handle specific backend errors
            if (err.response?.data?.plant_id?.[0]?.includes('Możesz dodać do swojej kolekcji tylko zatwierdzone')) { // Specific message from backend
                 errMsg = 'Możesz dodać do swojej kolekcji tylko zatwierdzone rośliny.';
            } else if (err.response?.data?.non_field_errors?.[0]?.includes('unique constraint')) { // Check for unique constraint error message if unique_together was active
                 errMsg = 'Masz już tę roślinę w swojej kolekcji.'; // This message might not occur if unique_together is removed
            } else if (err.response?.data?.plant_id?.[0]?.includes('Invalid pk')) {
                errMsg = 'Wybrana definicja rośliny nie istnieje w bazie danych.';
            } else if (err.response?.status === 401) {
                 handleLogout();
                 return;
            } else if (err.response?.status === 400) {
                 // Generic bad request, try to use backend message if available
                  if (err.response?.data && typeof err.response.data === 'object') {
                       const detailedErrors = Object.values(err.response.data).flat().join(' ');
                       if (detailedErrors) errMsg = `Błąd zapytania: ${detailedErrors}`;
                  } else if (typeof err.response.data === 'string') {
                       errMsg = `Błąd zapytania: ${err.response.data}`;
                  } else {
                       errMsg = 'Nieprawidłowe zapytanie podczas dodawania rośliny.'
                  }
            } else if (err.response?.data?.detail) { // Other API detail errors
                errMsg = err.response.data.detail;
            }
            setAvailablePlantsError(errMsg); // Use available plants error state
        }
    };

     const handleDeletePlant = async (userPlantId) => {
        // Confirmation moved to PlantTable/PlantCard component for direct interaction
        setUserPlantsError(''); // Clear error
        const originalPlants = [...userPlants]; // Store original for rollback

        // Optimistic UI update: remove immediately
        setUserPlants(prevPlants => prevPlants.filter(p => p.id !== userPlantId));

        try {
            // Use the standard user delete endpoint
            await deleteUserPlant(userPlantId); // Calls /api/user-plants/{id}/
            // No need to refetch on success, optimistic update is enough unless backend failed silently.
        } catch (err) {
            console.error('Błąd podczas usuwania rośliny:', err.response?.data || err.message);
            let errMsg = 'Nie udało się usunąć rośliny z kolekcji.';
            if (err.response?.data?.detail) errMsg = err.response.data.detail;
            setUserPlantsError(errMsg); // Use user plants error state
            setUserPlants(originalPlants); // Rollback on error
            if (err.response?.status === 401) {
                handleLogout();
            }
        }
    };


    const handlePlantDefinitionAdded = () => {
        setAddFormError(''); // Clear form-specific error
        setShowAddForm(false); // Hide form on success
        fetchAvailablePlantsData(); // Refresh the list of available plants (which are APPROVED)
        // The newly added plant will be PENDING, so it won't appear in the AvailablePlants list
        // until a moderator/admin approves it.
        alert("Propozycja nowej rośliny została wysłana do moderacji. Pojawi się na liście dostępnych roślin po jej zatwierdzeniu.");
    };

    // --- Detail Modal Handlers ---
    const handleShowUserPlantDetails = (userPlant) => {
        // userPlant object already contains user-specific data (last_watered_at, next_watering_date)
        setSelectedPlantForDetail(userPlant);
        setIsDetailModalOpen(true);
    };

    const handleShowAvailablePlantDetails = (plantDefinition) => {
        // plantDefinition object from the AvailablePlants list doesn't have user-specific dates.
        // We pass it in a format the modal expects, potentially adding null/undefined for user dates.
        setSelectedPlantForDetail({ plant: plantDefinition, last_watered_at: null, next_watering_date: null });
        setIsDetailModalOpen(true);
    };

    const handleCloseDetails = () => {
        setIsDetailModalOpen(false);
        setSelectedPlantForDetail(null);
    };

    // --- Derived State ---
    // Use the plant.id for checking if a plant definition is already in the user's collection.
    // If unique_together is removed, a user can have multiple instances of the same plant definition.
    // The "Add" button should probably check if *any* instance of that plant definition exists,
    // or allow adding multiple copies. The current UI disables "Add" if `userOwnedPlantIds.has(plant.id)`.
    // Let's keep this behavior for now, disabling "Add" if at least one instance exists.
    const userOwnedPlantIds = React.useMemo(() => new Set(userPlants.map(up => up.plant.id)), [userPlants]);
    const isLoading = loadingUserPlants || loadingAvailablePlants;


    // --- Render Logic ---
    // Authentication check is handled by the route in App.js.
    // This component assumes the user is authenticated.
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
                                onShowDetails={handleShowUserPlantDetails} // Pass handler
                                onDelete={handleDeletePlant} // Pass handler
                            />
                        ) : (
                            <PlantTable
                                plants={userPlants}
                                onWater={handleWaterPlant}
                                onShowDetails={handleShowUserPlantDetails} // Pass handler
                                onDelete={handleDeletePlant} // Pass handler
                            />
                        )}
                    </div>
                )}
            </div> {/* End User's Plants Section */}


            {/* --- Available Plants & Add New Plant Section --- */}
            <div className="dashboard-section available-plants-add-section">
                <h2 className="section-title">Dostępne Rośliny / Zaproponuj Nową do Bazy</h2> {/* Updated Title */}

                 {availablePlantsError && <div className="error-message">{availablePlantsError}</div>}
                 {loadingAvailablePlants && <div className="loading">Ładowanie dostępnych roślin...</div>}

                 {/* Render AvailablePlants list only if data is loaded */}
                 {!loadingAvailablePlants && availablePlants !== null && (
                     <AvailablePlants
                        plants={availablePlants} // Only APPROVED plants from fetchAllPlants
                        onAddToCollection={handleAddToCollection}
                        userPlantIds={userOwnedPlantIds} // Used to disable 'Add' button if plant is already owned
                        onShowDetails={handleShowAvailablePlantDetails} // Pass handler
                    />
                 )}
                 {/* Handle case where loading is done but data is null/error */}
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
                       {showAddForm ? 'Ukryj Formularz Proponowania Rośliny' : 'Zaproponuj Nową Roślinę do Bazy'} {/* Updated button text */}
                    </button>
                 </div>

                 {/* Show AddPlantForm if toggled */}
                 {showAddForm && (
                     <div className="add-plant-form-wrapper">
                        {/* Add form-specific error display here */}
                        {addFormError && <div className="error-message">{addFormError}</div>}
                        <AddPlantForm
                            onPlantAdded={handlePlantDefinitionAdded} // Callback on successful form submission
                            onError={setAddFormError} // Pass handler for form-specific errors
                        />
                     </div>
                 )}
            </div> {/* End Available Plants & Add New Plant Section */}


            {/* --- Plant Detail Modal --- */}
            {/* Show modal only if it's open and plant data is selected */}
            {isDetailModalOpen && selectedPlantForDetail && (
                <PlantDetailModal
                    plantData={selectedPlantForDetail} // Can be UserPlant or Plant definition object
                    onClose={handleCloseDetails} // Handler to close modal
                />
            )}


        </div> // End Dashboard Container
    );
};

export default Dashboard;