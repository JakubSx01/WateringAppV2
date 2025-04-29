// Frontend/my-react-app/src/pages/AdminPanel.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// ... (import other API functions) ...
import {
    fetchAllUsers,
    createNewUser,
    updateUserDetails,
    deleteUser,
    setUserPassword,
    fetchAllPlantDefinitions,
    updatePlantDefinition,
    deletePlantDefinition,
    fetchAllUserPlants, // Updated to accept userId
    deleteAnyUserPlant
} from '../services/api'; // Ensure correct imports from api.js
import '../styles/Dashboard.css';
import '../styles/AdminPanel.css';
import { formatDate } from '../utils/dateUtils';
import { getImageUrl } from '../utils/imageUtils';

const AdminPanel = ({ currentUser }) => {
    // --- All State and Hook calls must be at the top level, unconditionally ---
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [userListError, setUserListError] = useState('');

    const [allPlants, setAllPlants] = useState([]);
    const [loadingPlants, setLoadingPlants] = useState(true);
    const [plantError, setPlantError] = useState('');

    const [userPlants, setUserPlants] = useState([]);
    const [loadingUserPlants, setLoadingUserPlants] = useState(false);
    const [userPlantsError, setUserPlantsError] = useState('');

    const [generalError, setGeneralError] = useState(''); // Use a single state for general errors

    const navigate = useNavigate();
    // --- End State and Hook calls ---

    // --- Authentication/Role check logic moved into useEffect or handled in render ---

    // Memoized functions remain here
    const fetchUserData = useCallback(async () => {
        // ... (same as before) ...
         setLoadingUsers(true);
         setUserListError('');
         try {
             const response = await fetchAllUsers();
             setUsers(response.data);
         } catch (err) {
             console.error('Error fetching users:', err.response?.data || err.message);
             setUserListError('Nie udało się załadować listy użytkowników.');
              // Do NOT redirect here in useCallback. Let useEffect handle it.
              // if (err.response?.status === 401 || err.response?.status === 403) {
              //    // navigate('/login'); // <-- Remove redirect from here
              // }
         } finally {
             setLoadingUsers(false);
         }
    }, []); // Dependencies: empty if these functions should not recreate

    const fetchPlantDefinitionData = useCallback(async () => {
        // ... (same as before) ...
        setLoadingPlants(true);
        setPlantError('');
        try {
            const response = await fetchAllPlantDefinitions();
            setAllPlants(response.data);
        } catch (err) {
            console.error('Error fetching all plant definitions:', err.response?.data || err.message);
            setPlantError('Nie udało się załadować listy definicji roślin.');
             // Do NOT redirect here
             // if (err.response?.status === 401 || err.response?.status === 403) {
             //     // navigate('/login'); // <-- Remove redirect from here
             // }
        } finally {
            setLoadingPlants(false);
        }
    }, []); // Dependencies: empty

    const fetchUserPlantsForSelectedUser = useCallback(async (userId) => {
        // ... (same as before) ...
        setLoadingUserPlants(true);
        setUserPlantsError('');
        setUserPlants([]);
        try {
            const response = await fetchAllUserPlants(userId);
            setUserPlants(response.data);
        } catch (err) {
            console.error(`Error fetching plants for user ${userId}:`, err.response?.data || err.message);
            setUserPlantsError(`Nie udało się załadować roślin dla wybranego użytkownika.`);
            // Do NOT redirect here
            // if (err.response?.status === 401 || err.response?.status === 403) {
            //     // navigate('/login'); // <-- Remove redirect from here
            // }
        } finally {
            setLoadingUserPlants(false);
        }
    }, []); // Dependencies: empty


    // --- useEffect to handle initial data fetch AND authentication check ---
    useEffect(() => {
        // Check authentication and role here. If not met, navigate away.
        // This runs after the component renders (with hooks) and when currentUser changes.
        if (!currentUser || !currentUser.is_superuser) {
             console.log("AdminPanel useEffect: User not admin, navigating away."); // Debug log
             // Give React a moment to render the loading/denied state if needed
             const timer = setTimeout(() => {
                  navigate('/'); // Redirect if not superuser
             }, 0); // Use setTimeout to avoid potential render loop issues

             return () => clearTimeout(timer); // Cleanup timer

        } else {
            // If user IS authenticated and IS admin, fetch data
            console.log("AdminPanel useEffect: User is admin, fetching data."); // Debug log
            fetchUserData();
            fetchPlantDefinitionData();
            // Note: fetchUserPlantsForSelectedUser is called by the other useEffect when selectedUserId changes
        }

        // Cleanup function (optional) - might be useful if component unmounts
        return () => {
            // Any cleanup like cancelling API requests if needed
        };

    }, [currentUser, navigate, fetchUserData, fetchPlantDefinitionData]); // Dependencies: Run when currentUser or fetch functions change


    // useEffect to handle fetching user plants when selectedUserId changes
     useEffect(() => {
        if (selectedUserId !== null && currentUser?.is_superuser) { // Only fetch if user is admin and user is selected
             console.log(`AdminPanel useEffect: Selected user ID changed to ${selectedUserId}, fetching plants.`); // Debug log
             fetchUserPlantsForSelectedUser(selectedUserId);
        } else {
             console.log("AdminPanel useEffect: selectedUserId is null, clearing user plants."); // Debug log
             setUserPlants([]);
             setUserPlantsError('');
        }
     }, [selectedUserId, currentUser, fetchUserPlantsForSelectedUser]); // Dependencies


    // --- Action Handlers remain the same, but use setGeneralError if applicable ---
    const handleCreateUser = async (userData) => {
        setGeneralError(''); // Clear previous errors
        // ... (rest of handler, use setGeneralError on catch) ...
        try {
            await createNewUser(userData);
            fetchUserData();
            alert('Użytkownik utworzony!');
        } catch (err) {
            console.error('Error creating user:', err.response?.data || err.message);
            setGeneralError('Nie udało się utworzyć użytkownika. Sprawdź dane.');
        }
    };

    const handleDeleteUser = async (userId) => {
         if (window.confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
             setGeneralError('');
             setLoadingUsers(true);
             try {
                 await deleteUser(userId);
                 fetchUserData();
                 if (selectedUserId === userId) {
                     setSelectedUserId(null);
                 }
             } catch (err) {
                 console.error('Error deleting user:', err.response?.data || err.message);
                 let errMsg = 'Nie udało się usunąć użytkownika.';
                  if (err.response?.data?.detail) errMsg = err.response.data.detail;
                 setGeneralError(errMsg);
             } finally {
                  setLoadingUsers(false);
             }
         }
    };

    const handleSetUserPassword = async (userId, passwordData) => {
         setGeneralError('');
         try {
             await setUserPassword(userId, passwordData);
             alert('Hasło zmienione pomyślnie!');
         } catch (err) {
             console.error('Error setting password:', err.response?.data || err.message);
             let errMsg = 'Nie udało się zmienić hasła.';
              if (err.response?.data) {
                 if (err.response.data.confirm_password) errMsg = `Potwierdzenie hasła: ${err.response.data.confirm_password[0]}`;
                 else if (err.response.data.new_password) errMsg = `Nowe hasło: ${err.response.data.new_password[0]}`;
                 else if (err.response.data.detail) errMsg = err.response.data.detail;
              } else if (err.message) {
                 errMsg = `Błąd: ${err.message}`;
              }
             setGeneralError(errMsg);
         }
    };


    const handleUpdatePlantDefinition = async (plantId, plantData) => {
         setPlantError('');
         setLoadingPlants(true);
         try {
             await updatePlantDefinition(plantId, plantData);
             fetchPlantDefinitionData();
         } catch (err) {
             console.error('Error updating plant definition:', err.response?.data || err.message);
             let errMsg = 'Nie udało się zaktualizować definicji rośliny.';
              if (err.response?.data) {
                 const errors = err.response.data;
                 const detailed = Object.entries(errors).map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`).join('; ');
                 errMsg = `Błąd walidacji: ${detailed}`;
             } else if (err.message) {
                 errMsg = `Błąd: ${err.message}`;
             }
             setPlantError(errMsg);
         } finally {
             setLoadingPlants(false);
         }
    };

    const handleDeletePlantDefinition = async (plantId) => {
         if (window.confirm('Czy na pewno chcesz usunąć tę definicję rośliny?')) {
             setPlantError('');
             setLoadingPlants(true);
             try {
                 await deletePlantDefinition(plantId);
                 fetchPlantDefinitionData();
             } catch (err) {
                 console.error('Error deleting plant definition:', err.response?.data || err.message);
                  let errMsg = 'Nie udało się usunąć definicji rośliny.';
                  if (err.response?.data?.detail) errMsg = err.response.data.detail;
                 setPlantError(errMsg);
             } finally {
                  setLoadingPlants(false);
             }
         }
    };

     const handleDeleteAnyUserPlant = async (userPlantId, event) => {
         event.stopPropagation();
         if (window.confirm('Czy na pewno chcesz usunąć tę roślinę z kolekcji użytkownika?')) {
             setUserPlantsError('');
             setLoadingUserPlants(true);
             try {
                 await deleteAnyUserPlant(userPlantId);
                 if (selectedUserId !== null) {
                      fetchUserPlantsForSelectedUser(selectedUserId); // Refresh plants for the selected user
                 }
             } catch (err) {
                  console.error('Error deleting user plant:', err.response?.data || err.message);
                  let errMsg = 'Nie udało się usunąć rośliny użytkownika.';
                  if (err.response?.data?.detail) errMsg = err.response.data.detail;
                  setUserPlantsError(errMsg);
             } finally {
                  setLoadingUserPlants(false);
             }
         }
     };

    const handleSelectUser = (userId) => {
         console.log(`AdminPanel: Selected user ID: ${userId}`); // Debug log
         setSelectedUserId(userId);
    };

    const handleClearSelectedUser = () => {
        console.log("AdminPanel: Clearing selected user."); // Debug log
        setSelectedUserId(null);
        setUserPlants([]);
        setUserPlantsError('');
    };


    // --- Render Logic ---
    // Initial check for non-admin users happens in the useEffect, leading to navigation.
    // This check here is primarily for the *first* render before useEffect might run
    // or if the component is reached directly with invalid state.
    // Given the useEffect navigates, the code below should only render for admins.
     if (!currentUser || !currentUser.is_superuser) {
         // This part might be briefly shown before useEffect navigates
         return <p>Przekierowywanie...</p>; // Or a loading message
     }


    return (
        <div className="dashboard-container admin-panel">
            <h2 className="section-title">Panel Administratora</h2>

            {generalError && <div className="error-message">{generalError}</div>}

            {/* --- User List / Selected User's Plants Section --- */}
            <div className="admin-section user-management-section">
                <h3>{selectedUserId === null ? 'Zarządzanie Użytkownikami' : `Rośliny użytkownika: ${users.find(u => u.id === selectedUserId)?.username || selectedUserId}`}</h3>
                 {userListError && <div className="error-message">{userListError}</div>}
                 {userPlantsError && <div className="error-message">{userPlantsError}</div>}

                 {selectedUserId === null ? (
                     // --- Display User List ---
                     loadingUsers ? (
                        <div className="loading">Ładowanie użytkowników...</div>
                     ) : users.length === 0 ? (
                          <p>Brak użytkowników w systemie.</p>
                     ) : (
                         <ul className="admin-list user-list">
                             {users.map(user => (
                                 <li
                                     key={user.id}
                                     className="admin-list-item user-list-item"
                                     onClick={() => handleSelectUser(user.id)}
                                 >
                                     <span className="user-icon-placeholder">👤</span> {/* Placeholder icon */}
                                     <div className="admin-item-info">
                                         <strong>{user.username}</strong> ({user.email || 'brak emaila'})
                                         <br />
                                         <small>Admin: {user.is_superuser ? 'Tak' : 'Nie'} | Moderator: {user.is_staff ? 'Tak' : 'Nie'}</small>
                                         <br />
                                         <small>Aktywny: {user.is_active ? 'Tak' : 'Nie'} | Dołączył: {formatDate(user.date_joined)}</small>
                                     </div>
                                     <div className="admin-item-actions">
                                          {/* Admin actions on the user - can add buttons here */}
                                          {/* Example: <button className="button small-button">Edytuj</button> */}
                                          {/* Example: <button className="button small-button">Hasło</button> */}

                                          {/* Prevent deleting the currently logged-in user */}
                                          {currentUser?.id !== user.id && (
                                             <button
                                                onClick={(event) => { event.stopPropagation(); handleDeleteUser(user.id); }} // Stop propagation
                                                className="button button-danger small-button"
                                                disabled={loadingUsers}
                                             >
                                                Usuń użytkownika
                                             </button>
                                          )}
                                     </div>
                                 </li>
                             ))}
                         </ul>
                     )
                 ) : (
                     // --- Display Selected User's Plants ---
                     <div>
                        <button onClick={handleClearSelectedUser} className="button button-secondary small-button back-button">
                             ← Powrót do listy użytkowników
                        </button>
                        {loadingUserPlants ? (
                            <div className="loading">Ładowanie roślin użytkownika...</div>
                        ) : userPlants.length === 0 ? (
                             !userPlantsError && <p>Wybrany użytkownik nie ma jeszcze żadnych roślin.</p>
                        ) : (
                            <ul className="admin-list user-plants-list">
                                {userPlants.map(up => (
                                    <li key={up.id} className="admin-list-item user-plant-item">
                                        <img
                                            src={getImageUrl(up.plant.image)}
                                            alt={up.plant.name}
                                            className="admin-item-image"
                                             onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-plant.png'; }}
                                        />
                                        <div className="admin-item-info">
                                            <strong>{up.plant.name}</strong> ({up.plant.species || 'Brak gatunku'})
                                            <br/>
                                            <small>Następne podlewanie: {formatDate(up.next_watering_date)}</small>
                                        </div>
                                        <div className="admin-item-actions">
                                             {/* Actions on user plants */}
                                             <button
                                                onClick={(event) => handleDeleteAnyUserPlant(up.id, event)}
                                                className="button button-danger small-button"
                                                disabled={loadingUserPlants}
                                               >
                                                 Usuń z kolekcji
                                              </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                     </div>
                 )}
            </div> {/* End User List / User Plants Section */}

            <hr className="section-separator" />

            {/* --- Global Plant Definition Management Section --- */}
             <div className="admin-section plant-definition-management-section">
                <h3>Zarządzanie Definiciami Roślin w Bazie ({allPlants.length})</h3>
                {plantError && <div className="error-message">{plantError}</div>}
                {loadingPlants ? (
                    <div className="loading">Ładowanie definicji roślin...</div>
                ) : allPlants.length === 0 ? (
                     <p>Brak definicji roślin w bazie.</p>
                ) : (
                    <ul className="admin-list plant-definition-list">
                        {allPlants.map(plant => (
                            <li key={plant.id} className="admin-list-item plant-definition-item">
                                 <img
                                    src={getImageUrl(plant.image)}
                                    alt={plant.name}
                                    className="admin-item-image"
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-plant.png'; }}
                                />
                                <div className="admin-item-info">
                                     <strong>{plant.name}</strong> ({plant.species || 'Brak gatunku'})
                                     <br/>
                                     <small>Status: {plant.status} | Zaproponowany przez: {plant.proposed_by || '-'}</small>
                                </div>
                                <div className="admin-item-actions">
                                     {/* Approve/Reject buttons for pending items */}
                                     {plant.status === 'pending' && (
                                         <button
                                            onClick={() => handleUpdatePlantDefinition(plant.id, { status: 'approved' })}
                                            className="button button-secondary small-button"
                                            disabled={loadingPlants}
                                         >
                                            Zatwierdź
                                        </button>
                                     )}
                                     {plant.status === 'pending' && (
                                        <button
                                            onClick={() => handleUpdatePlantDefinition(plant.id, { status: 'rejected' })}
                                            className="button button-danger small-button"
                                            disabled={loadingPlants}
                                        >
                                            Odrzuć
                                        </button>
                                     )}
                                     {/* Edit Definition button (requires a modal/form) */}
                                     {/* <button onClick={() => handleEditPlantDefinition(plant.id)} className="button small-button">Edytuj</button> */}
                                     {/* Delete Definition button */}
                                     <button
                                        onClick={() => handleDeletePlantDefinition(plant.id)}
                                        className="button button-danger small-button"
                                        disabled={loadingPlants}
                                     >
                                        Usuń definicję
                                     </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div> {/* End Plant Definition Management Section */}

        </div>
    );
};

export default AdminPanel;