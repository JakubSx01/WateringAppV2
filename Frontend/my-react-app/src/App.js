// Frontend/my-react-app/src/App.js
import './App.css';
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard'; // User Dashboard
import ModeratorPanel from './pages/ModeratorPanel'; // New Moderator Page
import AdminPanel from './pages/AdminPanel'; // New Admin Page
import Navbar from './components/Navbar'; // Import Navbar
import { fetchCurrentUser } from './services/api'; // Import the new API function

function App() {
  // State to hold the logged-in user's object { id, username, is_staff, is_superuser, ... }
  const [currentUser, setCurrentUser] = useState(null);
  // State to track if we are currently loading the user data
  const [loadingUser, setLoadingUser] = useState(true);

  // Memoize the function to fetch the current user's data
  // This function will be called once when the component mounts (via useEffect)
  // and also by the Login component after a successful login.
  const fetchUser = useCallback(async () => {
      const token = localStorage.getItem('token');
      console.log("App.js fetchUser: Checking for token:", token ? "Found token" : "No token"); // Debug log
      if (token) {
          try {
              setLoadingUser(true); // Set loading true while fetching
              console.log("App.js fetchUser: Attempting to fetch user data..."); // Debug log
              const response = await fetchCurrentUser();
              console.log("App.js fetchUser: User data fetched successfully:", response.data); // Debug log
              setCurrentUser(response.data); // Store the user object
              return response.data; // Return the user data for Login.js
          } catch (error) {
              console.error("App.js fetchUser: Failed to fetch user details:", error.response?.data || error.message); // Debug log
              // If fetching user fails (e.g., invalid/expired token, 401/403), clear tokens
              if (error.response?.status === 401 || error.response?.status === 403) {
                   console.log("App.js fetchUser: Auth error fetching user, clearing tokens.");
                   localStorage.removeItem('token');
                   localStorage.removeItem('refreshToken');
              }
              setCurrentUser(null); // Clear user state
              return null; // Return null on error
          } finally {
              // This should always run after try or catch, setting loading to false
              console.log("App.js fetchUser: finished, setting loading false."); // Debug log
              setLoadingUser(false);
          }
      } else {
          // If no token is found in localStorage
          console.log("App.js fetchUser: No token, setting loading false."); // Debug log
          setCurrentUser(null);
          setLoadingUser(false);
          return null; // Return null if no token
      }
      // Dependencies array is empty, meaning this function is created only once
      // when the component is first rendered.
  }, []);


  // Effect hook to run fetchUser once when the component mounts.
  useEffect(() => {
      fetchUser();
      // The dependency array contains fetchUser. Since fetchUser is memoized with useCallback
      // with an empty dependency array itself, fetchUser never changes after the initial render.
      // Thus, this useEffect runs only once on mount.
  }, [fetchUser]);


   // Derive authentication status and roles from the currentUser state.
   // isAuthenticated can also check localStorage for initial render before currentUser is loaded.
  const isAuthenticated = localStorage.getItem('token') !== null;
   // Use optional chaining (?.) to safely access properties on currentUser,
   // defaulting to false if currentUser is null or the property is missing.
   const isModerator = currentUser?.is_staff || false;
   const isAdmin = currentUser?.is_superuser || false;

  // Optional: Render a loading indicator while fetching user data.
  // This is important to prevent rendering authenticated content before knowing the user's role.
  // We show this specifically when `loadingUser` is true AND a token *might* exist,
  // as unauthenticated users with no token shouldn't see a loading screen.
  // A simpler check is just `if (loadingUser)`.
  if (loadingUser) {
      // You could add a check like `if (loadingUser && isAuthenticated)` if you only want
      // the loading message when a token is present and being validated.
      return (
           <div className="app-loading">
               Ładowanie użytkownika... {/* Replace with a proper spinner or loader */}
               {/* Basic style for app-loading */}
               <style>{`.app-loading { text-align: center; padding-top: 100px; font-size: 1.2rem; color: #555; }`}</style>
           </div>
      );
  }


  // --- Main application render with Router and Routes ---
  return (
    <Router>
      {/* Pass currentUser and roles to Navbar so it can conditionally show links */}
      <Navbar currentUser={currentUser} isAdmin={isAdmin} isModerator={isModerator} />
      {/* app-container provides padding so content isn't hidden behind fixed navbar */}
      <div className="app-container">
        <Routes>
          {/* Home page - doesn't require authentication */}
          {/* Pass isAuthenticated to Home if Home needs to know auth status */}
          <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />

          {/* Login page - redirect to dashboard if already authenticated */}
          {/* Pass the fetchUser callback to Login, so it can refresh user state after successful login */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLoginSuccess={fetchUser} />}
          />

          {/* Register page - redirect to dashboard if already authenticated */}
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
          />

          {/* --- Protected Routes --- */}

          {/* User Dashboard - requires authentication */}
          <Route
            path="/dashboard"
            // Pass currentUser to Dashboard if it needs user details
            element={isAuthenticated ? <Dashboard currentUser={currentUser} /> : <Navigate to="/login" />}
          />

          {/* Moderator Panel - requires authentication AND either staff or superuser role */}
          <Route
            path="/moderator-panel"
            // Pass currentUser to ModeratorPanel
            element={isAuthenticated && (isModerator || isAdmin) ? <ModeratorPanel currentUser={currentUser} /> : <Navigate to="/login" />}
          />

          {/* Admin Panel - requires authentication AND superuser role */}
           <Route
            path="/admin-panel"
            // Pass currentUser to AdminPanel
            element={isAuthenticated && isAdmin ? <AdminPanel currentUser={currentUser} /> : <Navigate to="/login" />}
          />

          {/* Fallback route for any unmatched paths - redirects to home */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;