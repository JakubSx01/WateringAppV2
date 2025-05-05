// Frontend/my-react-app/src/pages/AdminPanel.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchAllUsers,
    // eslint-disable-next-line no-unused-vars
    updateUserDetails, // ESLint warning: defined but never used
    deleteUser,
    setUserPassword,
    fetchAllPlantDefinitions,
    approvePlantDefinition,
    rejectPlantDefinition,
    // eslint-disable-next-line no-unused-vars
    updatePlantDefinition, // ESLint warning: defined but never used
    deletePlantDefinition,
    fetchAllUserPlants,
    deleteAnyUserPlant,
    waterAnyUserPlant
} from '../services/api';
import '../styles/Dashboard.css';
import '../styles/AdminPanel.css';
import { formatDate } from '../utils/dateUtils';
import { getImageUrl } from '../utils/imageUtils';
import PlantDetailModal from '../components/PlantDetailModal';
import SetPasswordModal from '../components/SetPasswordModal';

const AdminPanel = ({ currentUser }) => {
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedUserForAction, setSelectedUserForAction] = useState(null);
    const [userListError, setUserListError] = useState('');

    const [allPlants, setAllPlants] = useState([]);
    const [pendingPlants, setPendingPlants] = useState([]);
    const [loadingPlants, setLoadingPlants] = useState(true);
    const [plantError, setPlantError] = useState('');

    const [userPlants, setUserPlants] = useState([]);
    const [loadingUserPlants, setLoadingUserPlants] = useState(false);
    const [userPlantsError, setUserPlantsError] = useState('');

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedPlantForDetail, setSelectedPlantForDetail] = useState(null);
    const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
    const [setPasswordModalError, setSetPasswordModalError] = useState('');

    const navigate = useNavigate();

    const isStaffOrSuperuser = currentUser?.is_staff || currentUser?.is_superuser || false;
    const isSuperuser = currentUser?.is_superuser || false;


    const fetchUserData = useCallback(async () => {
         setLoadingUsers(true);
         setUserListError('');
         try {
             const response = await fetchAllUsers();
             setUsers(response.data);
         } catch (err) {
             console.error('Error fetching users:', err.response?.data || err.message);
             let errMsg = 'Nie udało się załadować listy użytkowników.';
             if (err.response?.data?.detail) errMsg = err.response.data.detail;
             else if (err.response?.status === 403) errMsg = "Brak uprawnień do wyświetlenia listy użytkowników.";
             setUserListError(errMsg);
         } finally {
             setLoadingUsers(false);
         }
    }, []);

    const fetchPlantDefinitionData = useCallback(async () => {
        setLoadingPlants(true);
        setPlantError('');
        try {
            const response = await fetchAllPlantDefinitions();
            setAllPlants(response.data);
            setPendingPlants(response.data.filter(plant => plant.status === 'pending'));
        } catch (err) {
            console.error('Error fetching all plant definitions:', err.response?.data || err.message);
            let errMsg = 'Nie udało się załadować listy definicji roślin.';
             if (err.response?.data?.detail) errMsg = err.response.data.detail;
             else if (err.response?.status === 403) errMsg = "Brak uprawnień do wyświetlenia definicji roślin.";
             setPlantError(errMsg);
        } finally {
            setLoadingPlants(false);
        }
    }, []);

     const fetchUserPlantsForSelectedUser = useCallback(async (userId) => {
        setLoadingUserPlants(true);
        setUserPlantsError('');
        setUserPlants([]);
        try {
            const response = await fetchAllUserPlants(userId);
            setUserPlants(response.data);
        } catch (err) {
            console.error(`Error fetching plants for user ${userId}:`, err.response?.data || err.message);
            let errMsg = `Nie udało się załadować roślin dla wybranego użytkownika.`;
            if (err.response?.data?.detail) errMsg = err.response.data.detail;
            else if (err.response?.status === 403) errMsg = "Brak uprawnień do wyświetlenia roślin tego użytkownika.";
            setUserPlantsError(errMsg);
        } finally {
            setLoadingUserPlants(false);
        }
     }, []);

    useEffect(() => {
        if (currentUser && isStaffOrSuperuser) {
            fetchUserData();
            fetchPlantDefinitionData();
        } else if (!currentUser) {
              const timer = setTimeout(() => { navigate('/login'); }, 0);
              return () => clearTimeout(timer);
        } else if (currentUser && !isStaffOrSuperuser) {
              const timer = setTimeout(() => { navigate('/'); }, 0);
              return () => clearTimeout(timer);
        }
        return () => {};
    }, [currentUser, navigate, isStaffOrSuperuser, fetchUserData, fetchPlantDefinitionData]);

     useEffect(() => {
        if (selectedUserId !== null && isStaffOrSuperuser) {
             fetchUserPlantsForSelectedUser(selectedUserId);
        } else {
             setUserPlants([]);
             setUserPlantsError('');
        }
     }, [selectedUserId, isStaffOrSuperuser, fetchUserPlantsForSelectedUser]);

    const handleDeleteUser = async (userId) => {
         if (!isSuperuser) {
              alert("Brak uprawnień do usunięcia użytkownika.");
              return;
         }
         if (currentUser?.id === userId) {
              alert("Nie możesz usunąć własnego konta administratora.");
              return;
         }

         if (window.confirm('Czy na pewno chcesz usunąć tego użytkownika? Ta operacja jest nieodwracalna.')) {
             setUserListError('');
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
                  if (err.response?.status === 403) {
                     errMsg = "Brak uprawnień do usunięcia tego użytkownika.";
                  } else if (err.response?.data?.detail) {
                     errMsg = err.response.data.detail;
                  } else if (err.response?.status >= 500) {
                       errMsg = "Błąd serwera podczas usuwania użytkownika.";
                  } else {
                       errMsg = `Wystąpił błąd (${err.response?.status || '??'}). Spróbuj ponownie.`;
                  }
                 setUserListError(errMsg);
             } finally {
                  setLoadingUsers(false);
             }
         }
    };

    const handleOpenSetPasswordModal = (user) => {
        console.log("Opening set password modal for user:", user); // Check the user object here
        if (!isSuperuser) { /* ... */ }
        setSelectedUserForAction(user);
        setSetPasswordModalError('');
        setIsSetPasswordModalOpen(true);
    };


     const handleCloseSetPasswordModal = () => {
         setIsSetPasswordModalOpen(false);
         setSelectedUserForAction(null);
         setSetPasswordModalError('');
     };

    const handleSetUserPassword = async (userId, passwordData) => {
        console.log(`Attempting to set password for userId: ${userId}`);
         setSetPasswordModalError('');

         if (passwordData.error) {
             setSetPasswordModalError(passwordData.error);
             return;
         }

         try {
             await setUserPassword(userId, { new_password: passwordData.new_password, confirm_password: passwordData.confirm_password });
             alert('Hasło zmienione pomyślnie!');
             handleCloseSetPasswordModal();
         } catch (err) {
             console.error('Error setting password:', err.response?.data || err.message);
             let errMsg = 'Nie udało się zmienić hasła.';

             if (err.response) {
                 if (err.response.status === 400) {
                      if (typeof err.response.data === 'object' && err.response.data !== null) {
                           const errors = err.response.data;
                           let detailedMsgs = [];
                           if (errors.new_password) detailedMsgs.push(`Nowe hasło: ${Array.isArray(errors.new_password) ? errors.new_password.join(' ') : errors.new_password}`);
                           if (errors.confirm_password) detailedMsgs.push(`Potwierdzenie hasła: ${Array.isArray(errors.confirm_password) ? errors.confirm_password.join(' ') : errors.confirm_password}`);

                           if (detailedMsgs.length > 0) {
                                errMsg = `Błąd walidacji hasła: ${detailedMsgs.join('; ')}`;
                           } else {
                                const otherErrors = Object.entries(errors).map(([field, msgs]) => {
                                     const message = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
                                     return `${field}: ${message}`;
                                }).join('; ');
                                if (otherErrors) errMsg = `Błąd danych: ${otherErrors}`;
                                else if (errors.detail) errMsg = errors.detail;
                           }
                      } else if (typeof err.response.data === 'string') {
                           errMsg = `Błąd danych: ${err.response.data}`;
                      } else {
                           errMsg = 'Nieprawidłowe dane wysłane.';
                      }
                 } else if (err.response.status === 403) {
                      errMsg = "Brak uprawnień do zmiany hasła dla tego użytkownika.";
                      if (err.response.data?.detail) errMsg = err.response.data.detail;
                 } else if (err.response.status === 401) {
                     errMsg = "Sesja wygasła lub brak autoryzacji. Spróbuj zalogować się ponownie.";
                     if (err.response.data?.detail) errMsg = err.response.data.detail;
                 } else if (err.response.status === 404) {
                     errMsg = "Nie znaleziono zasobu (użytkownika). Sprawdź identyfikator użytkownika.";
                     if (err.response.data?.detail) errMsg = err.response.data.detail;
                 } else if (err.response.status >= 500) {
                      errMsg = `Wystąpił błąd serwera (${err.response.status}). Spróbuj ponownie później.`;
                 } else {
                      errMsg = `Wystąpił nieoczekiwany błąd (${err.response.status}). Spróbuj ponownie.`;
                      if (err.response.data?.detail) errMsg = err.response.data.detail;
                 }
             } else if (err.request) {
                 errMsg = 'Błąd połączenia sieciowego. Nie udało się skomunikować z serwerem.';
             } else {
                 errMsg = `Wystąpił błąd aplikacji: ${err.message}`;
             }
             setSetPasswordModalError(errMsg);
         } finally {
            // Loading state is handled by the modal component now.
         }
    };


    const handleApprovePlant = async (plantId, event) => {
        event.stopPropagation();
        setPlantError('');
        setLoadingPlants(true);
        try {
            await approvePlantDefinition(plantId);
            fetchPlantDefinitionData();
        } catch (err) {
            console.error('Error approving plant:', err.response?.data || err.message);
            let errMsg = 'Nie udało się zatwierdzić rośliny.';
            if (err.response?.data?.detail) errMsg = err.response.data.detail;
             else if (err.response?.status === 403) errMsg = "Brak uprawnień do zatwierdzania roślin.";
            setPlantError(errMsg);
        } finally {
             setLoadingPlants(false);
        }
    };

    const handleRejectPlant = async (plantId, event) => {
        event.stopPropagation();
        setPlantError('');
        setLoadingPlants(true);
        try {
            await rejectPlantDefinition(plantId);
            fetchPlantDefinitionData();
        } catch (err) {
            console.error('Error rejecting plant:', err.response?.data || err.message);
            let errMsg = 'Nie udało się odrzucić rośliny.';
            if (err.response?.data?.detail) errMsg = err.response.data.detail;
            else if (err.response?.status === 403) errMsg = "Brak uprawnień do odrzucania roślin.";
            setPlantError(errMsg);
        } finally {
             setLoadingPlants(false);
        }
    };

     // Edit Plant Definition handler placeholder
     const handleEditPlantDefinition = async (plantId) => {
         if (!isStaffOrSuperuser) {
              alert("Brak uprawnień do edycji definicji rośliny.");
              return;
         }
          console.log(`AdminPanel: Edit plant definition with ID: ${plantId}`);
          alert(`Funkcjonalność edycji definicji rośliny (ID: ${plantId}) nie zaimplementowana w UI.`);
     };

    const handleDeletePlantDefinition = async (plantId, event) => {
         event.stopPropagation();
         if (!isStaffOrSuperuser) {
              alert("Brak uprawnień do usunięcia definicji rośliny.");
              return;
         }
         if (window.confirm('Czy na pewno chcesz usunąć tę definicję rośliny z bazy? Usunie to również wszystkie rośliny użytkowników powiązane z tą definicją! Ta operacja jest nieodwracalna.')) {
             setPlantError('');
             setLoadingPlants(true);
             try {
                 await deletePlantDefinition(plantId);
                 fetchPlantDefinitionData();
                 if (selectedUserId !== null) {
                      fetchUserPlantsForSelectedUser(selectedUserId);
                 }
             } catch (err) {
                 console.error('Error deleting plant definition:', err.response?.data || err.message);
                  let errMsg = 'Nie udało się usunąć definicji rośliny.';
                  if (err.response?.data?.detail) errMsg = err.response.data.detail;
                   else if (err.response?.status === 403) errMsg = "Brak uprawnień do usunięcia definicji rośliny.";
                 setPlantError(errMsg);
             } finally {
                  setLoadingPlants(false);
             }
         }
    };


     const handleDeleteAnyUserPlant = async (userPlantId, event) => {
         event.stopPropagation();
         if (!isStaffOrSuperuser) {
              alert("Brak uprawnień do usunięcia rośliny użytkownika.");
              return;
         }
         if (window.confirm('Czy na pewno chcesz usunąć tę roślinę z kolekcji użytkownika? Ta operacja jest nieodwracalna.')) {
             setUserPlantsError('');
             setLoadingUserPlants(true);
             try {
                 await deleteAnyUserPlant(userPlantId);
                 if (selectedUserId !== null) {
                      fetchUserPlantsForSelectedUser(selectedUserId);
                 }
             } catch (err) {
                  console.error('Error deleting user plant:', err.response?.data || err.message);
                  let errMsg = 'Nie udało się usunąć rośliny użytkownika.';
                  if (err.response?.data?.detail) errMsg = err.response.data.detail;
                   else if (err.response?.status === 403) errMsg = "Brak uprawnień do usunięcia rośliny użytkownika.";
                  setUserPlantsError(errMsg);
             } finally {
                  setLoadingUserPlants(false);
             }
         }
     };

    const handleWaterAnyUserPlant = async (userPlantId, event) => {
         event.stopPropagation();
         if (!isStaffOrSuperuser) {
              alert("Brak uprawnień do podlewania roślin użytkowników.");
              return;
         }
         setUserPlantsError('');
         setLoadingUserPlants(true);
         try {
             await waterAnyUserPlant(userPlantId);
             if (selectedUserId !== null) {
                  fetchUserPlantsForSelectedUser(selectedUserId);
             }
         } catch (err) {
              console.error('Error watering user plant:', err.response?.data || err.message);
              let errMsg = 'Nie udało się podlać rośliny użytkownika. Spróbuj ponownie.';
              if (err.response?.data?.detail) errMsg = err.response.data.detail;
               else if (err.response?.status === 403) errMsg = "Brak uprawnień do podlewania roślin użytkowników.";
              setUserPlantsError(errMsg);
         } finally {
              setLoadingUserPlants(false);
         }
     };

    const handleSelectUser = (userId) => {
         setSelectedUserId(userId);
    };

    const handleClearSelectedUser = () => {
        setSelectedUserId(null);
        setUserPlants([]);
        setUserPlantsError('');
    };

     const handleShowPlantDetails = (plantData) => {
          setSelectedPlantForDetail(plantData);
          setIsDetailModalOpen(true);
     };

     const handleCloseDetails = () => {
          setIsDetailModalOpen(false);
          setSelectedPlantForDetail(null);
     };

     if (!currentUser || !isStaffOrSuperuser) {
         return <div className="loading">Sprawdzanie uprawnień...</div>;
     }

    return (
        <div className="dashboard-container admin-panel">
            <h2 className="section-title">{isSuperuser ? 'Panel Administratora' : 'Panel Moderatora'}</h2>

            {userListError && <div className="error-message">{userListError}</div>}
            {plantError && <div className="error-message">{plantError}</div>}
            {userPlantsError && <div className="error-message">{userPlantsError}</div>}

            {/* --- User List / Selected User's Plants Section (Visible to Staff/Admin) --- */}
            <div className="admin-section user-management-section">
                <h3>{selectedUserId === null ? 'Zarządzanie Użytkownikami' : `Rośliny użytkownika: ${users.find(u => u.id === selectedUserId)?.username || 'Nieznany'}`}</h3>

                 {selectedUserId === null ? (
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
                                     <span className="user-icon-placeholder">👤</span>
                                     <div className="admin-item-info">
                                         <strong>{user.username}</strong> ({user.email || 'brak emaila'})
                                         <br />
                                         {isSuperuser && <small>Admin: {user.is_superuser ? 'Tak' : 'Nie'} | Moderator: {user.is_staff ? 'Tak' : 'Nie'}</small>}
                                         {!isSuperuser && (user.is_superuser || user.is_staff) && <small>Rola specjalna</small>}
                                         {!isSuperuser && !user.is_superuser && !user.is_staff && <small>Użytkownik</small>}
                                         <br />
                                         <small>Aktywny: {user.is_active ? 'Tak' : 'Nie'} | Dołączył: {formatDate(user.date_joined)}</small>
                                     </div>
                                     <div className="admin-item-actions">
                                          {isSuperuser && (
                                               <>
                                                     <button
                                                        onClick={(event) => { event.stopPropagation(); handleOpenSetPasswordModal(user); }}
                                                        className="button button-secondary small-button"
                                                        disabled={loadingUsers}
                                                     >
                                                         Ustaw hasło
                                                     </button>
                                                    {currentUser?.id !== user.id && (
                                                         <button
                                                            onClick={(event) => { event.stopPropagation(); handleDeleteUser(user.id); }}
                                                            className="button button-danger small-button"
                                                            disabled={loadingUsers}
                                                         >
                                                            Usuń użytkownika
                                                         </button>
                                                    )}
                                               </>
                                          )}
                                     </div>
                                 </li>
                             ))}
                         </ul>
                     )
                 ) : (
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
                                    <li key={up.id} className="admin-list-item user-plant-item" onClick={() => handleShowPlantDetails(up)}>
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
                                             {isStaffOrSuperuser && (
                                                  <>
                                                       <button
                                                            onClick={(event) => handleWaterAnyUserPlant(up.id, event)}
                                                            className="button button-secondary small-button"
                                                            disabled={loadingUserPlants}
                                                       >
                                                           Podlej
                                                      </button>
                                                      <button
                                                         onClick={(event) => handleDeleteAnyUserPlant(up.id, event)}
                                                         className="button button-danger small-button"
                                                         disabled={loadingUserPlants}
                                                        >
                                                          Usuń z kolekcji
                                                       </button>
                                                  </>
                                             )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                     </div>
                 )}
            </div> {/* End User List / User Plants Section */}

            <hr className="section-separator" />

            {/* --- Pending Plant Definitions Section (Visible to Staff/Admin if pending plants exist) --- */}
            {isStaffOrSuperuser && ( // Show section header if user is staff/admin
                <div className="admin-section plant-pending-section">
                    <h3>Propozycje roślin do zatwierdzenia ({pendingPlants.length})</h3>
                    {loadingPlants && <div className="loading">Aktualizowanie listy...</div>}
                     {pendingPlants.length === 0 && !loadingPlants ? (
                        <p>Brak nowych propozycji roślin do zatwierdzenia.</p>
                     ) : (
                         <ul className="admin-list plant-pending-list">
                             {pendingPlants.map(plant => (
                                  <li key={plant.id} className="admin-list-item plant-definition-item pending-plant-item" onClick={() => handleShowPlantDetails(plant)}>
                                       <img
                                           src={getImageUrl(plant.image)}
                                           alt={plant.name}
                                           className="admin-item-image"
                                            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-plant.png'; }}
                                       />
                                       <div className="admin-item-info">
                                           <strong>{plant.name}</strong> ({plant.species || 'Brak gatunku'})
                                           <br/>
                                           <small>Zaproponowany przez: {plant.proposed_by || '-'}</small>
                                           <br/>
                                           <small>Status: {plant.status}</small>
                                       </div>
                                       <div className="admin-item-actions">
                                            {isStaffOrSuperuser && (
                                                 <>
                                                     <button
                                                         onClick={(event) => handleApprovePlant(plant.id, event)}
                                                         className="button button-secondary small-button"
                                                         disabled={loadingPlants}
                                                     >
                                                        Zatwierdź
                                                     </button>
                                                     <button
                                                         onClick={(event) => handleRejectPlant(plant.id, event)}
                                                         className="button button-danger small-button"
                                                         disabled={loadingPlants}
                                                     >
                                                        Odrzuć
                                                     </button>
                                                 </>
                                            )}
                                       </div>
                                  </li>
                              ))}
                         </ul>
                    )}
                </div>
            )}
             {/* Show separator if there are pending plants OR other plants AND user is staff/admin */}
             {isStaffOrSuperuser && (pendingPlants.length > 0 || allPlants.length > 0) && (
                 <hr className="section-separator" />
             )}


            {/* --- Global Plant Definition Management Section (Visible to Staff/Admin) --- */}
             {isStaffOrSuperuser && (
                 <div className="admin-section plant-definition-management-section">
                    <h3>Wszystkie Definicje Roślin w Bazie ({allPlants.length})</h3>
                    {loadingPlants && <div className="loading">Ładowanie definicji roślin...</div>}
                    {!loadingPlants && allPlants.length === 0 && !plantError ? (
                         <p>Brak definicji roślin w bazie.</p>
                    ) : (
                        <ul className="admin-list plant-definition-list">
                            {allPlants.map(plant => (
                                <li key={plant.id} className="admin-list-item plant-definition-item" onClick={() => handleShowPlantDetails(plant)}>
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
                                         {plant.status !== 'pending' && isStaffOrSuperuser && (
                                               <>
                                                    {plant.status !== 'approved' && (
                                                        <button
                                                            onClick={(event) => handleApprovePlant(plant.id, event)}
                                                            className="button button-secondary small-button"
                                                            disabled={loadingPlants}
                                                        >
                                                           Zatwierdź
                                                       </button>
                                                    )}
                                                     {plant.status !== 'rejected' && (
                                                        <button
                                                            onClick={(event) => handleRejectPlant(plant.id, event)}
                                                            className="button button-danger small-button"
                                                            disabled={loadingPlants}
                                                        >
                                                           Odrzuć
                                                        </button>
                                                     )}
                                               </>
                                          )}
                                         {/* {isStaffOrSuperuser && (
                                              <button onClick={(event) => { event.stopPropagation(); handleEditPlantDefinition(plant.id); }} className="button small-button">Edytuj</button>
                                         )} */}
                                         {isStaffOrSuperuser && (
                                              <button
                                                onClick={(event) => handleDeletePlantDefinition(plant.id, event)}
                                                className="button button-danger small-button"
                                                disabled={loadingPlants}
                                             >
                                                Usuń definicję
                                             </button>
                                         )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
             )}

            {isDetailModalOpen && selectedPlantForDetail && (
                <PlantDetailModal
                    plantData={selectedPlantForDetail}
                    onClose={handleCloseDetails}
                />
            )}

             {isSetPasswordModalOpen && selectedUserForAction && (
                <SetPasswordModal
                     user={selectedUserForAction}
                     onSetPassword={handleSetUserPassword}
                     onClose={handleCloseSetPasswordModal}
                     modalError={setPasswordModalError}
                />
             )}

        </div>
    );
};

export default AdminPanel;