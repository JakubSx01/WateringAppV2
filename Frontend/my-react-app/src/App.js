// Frontend/my-react-app/src/App.js
import './App.css';
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard'; // User Dashboard
// ModeratorPanel is removed, AdminPanel handles both roles now
import AdminPanel from './pages/AdminPanel'; // Admin Page (now includes mod features)
import Navbar from './components/Navbar'; // Import Navbar
import { fetchCurrentUser } from './services/api'; // Import the new API function

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const fetchUser = useCallback(async () => {
      const token = localStorage.getItem('token');
      if (token) {
          try {
              setLoadingUser(true);
              const response = await fetchCurrentUser();
              setCurrentUser(response.data);
              return response.data;
          } catch (error) {
              console.error("App.js fetchUser: Failed to fetch user details:", error.response?.data || error.message);
              if (error.response?.status === 401 || error.response?.status === 403) {
                   localStorage.removeItem('token');
                   localStorage.removeItem('refreshToken');
              }
              setCurrentUser(null);
              return null;
          } finally {
              setLoadingUser(false);
          }
      } else {
          setCurrentUser(null);
          setLoadingUser(false);
          return null;
      }
  }, []);

  useEffect(() => {
      fetchUser();
  }, [fetchUser]);

  const isAuthenticated = localStorage.getItem('token') !== null;
  const isModerator = currentUser?.is_staff || false;
  const isAdmin = currentUser?.is_superuser || false;

  if (loadingUser) {
      return (
           <div className="app-loading">
               Ładowanie użytkownika...
               <style>{`.app-loading { text-align: center; padding-top: 100px; font-size: 1.2rem; color: #555; }`}</style>
           </div>
      );
  }

  return (
    <Router>
      <Navbar currentUser={currentUser} isAdmin={isAdmin} isModerator={isModerator} />
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLoginSuccess={fetchUser} />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard currentUser={currentUser} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin-panel"
            element={isAuthenticated && (isModerator || isAdmin) ? <AdminPanel currentUser={currentUser} /> : <Navigate to="/login" />}
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;