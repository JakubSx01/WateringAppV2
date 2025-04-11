// Frontend/my-react-app/src/App.js
import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home'; // Pages, not components
import Login from './pages/Login'; // Pages, not components
import Register from './pages/Register'; // Pages, not components
import Dashboard from './pages/Dashboard'; // Pages, not components
import Navbar from './components/Navbar'; // Import Navbar

function App() {
  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem('token') !== null;

  return (
    <Router>
      <Navbar /> {/* Place Navbar OUTSIDE and ABOVE Routes */}
      <div className="app-container"> {/* Container for page content */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
          />
          {/* Fallback route for any unmatched paths */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;