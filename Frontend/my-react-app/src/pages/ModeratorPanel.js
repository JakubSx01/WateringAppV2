// Frontend/my-react-app/src/pages/ModeratorPanel.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchAllPlantDefinitions, // Get all plants including pending
    approvePlantDefinition,
    rejectPlantDefinition,
    fetchAllUserPlants, // Moderator can view ANY user plants (will modify)
    fetchAllUsers, // Moderator can view users
    deleteAnyUserPlant,
    // updateUserPlant // If moderator can change watering date etc.
} from '../services/api'; // Ensure correct imports from api.js
import '../styles/Dashboard.css';
import '../styles/ModeratorPanel.css';
import { formatDate } from '../utils/dateUtils';
import { getImageUrl } from '../utils/imageUtils';

const ModeratorPanel = ({ currentUser }) => {
    // --- All State and Hook calls must be at the top level, unconditionally ---
    // State for plant definitions (for moderation)
    const [allPlants, setAllPlants] = useState([]);
    const [pendingPlants, setPendingPlants] = useState([]);
    const [loadingPlants, setLoadingPlants] = useState(true);
    const [plantError, setPlantError] = useState('');

    // State for user list and selected user
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [userListError, setUserListError] = useState('');

    // State for user plants (for the selected user)
    const [userPlants, setUserPlants] = useState([]);
    const [loadingUserPlants, setLoadingUserPlants] = useState(false);
    const [userPlantsError, setUserPlantsError] = useState('');

    const navigate = useNavigate();
    // --- End State and Hook calls ---

    // --- Authentication/Role check logic handled in useEffect ---
    // Check both is_staff and is_superuser for moderator access
    const isModeratorOrAdmin = currentUser?.is_staff || currentUser?.is_superuser;


    // Memoized functions remain here
    const fetchPlantDefinitionData = useCallback(async () => {
        setLoadingPlants(true);
        setPlantError('');
        try {
            const response = await fetchAllPlantDefinitions();
            setAllPlants(response.data);
            setPendingPlants(response.data.filter(p => p.status === 'pending'));
        } catch (err) {
            console.error('Error fetching plant definitions:', err.response?.data || err.message);
            setPlantError('Nie udało się załadować listy definicji roślin.');
            // Do NOT redirect here in useCallback
        } finally {
            setLoadingPlants(false);
        }
    }, []); // Dependencies: empty

     const fetchUserData = useCallback(async () => {
        setLoadingUsers(true);
        setUserListError('');
        try {
            const response = await fetchAllUsers(); // Admin endpoint to get users
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users:', err.response?.data || err.message);
            setUserListError('Nie udało się załadować listy użytkowników.');
             // Do NOT redirect here
        } finally {
            setLoadingUsers(false);
        }
     }, []);

    // Fetch plants for the selected user
     const fetchUserPlantsForSelectedUser = useCallback(async (userId) => {
        setLoadingUserPlants(true);
        setUserPlantsError('');
        setUserPlants([]);
        try {
             // Call the modified API function with the user ID
            const response = await fetchAllUserPlants(userId);
            setUserPlants(response.data);
        } catch (err) {
            console.error(`Error fetching plants for user ${userId}:`, err.response?.data || err.message);
            setUserPlantsError(`Nie udało się załadować roślin dla wybranego użytkownika.`);
            // Do NOT redirect here
        } finally {
            setLoadingUserPlants(false);
        }
     }, []); // Dependencies: empty


    // --- useEffect to handle initial data fetch AND authentication check ---
    useEffect(() => {
        // Check authentication and role here. If not met, navigate away.
        // This runs after the component renders (with hooks) and when currentUser changes.
        if (!currentUser || !isModeratorOrAdmin) {
             console.log("ModeratorPanel useEffect: User not staff/admin, navigating away."); // Debug log
             // Give React a moment to render the loading/denied state if needed
              const timer = setTimeout(() => {
                   navigate('/'); // Redirect if not staff or admin
              }, 0); // Use setTimeout

              return () => clearTimeout(timer); // Cleanup timer

        } else {
            // If user IS authenticated and IS staff/admin, fetch data
            console.log("ModeratorPanel useEffect: User is staff/admin, fetching data."); // Debug log
            fetchPlantDefinitionData();
            fetchUserData();
            // Note: fetchUserPlantsForSelectedUser is called by the other useEffect when selectedUserId changes
        }

        // Cleanup function (optional)
        return () => {
            // Any cleanup like cancelling API requests if needed
        };

    }, [currentUser, navigate, isModeratorOrAdmin, fetchPlantDefinitionData, fetchUserData]); // Dependencies: Run when these change


    // useEffect to handle fetching user plants when selectedUserId changes
     useEffect(() => {
        if (selectedUserId !== null && isModeratorOrAdmin) { // Only fetch if user is mod/admin and user is selected
             console.log(`ModeratorPanel useEffect: Selected user ID changed to ${selectedUserId}, fetching plants.`); // Debug log
             fetchUserPlantsForSelectedUser(selectedUserId);
        } else {
             console.log("ModeratorPanel useEffect: selectedUserId is null, clearing user plants."); // Debug log
             setUserPlants([]);
             setUserPlantsError('');
        }
     }, [selectedUserId, isModeratorOrAdmin, fetchUserPlantsForSelectedUser]); // Dependencies


    // --- Action Handlers ---
    const handleApprove = async (plantId) => {
        setPlantError('');
        setLoadingPlants(true);
        try {
            await approvePlantDefinition(plantId);
            fetchPlantDefinitionData(); // Refetch all definitions to update lists
        } catch (err) {
            console.error('Error approving plant:', err.response?.data || err.message);
            setPlantError('Nie udało się zatwierdzić rośliny.');
        } finally {
             setLoadingPlants(false);
        }
    };

    const handleReject = async (plantId) => {
        setPlantError('');
        setLoadingPlants(true);
        try {
            await rejectPlantDefinition(plantId);
            fetchPlantDefinitionData(); // Refetch all definitions
        } catch (err) {
            console.error('Error rejecting plant:', err.response?.data || err.message);
            setPlantError('Nie udało się odrzucić rośliny.');
        } finally {
             setLoadingPlants(false);
        }
    };

    const handleDeleteAnyUserPlant = async (userPlantId, event) => {
         event.stopPropagation(); // Prevent user list item click from firing
         if (window.confirm('Czy na pewno chcesz usunąć tę roślinę z kolekcji użytkownika?')) {
            setUserPlantsError(''); // Clear user plant specific error
            setLoadingUserPlants(true);
            try {
                await deleteAnyUserPlant(userPlantId); // Use the admin delete function
                // Refetch plants ONLY for the currently selected user
                if (selectedUserId !== null) {
                     fetchUserPlantsForSelectedUser(selectedUserId);
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

    // Handler for clicking a user in the list
    const handleSelectUser = (userId) => {
         console.log(`ModeratorPanel: Selected user ID: ${userId}`); // Debug log
         setSelectedUserId(userId);
         // fetchUserPlantsForSelectedUser will be triggered by the useEffect
    };

    // Handler to clear the selected user and return to the user list
    const handleClearSelectedUser = () => {
        console.log("ModeratorPanel: Clearing selected user."); // Debug log
        setSelectedUserId(null);
        setUserPlants([]); // Clear plants immediately
        setUserPlantsError(''); // Clear user plant errors
    };


    // --- Render Logic ---
    // Initial check for non-staff/admin users happens in the useEffect, leading to navigation.
    // This check here is primarily for the *first* render before useEffect might run
    // or if the component is reached directly with invalid state.
    // Given the useEffect navigates, the code below should only render for staff/admins.
     if (!currentUser || !isModeratorOrAdmin) {
         // This part might be briefly shown before useEffect navigates
         return <p>Przekierowywanie...</p>; // Or a loading message
     }


    return (
        <div className="dashboard-container moderator-panel">
            <h2 className="section-title">Panel Moderatora</h2>

            {plantError && <div className="error-message">{plantError}</div>}


            {/* --- Pending Plant Definitions Section --- */}
            <div className="moderator-section">
                <h3>Propozycje roślin do zatwierdzenia ({pendingPlants.length})</h3>
                 {loadingPlants ? (
                    <div className="loading">Ładowanie propozycji roślin...</div>
                 ) : pendingPlants.length === 0 ? (
                    <p>Brak nowych propozycji roślin do zatwierdzenia.</p>
                 ) : (
                    <ul className="moderator-list">
                        {pendingPlants.map(plant => (
                            <li key={plant.id} className="moderator-list-item pending-plant-item">
                                <img
                                    src={getImageUrl(plant.image)}
                                    alt={plant.name}
                                    className="moderator-item-image"
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-plant.png'; }}
                                />
                                <div className="moderator-item-info">
                                     <strong>{plant.name}</strong> ({plant.species || 'Brak gatunku'})
                                     <br/>
                                     <small>Zaproponowany przez: {plant.proposed_by || 'Nieznany'}</small>
                                     <br/>
                                     <small>Status: {plant.status}</small> {/* Display status */}
                                </div>
                                <div className="moderator-item-actions">
                                    <button
                                        onClick={() => handleApprove(plant.id)}
                                        className="button button-secondary small-button"
                                        disabled={loadingPlants}
                                    >
                                        Zatwierdź
                                    </button>
                                    <button
                                        onClick={() => handleReject(plant.id)}
                                        className="button button-danger small-button"
                                        disabled={loadingPlants}
                                    >
                                        Odrzuć
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                 )}
            </div> {/* End Pending Plant Definitions Section */}

            <hr className="section-separator" />

            {/* --- User List / Selected User's Plants Section --- */}
            <div className="moderator-section user-management-section"> {/* Added user-management-section class */}
                <h3>{selectedUserId === null ? 'Lista Użytkowników' : `Rośliny użytkownika: ${users.find(u => u.id === selectedUserId)?.username || selectedUserId}`}</h3>
                {userListError && <div className="error-message">{userListError}</div>}
                {userPlantsError && <div className="error-message">{userPlantsError}</div>}

                {selectedUserId === null ? (
                    // --- Display User List ---
                     loadingUsers ? (
                        <div className="loading">Ładowanie użytkowników...</div>
                     ) : users.length === 0 ? (
                        <p>Brak użytkowników w systemie.</p>
                     ) : (
                         <ul className="moderator-list user-list"> {/* Added user-list class */}
                             {users.map(user => (
                                 <li
                                     key={user.id}
                                     className="moderator-list-item user-list-item" // Add specific class for user items
                                     onClick={() => handleSelectUser(user.id)} // Click to select user
                                 >
                                      {/* Add a placeholder icon or image */}
                                     <span className="user-icon-placeholder">👤</span> {/* Placeholder icon */}
                                     <div className="moderator-item-info">
                                         <strong>{user.username}</strong>
                                         <br/>
                                         <small>{user.email || 'brak emaila'}</small>
                                         <br/>
                                         <small>Admin: {user.is_superuser ? 'Tak' : 'Nie'} | Moderator: {user.is_staff ? 'Tak' : 'Nie'}</small>
                                     </div>
                                      {/* No actions here, click the item to see plants */}
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
                             <ul className="moderator-list user-plants-list"> {/* Added user-plants-list class */}
                                 {userPlants.map(up => (
                                     <li key={up.id} className="moderator-list-item user-plant-item"> {/* Added user-plant-item class */}
                                         <img
                                             src={getImageUrl(up.plant.image)}
                                             alt={up.plant.name}
                                             className="moderator-item-image"
                                              onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-plant.png'; }}
                                         />
                                         <div className="moderator-item-info">
                                             <strong>{up.plant.name}</strong> ({up.plant.species || 'Brak gatunku'})
                                             <br/>
                                             {/* Owner info is implicit here */}
                                             <small>Następne podlewanie: {formatDate(up.next_watering_date)}</small>
                                             {/* Add more user plant specific details if needed */}
                                         </div>
                                         <div className="moderator-item-actions">
                                              {/* Actions on user plants (e.g., delete from collection) */}
                                              <button
                                                onClick={(event) => handleDeleteAnyUserPlant(up.id, event)}
                                                className="button button-danger small-button"
                                                disabled={loadingUserPlants}
                                               >
                                                  Usuń z kolekcji
                                                </button>
                                              {/* Add edit button if moderator can edit user plants */}
                                         </div>
                                     </li>
                                 ))}
                             </ul>
                        )}
                    </div>
                )}
            </div> {/* End User List / User Plants Section */}

        </div>
    );
};

export default ModeratorPanel;